# $MAIL V1 — SECURITY AUDIT (PASS #1)

Adversarial security review of the frozen V1 proof-of-concept.
Baseline: git tag `v1-poc-frozen`. Date: 2026-08-11.
Change class of all corrections below: **FIX** (per `CHANGE_CONTROL.md`).

---

## 1. Scope

The public HTTP surface of the $MAIL API (`artifacts/api-server`), its
authentication model, session handling, data-access authorization, input
validation, content handling, and abuse resistance — reviewed as though the
app were about to become publicly discoverable and receive hostile traffic.

Explicitly **in scope**: signature auth / replay, cross-wallet mail privacy,
delivery-state integrity, blocking, reporting, input limits, injection, XSS,
enumeration, rate limiting, error/info disclosure, cookies/sessions.

**Out of scope** (deferred, documented): token/Packages/Mail-Flag features (not
built), browser-wallet client internals (documented separately, see §8),
horizontal-scale infrastructure.

The signature-only wallet authentication model is part of the frozen product
spec and was **not** replaced — only hardened around the edges.

## 2. Methodology

- Manual source review of every route, the session/cookie layer, wallet and
  UUID validation, link detection, and the DTO/authorization boundary.
- A re-runnable adversarial integration harness (`security-tests.mjs`) that
  drives the live API with **disposable, zero-asset ed25519 keypairs** —
  Wallet A (sender), B (recipient), C (unknown), D (blocked), and an Attacker
  wallet used for replay, impersonation, cross-wallet access, forged reports,
  enumeration, and flood attempts. No real wallet, key, or seed phrase was
  used or requested.
- 34 attack scenarios executed against a running server; results in
  `SECURITY_TEST_MATRIX_V1.md` (all PASS).

## 3. Attack surfaces reviewed

| Surface | Result |
|---|---|
| Challenge issuance / nonce quality / binding / expiry | Sound; hardened with rate limits |
| Signature verification (server-side, tweetnacl) | Sound; malformed input fails safely |
| Replay / challenge reuse | Sound (single-use + wallet binding) |
| Session cookie (HMAC, httpOnly, sameSite, timing-safe) | Sound; tamper/forgery rejected |
| Cross-wallet mail read/mutate/share | Sound (all queries scoped to session wallet) |
| Delivery/opened state transitions | Sound (only real recipient advances state) |
| Blocking / unblock authorization | Sound (owner-scoped) |
| Reporting authorization + abuse | Ownership-checked; hardened with rate limits |
| Input validation (wallet, body, ids, reason, folder, prefs) | Hardened (UUID validation added) |
| SQL injection | Not exploitable (Drizzle parameterized queries) |
| Stored/reflected XSS | Not exploitable (React text rendering; no server HTML) |
| Payload size / resource exhaustion | Hardened (body cap + JSON size cap + rate limits) |
| Wallet enumeration | Acceptable (auth-scoped; challenge response uniform) |
| Error / info disclosure | Hardened (central error handler, no stack traces) |
| CORS / headers | Acceptable; hardening headers added; CORS noted |

## 4. Findings & remediation

### HIGH-1 — No rate limiting on any endpoint
**Exploitability:** High. Before the fix, a single host or wallet could flood
`/auth/challenge` (each call writes a DB row), spam `/messages` to arbitrary
wallets (filling Requests/Junk), and spam `/reports` without bound.
**Remediation (implemented):** Added a dependency-free, in-memory, fixed-window
rate limiter (`src/lib/rateLimit.ts`) with layered IP + wallet rules on
challenge, verify, send, report, and block. See §7 for the model. Verified:
send, report, and challenge floods now return `429` at their thresholds while
normal traffic is unaffected.

### HIGH-2 — Challenge single-use was not atomic (auth replay race)
**Exploitability:** Medium-High. Verify used SELECT → verify signature →
unconditional DELETE. Two simultaneous valid verifies for one challenge could
both read the still-live nonce, both pass signature checking, and both establish
a session before either delete completed — a concurrency-only replay that the
sequential replay test could not catch. **Remediation (implemented):** Made the
DELETE the atomic consumption gate — `DELETE ... WHERE nonce AND wallet
RETURNING` — and only the request that actually removes the row proceeds to set
a session; the loser gets `401`. Verified with a concurrent duplicate-verify
test asserting exactly one `200`/session.

