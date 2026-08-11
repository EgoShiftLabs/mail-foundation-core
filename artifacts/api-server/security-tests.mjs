/**
 * $MAIL V1 — Adversarial security test harness.
 *
 * Re-runnable integration tests that exercise attack scenarios against a
 * running API server. Uses disposable, zero-asset ed25519 keypairs only —
 * never a real wallet, key, or seed phrase.
 *
 * Usage:  node security-tests.mjs
 * Target: https://$REPLIT_DEV_DOMAIN/api  (override with API_BASE env)
 *
 * NOTE: the server rate-limits per IP. Rate-limit scenarios run LAST so
 * they don't starve the functional checks; run against a freshly restarted
 * server for clean counters.
 */
import nacl from "tweetnacl";
import bs58 from "bs58";

const BASE =
  process.env.API_BASE ??
  `https://${process.env.REPLIT_DEV_DOMAIN}/api`;

let pass = 0;
let fail = 0;
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function newWallet(label) {
  const kp = nacl.sign.keyPair();
  return {
    label,
    wallet: bs58.encode(Buffer.from(kp.publicKey)),
    secretKey: kp.secretKey,
  };
}

function signMessage(message, secretKey) {
  const sig = nacl.sign.detached(new TextEncoder().encode(message), secretKey);
  return bs58.encode(Buffer.from(sig));
}

async function api(path, { method = "GET", body, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (cookie) headers["cookie"] = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { __raw: text };
  }
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const sessionCookie = setCookies
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("mail_session="));
  return { status: res.status, json, sessionCookie, text };
}

/** Full sign-in; returns the session cookie or throws. */
async function signIn(id) {
  const ch = await api("/auth/challenge", {
    method: "POST",
    body: { wallet: id.wallet },
  });
  if (ch.status !== 200) throw new Error(`challenge failed ${ch.status}`);
  const signature = signMessage(ch.json.message, id.secretKey);
  const v = await api("/auth/verify", {
    method: "POST",
    body: { wallet: id.wallet, nonce: ch.json.nonce, signature },
  });
  if (v.status !== 200 || !v.sessionCookie)
    throw new Error(`verify failed ${v.status}`);
  return { cookie: v.sessionCookie, challenge: ch.json };
}

