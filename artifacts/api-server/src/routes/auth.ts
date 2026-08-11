import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { and, eq, lt } from "drizzle-orm";
import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  db,
  authChallengesTable,
  mailboxPreferencesTable,
  messagesTable,
} from "@workspace/db";
import {
  CreateAuthChallengeBody,
  CreateAuthChallengeResponse,
  VerifyAuthSignatureBody,
  GetSessionResponse,
} from "@workspace/api-zod";
import { isValidWalletAddress, POSTMASTER_WALLET } from "../lib/wallet";
import {
  getSessionWallet,
  setSessionCookie,
  clearSessionCookie,
} from "../lib/session";
import { limiters } from "../lib/rateLimit";

const CHALLENGE_TTL_MS = 1000 * 60 * 10; // 10 minutes

const router: IRouter = Router();

router.post("/auth/challenge", limiters.challenge, async (req, res): Promise<void> => {
  const parsed = CreateAuthChallengeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "THAT ADDRESS DOESN'T LOOK RIGHT." });
    return;
  }
  const { wallet } = parsed.data;
  if (!isValidWalletAddress(wallet)) {
    res.status(400).json({ message: "THAT ADDRESS DOESN'T LOOK RIGHT." });
    return;
  }

  const nonce = crypto.randomBytes(24).toString("base64url");
  const message = [
    "$MAIL sign-in",
    "",
    "This proves this mailbox belongs to you.",
    "No SOL will move. No transaction will be submitted.",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Issued: ${new Date().toISOString()}`,
  ].join("\n");

  // Opportunistic cleanup of expired challenges
  await db
    .delete(authChallengesTable)
    .where(lt(authChallengesTable.expiresAt, new Date()));

  await db.insert(authChallengesTable).values({
    nonce,
    wallet,
    message,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });

  res.json(CreateAuthChallengeResponse.parse({ wallet, nonce, message }));
});

router.post("/auth/verify", limiters.verify, async (req, res): Promise<void> => {
  const parsed = VerifyAuthSignatureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ message: "Sign-in didn't go through. Try again." });
    return;
  }
  const { wallet, nonce, signature } = parsed.data;

  const [challenge] = await db
    .select()
    .from(authChallengesTable)
    .where(
      and(
        eq(authChallengesTable.nonce, nonce),
        eq(authChallengesTable.wallet, wallet),
      ),
    );

  if (!challenge || challenge.expiresAt < new Date()) {
    res
      .status(401)
      .json({ message: "That sign-in request expired. Try again." });
    return;
  }

  let verified = false;
  try {
    verified = nacl.sign.detached.verify(
      new TextEncoder().encode(challenge.message),
      bs58.decode(signature),
      bs58.decode(wallet),
    );
  } catch {
    verified = false;
  }

  if (!verified) {
    req.log.warn({ wallet }, "Signature verification failed");
    res.status(401).json({
      message:
        "We couldn't verify that signature. No funds were at risk — just try signing in again.",
    });
    return;
  }

  // Challenge is single-use. Consume it atomically: the DELETE ... RETURNING
  // is the gate — only the request that actually removes the row may proceed.
  // Two concurrent valid verifies both pass signature checking above, but only
  // one can delete the row; the loser gets zero rows back and is rejected,
  // so exactly one session is ever established per challenge.
  const consumed = await db
    .delete(authChallengesTable)
    .where(
      and(
        eq(authChallengesTable.nonce, nonce),
        eq(authChallengesTable.wallet, wallet),
      ),
    )
    .returning({ nonce: authChallengesTable.nonce });

  if (consumed.length === 0) {
    res
      .status(401)
      .json({ message: "That sign-in request expired. Try again." });
    return;
  }

  // Ensure mailbox preferences exist
  await db
    .insert(mailboxPreferencesTable)
    .values({ wallet })
    .onConflictDoNothing();

  // First visit ever? The Postmaster leaves a welcome delivery so the
  // first CHECK MY MAIL actually has mail in it.
  const [existing] = await db
    .select({ id: messagesTable.id })
    .from(messagesTable)
    .where(eq(messagesTable.recipientWallet, wallet))
    .limit(1);

  if (!existing) {
    const welcomeId = crypto.randomUUID();
    await db.insert(messagesTable).values({
      id: welcomeId,
      threadId: welcomeId,
      senderWallet: POSTMASTER_WALLET,
      recipientWallet: wallet,
      body: [
        "Welcome to $MAIL.",
        "",
        "This mailbox belongs to your wallet address. Anyone on Solana can send you mail here — and you can write to any wallet, even one that has never opened $MAIL.",
        "",
        "Mail from people you know lands in your Mailbox. Mail from strangers waits in Requests until you accept it. Junk goes where junk belongs.",
        "",
        "Go send your first letter.",
        "",
        "— The Postmaster",
      ].join("\n"),
      folder: "mailbox",
      senderVerified: true,
      containsUrl: false,
      urlDomains: [],
    });
  }

  setSessionCookie(res, wallet);
  res.json(GetSessionResponse.parse({ wallet, authenticated: true }));
});

router.get("/auth/session", (req, res): void => {
  const wallet = getSessionWallet(req);
  res.json(
    GetSessionResponse.parse({ wallet, authenticated: wallet !== null }),
  );
});

router.post("/auth/logout", (_req, res): void => {
  clearSessionCookie(res);
  res.json(GetSessionResponse.parse({ wallet: null, authenticated: false }));
});

export default router;