### MEDIUM-1 — Malformed identifiers caused DB errors / 500s
**Exploitability:** Medium. Message/report identifiers map to Postgres `uuid`
columns. A non-UUID id (e.g. `/messages/abc-not-uuid`, a report `messageId`, or
a `replyToMessageId`) reached the query layer and triggered "invalid input
syntax for type uuid" — a 500 that both fails unsafely and leaks a DB error
class. **Remediation (implemented):** Added `isUuid()` (`src/lib/ids.ts`) and
validate every id-bearing param/field before any query; malformed ids now
return a clean `404` (or `400` for a bad `replyToMessageId`). Verified across
all six message id routes, reports, and send.

### MEDIUM-2 — Default framework error handler could leak internals
**Exploitability:** Medium. Express's default error handler returns error text
(and, outside production, stack traces) for any unhandled throw.
**Remediation (implemented):** Added a central error handler in `app.ts` that
logs full detail server-side (pino) and returns a generic message; respects
`err.status`/`statusCode` so malformed-JSON and oversized-body errors surface as
clean `4xx`. Verified: malformed JSON returns a `4xx` with no stack trace and no
`SyntaxError` text.

### LOW-1 — Unbounded request body size
**Exploitability:** Low. `express.json()` default (100kb) is larger than any
legitimate $MAIL payload (max message body 4000 chars).
**Remediation (implemented):** Set an explicit `32kb` JSON/urlencoded limit;
oversized payloads now return `413`. The 4000-char body cap remains enforced by
Zod (`400`).

### MEDIUM-3 — Rate limiter could itself be a resource-exhaustion vector
**Exploitability:** Medium. The in-memory limiter created per-IP/per-wallet
buckets *before* the global admission check, and its store had no hard ceiling,
so a flood of unique IPs/wallets could grow the map until the next sweep. The
unblock (`DELETE /blocked/:wallet`) route also had no limiter despite the block
protection intending to cover churn. **Remediation (implemented):** (a) global
challenge admission is now checked first, so a distributed flood trips before
any per-identity key is created; (b) the store enforces a hard `MAX_ENTRIES`
ceiling — when full it sweeps expired entries and then fails closed (`429`)
rather than growing; (c) the block limiter now covers unblock. Verified: unblock
churn returns `429`.

### LOW-2 — Missing hardening response headers
**Remediation (implemented):** Added `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer` to all API
responses.

### INFORMATIONAL-1 — Permissive CORS (`Access-Control-Allow-Origin: *`)
**Assessment:** Not currently exploitable. The web client is same-origin; the
session cookie is `httpOnly` + `sameSite=lax`, and the CORS config does not
enable credentials, so browsers block credentialed cross-origin reads and
`sameSite=lax` blocks cross-site credentialed state-changing POSTs (CSRF).
**Not changed** to avoid breaking the working same-origin setup and because the
production origin is not known at code time. **Recommendation:** lock the
allowed origin to the deployed web origin at deploy time.

### INFORMATIONAL-2 — `chart.tsx` uses `dangerouslySetInnerHTML`
**Assessment:** Not a vulnerability. It is an unused shadcn chart component that
injects a `<style>` block from static theme config, never message content. No
mail body is ever rendered as HTML. No action.

### INFORMATIONAL-3 — Reports are stored but not acted upon
**Assessment:** Matches the spec (automated moderation is a future layer).
Reports now carry reporter, reported wallet, message id, reason, timestamp —
sufficient for future tooling — and are rate-limited against spam. No action
beyond the rate limit.

## 5. Vulnerabilities by severity

- **CRITICAL:** none
- **HIGH:** 2 (HIGH-1 rate limiting, HIGH-2 auth replay race — both fixed)
- **MEDIUM:** 3 (MEDIUM-1 UUID, MEDIUM-2 error handler, MEDIUM-3 limiter exhaustion — all fixed)
- **LOW:** 2 (LOW-1, LOW-2, both fixed)
- **INFORMATIONAL:** 3 (documented; no code change required)