async function run() {
  console.log(`\nTarget: ${BASE}\n`);

  const A = newWallet("A/sender");
  const B = newWallet("B/recipient");
  const C = newWallet("C/unknown");
  const D = newWallet("D/blocked");
  const ATT = newWallet("Attacker");

  // ---- AUTHENTICATION ----
  const aSess = await signIn(A);
  check("Auth happy path (valid signature)", !!aSess.cookie);

  // Auth message must promise no funds move / no transaction.
  const chMsg = aSess.challenge.message;
  check(
    "Challenge states no SOL / no transaction",
    chMsg.includes("No SOL will move") &&
      chMsg.includes("No transaction will be submitted"),
  );
  check(
    "Challenge is bound to the requesting wallet",
    chMsg.includes(A.wallet),
  );

  // Replay / single-use: reuse a consumed nonce.
  const replay = await api("/auth/verify", {
    method: "POST",
    body: {
      wallet: A.wallet,
      nonce: aSess.challenge.nonce,
      signature: signMessage(aSess.challenge.message, A.secretKey),
    },
  });
  check("Replay of a used challenge is rejected", replay.status === 401);

  // Signature for wallet A cannot authenticate as B.
  const chB = await api("/auth/challenge", {
    method: "POST",
    body: { wallet: B.wallet },
  });
  const forged = await api("/auth/verify", {
    method: "POST",
    body: {
      wallet: B.wallet,
      nonce: chB.json.nonce,
      // Attacker signs B's challenge with the attacker key.
      signature: signMessage(chB.json.message, ATT.secretKey),
    },
  });
  check("Wrong-key signature cannot authenticate a wallet", forged.status === 401);

  // Cross-wallet nonce: A's nonce presented for B.
  const chA2 = await api("/auth/challenge", {
    method: "POST",
    body: { wallet: A.wallet },
  });
  const crossNonce = await api("/auth/verify", {
    method: "POST",
    body: {
      wallet: B.wallet,
      nonce: chA2.json.nonce,
      signature: signMessage(chA2.json.message, B.secretKey),
    },
  });
  check(
    "Challenge issued for A cannot be used to auth B",
    crossNonce.status === 401,
  );

  // Malformed signature fails safely (no 500).
  const garbage = await api("/auth/verify", {
    method: "POST",
    body: { wallet: A.wallet, nonce: "nope", signature: "!!!not-base58!!!" },
  });
  check("Malformed signature fails safely (401, no 500)", garbage.status === 401);

  // Invalid wallet format on challenge.
  const badWallet = await api("/auth/challenge", {
    method: "POST",
    body: { wallet: "not-a-wallet" },
  });
  check("Invalid wallet format rejected at challenge", badWallet.status === 400);

  // Concurrent duplicate verify: a single challenge must yield at most one
  // session even when two valid verifies race (atomic single-use).
  const raceId = newWallet("race");
  const raceCh = await api("/auth/challenge", {
    method: "POST",
    body: { wallet: raceId.wallet },
  });
  const raceSig = signMessage(raceCh.json.message, raceId.secretKey);
  const raceBody = {
    method: "POST",
    body: { wallet: raceId.wallet, nonce: raceCh.json.nonce, signature: raceSig },
  };
  const raced = await Promise.all([
    api("/auth/verify", raceBody),
    api("/auth/verify", raceBody),
  ]);
  const raceWinners = raced.filter((r) => r.status === 200 && r.sessionCookie);
  check(
    "Concurrent duplicate verify establishes exactly one session",
    raceWinners.length === 1,
    `200s=${raceWinners.length}`,
  );

  // ---- UNAUTHENTICATED ACCESS ----
  const protectedGets = [
    "/mailbox/summary",
    "/messages?folder=mailbox",
    "/preferences",
    "/blocked",
  ];
  let allProtected = true;
  for (const p of protectedGets) {
    const r = await api(p);
    if (r.status !== 401) allProtected = false;
  }
  const unauthSend = await api("/messages", {
    method: "POST",
    body: { recipientWallet: B.wallet, body: "hi" },
  });
  check(
    "Protected endpoints require auth (401 unauthenticated)",
    allProtected && unauthSend.status === 401,
  );

  // ---- SEND + CROSS-WALLET PRIVACY ----
  const bSess = await signIn(B);
  // A -> B (A has no prior relationship; lands in B's requests by default)
  const sent = await api("/messages", {
    method: "POST",
    cookie: aSess.cookie,
    body: { recipientWallet: B.wallet, body: "Hello from A" },
  });
  check("Authenticated send succeeds", sent.status === 201);
  const msgId = sent.json?.id;

  // Attacker cannot read A->B message by id.
  const attSess = await signIn(ATT);
  const steal = await api(`/messages/${msgId}`, { cookie: attSess.cookie });
  check("Third party cannot read another wallet's message", steal.status === 404);

  // Attacker cannot open/accept/junk/share B's message.
  const ops = await Promise.all([
    api(`/messages/${msgId}/open`, { method: "POST", cookie: attSess.cookie }),
    api(`/messages/${msgId}/accept`, { method: "POST", cookie: attSess.cookie }),
    api(`/messages/${msgId}/junk`, { method: "POST", cookie: attSess.cookie }),
    api(`/messages/${msgId}/share`, { cookie: attSess.cookie }),
  ]);
  check(
    "Third party cannot mutate/share another wallet's message",
    ops.every((r) => r.status === 404),
  );

  // Sender (A) cannot forge OPENED on their own outgoing mail.
  const senderOpen = await api(`/messages/${msgId}/open`, {
    method: "POST",
    cookie: aSess.cookie,
  });
  check(
    "Sender cannot mark their outgoing mail opened (state integrity)",
    senderOpen.status === 404,
  );

  // Delivery state truthful: B lists requests -> delivered; B opens -> opened.
  await api("/messages?folder=requests", { cookie: bSess.cookie });
  const bView = await api(`/messages/${msgId}`, { cookie: bSess.cookie });
  const openedByB = await api(`/messages/${msgId}/open`, {
    method: "POST",
    cookie: bSess.cookie,
  });
  check(
    "Delivery/opened states advance only via the real recipient",
    bView.status === 200 && openedByB.json?.status === "opened",
  );

  // Share card never leaks the body.
  const share = await api(`/messages/${msgId}/share`, { cookie: bSess.cookie });
  check(
    "Share card keeps body private by default",
    share.status === 200 && share.json?.body === null && share.json?.revealed === false,
  );

  // ---- MALFORMED UUID (must 404/400, never 500) ----
  const badId = "abc-not-uuid";
  const uuidProbes = await Promise.all([
    api(`/messages/${badId}`, { cookie: bSess.cookie }),
    api(`/messages/${badId}/thread`, { cookie: bSess.cookie }),
    api(`/messages/${badId}/open`, { method: "POST", cookie: bSess.cookie }),
    api(`/messages/${badId}/accept`, { method: "POST", cookie: bSess.cookie }),
    api(`/messages/${badId}/junk`, { method: "POST", cookie: bSess.cookie }),
    api(`/messages/${badId}/share`, { cookie: bSess.cookie }),
  ]);
  check(
    "Malformed message id fails as 404 (no DB 500)",
    uuidProbes.every((r) => r.status === 404),
  );
  const badReport = await api("/reports", {
    method: "POST",
    cookie: bSess.cookie,
    body: { messageId: badId, reason: "spam" },
  });
  check("Report with malformed messageId → 404 (no DB 500)", badReport.status === 404);
  const badReply = await api("/messages", {
    method: "POST",
    cookie: aSess.cookie,
    body: { recipientWallet: B.wallet, body: "reply", replyToMessageId: badId },
  });
  check("Send with malformed replyToMessageId → 400 (no DB 500)", badReply.status === 400);

  // ---- BLOCKING ----
  const dSess = await signIn(D);
  const blockRes = await api("/blocked", {
    method: "POST",
    cookie: bSess.cookie,
    body: { wallet: D.wallet },
  });
  const dToB = await api("/messages", {
    method: "POST",
    cookie: dSess.cookie,
    body: { recipientWallet: B.wallet, body: "let me in" },
  });
  check(
    "Blocked sender is refused (RETURN TO SENDER 403)",
    blockRes.status === 201 && dToB.status === 403,
  );
  // D cannot alter B's block list (unblock only touches own list).
  const dUnblock = await api(`/blocked/${D.wallet}`, {
    method: "DELETE",
    cookie: dSess.cookie,
  });
  const stillBlocked = await api("/messages", {
    method: "POST",
    cookie: dSess.cookie,
    body: { recipientWallet: B.wallet, body: "still me" },
  });
  check(
    "A wallet cannot modify another wallet's block list",
    dUnblock.status === 200 && stillBlocked.status === 403,
  );

  // ---- REPORT ABUSE ----
  // C sends to B, then attacker tries to report a message not addressed to it.
  const cSess = await signIn(C);
  const cMsg = await api("/messages", {
    method: "POST",
    cookie: cSess.cookie,
    body: { recipientWallet: B.wallet, body: "from C" },
  });
  const forgeReport = await api("/reports", {
    method: "POST",
    cookie: attSess.cookie,
    body: { messageId: cMsg.json.id, reason: "spam" },
  });
  check(
    "Cannot report a message not addressed to you",
    forgeReport.status === 404,
  );

  // ---- INPUT SAFETY: XSS / SQLi round-trip ----
  const xss = '<script>alert(1)</script><img src=x onerror=alert(1)>';
  const xssSend = await api("/messages", {
    method: "POST",
    cookie: aSess.cookie,
    body: { recipientWallet: B.wallet, body: xss },
  });
  const xssView = await api(`/messages/${xssSend.json.id}`, { cookie: aSess.cookie });
  check(
    "XSS payload stored/returned verbatim as data (no server transform)",
    xssSend.status === 201 && xssView.json?.body === xss,
  );
  const sqli = "Robert'); DROP TABLE messages;--";
  const sqliSend = await api("/messages", {
    method: "POST",
    cookie: aSess.cookie,
    body: { recipientWallet: B.wallet, body: sqli },
  });
  // If injection worked the table would be gone; a follow-up read proves it lives.
  const afterSqli = await api("/messages?folder=sent", { cookie: aSess.cookie });
  check(
    "SQL-injection payload is inert (parameterized)",
    sqliSend.status === 201 && afterSqli.status === 200,
  );
  const sqliWallet = await api("/messages", {
    method: "POST",
    cookie: aSess.cookie,
    body: { recipientWallet: "'; DROP TABLE messages;--", body: "x" },
  });
  check("SQLi in wallet field rejected as invalid address", sqliWallet.status === 400);

  // ---- PAYLOAD LIMITS ----
  const tooLong = await api("/messages", {
    method: "POST",
    cookie: aSess.cookie,
    body: { recipientWallet: B.wallet, body: "x".repeat(4001) },
  });
  check("Over-limit body (>4000) rejected", tooLong.status === 400);
  const huge = await api("/messages", {
    method: "POST",
    cookie: aSess.cookie,
    body: { recipientWallet: B.wallet, body: "x".repeat(50000) },
  });
  check("Oversized JSON payload refused (413/400)", huge.status === 413 || huge.status === 400);
  const emptyBody = await api("/messages", {
    method: "POST",
    cookie: aSess.cookie,
    body: { recipientWallet: B.wallet, body: "   " },
  });
  check("Whitespace-only body rejected", emptyBody.status === 400);

  // ---- SESSION TAMPERING ----
  const tampered = aSess.cookie.slice(0, -2) + (aSess.cookie.endsWith("aa") ? "bb" : "aa");
  const tamperRes = await api("/mailbox/summary", { cookie: tampered });
  check("Tampered session cookie is rejected", tamperRes.status === 401);
  const forgedPayload =
    "mail_session=" +
    Buffer.from(JSON.stringify({ w: B.wallet, exp: Date.now() + 1e9 })).toString("base64url") +
    ".deadbeef";
  const forgedRes = await api("/mailbox/summary", { cookie: forgedPayload });
  check("Forged unsigned session is rejected", forgedRes.status === 401);

  // ---- ERROR DISCLOSURE ----
  const malformedJson = await fetch(`${BASE}/auth/challenge`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{ not json",
  });
  const mjText = await malformedJson.text();
  check(
    "Malformed JSON → clean 4xx, no stack trace leaked",
    malformedJson.status >= 400 &&
      malformedJson.status < 500 &&
      !/at\s+\w+.*\(.*:\d+:\d+\)/.test(mjText) &&
      !mjText.includes("SyntaxError"),
  );

  // ---- ENUMERATION ----
  const known = await api("/auth/challenge", {
    method: "POST",
    body: { wallet: A.wallet },
  });
  const unknown = await api("/auth/challenge", {
    method: "POST",
    body: { wallet: newWallet("fresh").wallet },
  });
  check(
    "Challenge response identical for known vs never-seen wallet",
    known.status === unknown.status &&
      Object.keys(known.json).sort().join() ===
        Object.keys(unknown.json).sort().join(),
  );

  // ---- RATE LIMITING (run last: trips per-IP counters) ----
  // Send flood on a fresh wallet: limit is 20/min per wallet.
  const flood = newWallet("flooder");
  const fSess = await signIn(flood);
  let sendLimited = false;
  for (let i = 0; i < 40; i++) {
    const r = await api("/messages", {
      method: "POST",
      cookie: fSess.cookie,
      body: { recipientWallet: newWallet("t").wallet, body: `spam ${i}` },
    });
    if (r.status === 429) {
      sendLimited = true;
      break;
    }
  }
  check("Send endpoint rate-limits floods (429)", sendLimited);

  // Report flood: limit is 10/min per wallet. Report the same message repeatedly.
  const rMsg = await api("/messages", {
    method: "POST",
    cookie: cSess.cookie,
    body: { recipientWallet: B.wallet, body: "report target" },
  });
  let reportLimited = false;
  for (let i = 0; i < 20; i++) {
    const r = await api("/reports", {
      method: "POST",
      cookie: bSess.cookie,
      body: { messageId: rMsg.json.id, reason: `dup ${i}` },
    });
    if (r.status === 429) {
      reportLimited = true;
      break;
    }
  }
  check("Report endpoint rate-limits spam (429)", reportLimited);

  // Unblock (DELETE) flood: block churn limit is 30/min per wallet.
  const churn = newWallet("churn");
  const churnSess = await signIn(churn);
  let unblockLimited = false;
  for (let i = 0; i < 45; i++) {
    const r = await api(`/blocked/${newWallet("x").wallet}`, {
      method: "DELETE",
      cookie: churnSess.cookie,
    });
    if (r.status === 429) {
      unblockLimited = true;
      break;
    }
  }
  check("Unblock endpoint rate-limits churn (429)", unblockLimited);

  // Challenge flood from one IP: limit is 30/min.
  let challengeLimited = false;
  for (let i = 0; i < 50; i++) {
    const r = await api("/auth/challenge", {
      method: "POST",
      body: { wallet: newWallet("c").wallet },
    });
    if (r.status === 429) {
      challengeLimited = true;
      break;
    }
  }
  check("Challenge issuance rate-limits floods (429)", challengeLimited);

  console.log(`\n${pass} passed, ${fail} failed, ${pass + fail} total\n`);
  if (fail > 0) process.exitCode = 1;
}

run().catch((e) => {
  console.error("Harness error:", e);
  process.exitCode = 1;
});