HIGH-2 and MEDIUM-3 were surfaced by an internal architecture-review round after
the first fixes and remediated in the same pass.

## 6. Authentication verification results

| Requirement | Result |
|---|---|
| Nonce cryptographically unpredictable | PASS — `crypto.randomBytes(24)`, base64url |
| Challenges expire | PASS — 10-min `expiresAt`, checked on verify (code-verified) |
| Challenges cannot be reused | PASS — deleted on success; replay → 401 |
| Challenge bound to intended wallet | PASS — looked up by `(nonce, wallet)`; message embeds wallet |
| Signature verified server-side | PASS — tweetnacl on the server |
| Malformed signatures fail safely | PASS — try/catch → 401, no 500 |
| Signature for A cannot authenticate B | PASS — wrong-key and cross-nonce → 401 |
| Replay attacks fail | PASS |
| Auth cannot move SOL / submit a transaction | PASS — endpoints only issue a nonce and set a cookie; message text states "No SOL will move. No transaction will be submitted." |

## 7. Rate-limiting model implemented

In-memory fixed-window counters, layered so neither a single wallet nor a
single host can flood. Client IP is trustworthy: the deployment edge proxy strips
client-supplied `X-Forwarded-For` and appends the real chain, and the server
sets `trust proxy`, so `req.ip` cannot be spoofed.

| Endpoint | Limits |
|---|---|
| `POST /auth/challenge` | 30/min per IP · 10/min per target wallet · 600/min global |
| `POST /auth/verify` | 60/min per IP · 20/min per target wallet |
| `POST /messages` (send) | 60/min per IP · 20/min + 200/hour per wallet |
| `POST /reports` | 60/min per IP · 10/min + 60/hour per wallet |
| `POST /blocked` | 60/min per IP · 30/min per wallet |

Limits are intentionally generous for humans and return `429` with a
`Retry-After` header. Paid access was **not** introduced — $MAIL remains free.

## 8. Wallet-enumeration protections

The API does not expose whether an arbitrary wallet has ever used $MAIL, has
mail, or has unread mail: mailbox summary, folder listings, and message reads
are all scoped to the authenticated session wallet and cannot name a third
party. `/auth/challenge` returns an identical response shape and status for a
known vs. a never-seen wallet (verified), so it reveals nothing. Combined with
challenge rate limiting, mass probing is bounded. No enumeration oracle found.

## 9. Browser-wallet behavior (documented separately, not secret-dependent)

Testing the actual Phantom/Solflare browser extensions requires a real
extension and human interaction and is **out of automated scope**. The security
guarantees do not depend on client behavior: the server independently verifies
every signature and authorizes every request from the signed session. Client
expectations to validate manually in a browser: the wallet shows a **message
signature** request (never a transaction), the signed text matches the server
challenge verbatim, and no `signAndSendTransaction` path exists.

## 10. Whether remediation was implemented

All HIGH/MEDIUM/LOW findings were fixed in this pass (all **FIX**-class, no
product behavior changed). The three INFORMATIONAL items were assessed and
intentionally left as-is with recommendations.

## 11. Remaining risks

1. **Rate limits are per-instance and in-memory** — they reset on restart and
   are not shared across processes. Sufficient for single-instance V1; before
   horizontal scaling, move to a shared store (e.g. Redis) or the edge.
2. **No sustained cross-window quota** beyond the hourly send/report caps (no
   per-day ledger). Acceptable for V1; revisit with real traffic.
3. **CORS is permissive** (INFORMATIONAL-1) — lock the origin at deploy.
4. **Reports have no automated action** — by design; a moderation layer is
   future work.
5. **Challenge expiry is verified by code inspection**, not by a live
   time-elapsed test (would require a 10-minute wait); single-use and wallet
   binding are dynamically tested.

## 12. Compliance & change control

All changes are security **FIX**es consistent with
`MAIL_V1_MASTER_SPECIFICATION.md`. No product features, token functionality,
`.sol` addressing, Porch, branding, or UX changes were introduced. No
authentication model was replaced. **No architectural change requires
approval** — none was necessary.
