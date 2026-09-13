# $MAIL — Security Notes (V1)

## Authentication

- Sign-in is a **message signature only**. The server never builds,
  requests, or submits a transaction. No token approvals exist anywhere.
- Challenges are random 24-byte nonces, stored server-side, expire after
  10 minutes, and are consumed atomically on first successful verification.
- Signature verification: ed25519 via tweetnacl against the bs58-decoded
  wallet public key. The signed message embeds the wallet and nonce, so a
  signature cannot be replayed for a different wallet or challenge.
- Sessions are HMAC-SHA256-signed cookies keyed by `SESSION_SECRET`
  (workspace secret, never in code). Cookies are `HttpOnly`, `SameSite=Lax`,
  `Secure` in production, 30-day expiry. Verification uses
  constant-time comparison.

## Authorization

- Every mailbox/message/preferences/block/report route requires a valid
  session; reads are scoped to the session wallet.
- Message detail/thread require the viewer to be sender or recipient.
- Open / accept / junk / share / report require the viewer to be the
  **recipient**.
- Share card data never includes the message body, regardless of caller.

## Abuse controls

- Blocking refuses future mail with 403 RETURN TO SENDER, junks existing
  mail, and revokes sender approval.
- Unknown senders default to Requests, keeping strangers out of the
  Mailbox until accepted.
- Reports are stored with reporter, reported wallet, message id, reason.
- Challenge, verify, send, report, block, and unblock paths are protected by
  layered fixed-window rate limits using IP and/or wallet identity.
- The in-memory limiter has a hard entry ceiling and fails closed rather than
  growing without bound under identity churn.

## Link safety

- URLs are detected server-side at send time; destination domains are
  stored and surfaced. The client must interpose a warning before opening
  any link from mail. Links are never auto-fetched or previewed
  server-side (no SSRF surface).

## Input validation

- Wallet addresses are validated server-side as base58-decoded 32-byte
  keys — on send, block, and challenge creation.
- All request bodies/params/queries are validated with generated Zod
  schemas; responses are parsed before send.
- Message bodies are stored as plain text and must be rendered as text
  (never HTML) by the client.
- Request bodies are capped at 32kb and message bodies remain capped at
  4,000 characters.

## Known V1 limitations (documented, not hidden)

- Rate limits are per-instance and in-memory. They reset on restart and are
  not shared across multiple processes; move this control to shared storage
  or the deployment edge before horizontal scaling.
- CORS remains permissive at the application layer and should be locked to
  the production web origin in deployment configuration.
- `sender_verified` is uniformly true because sending requires sign-in;
  the flag exists so future unsigned ingestion paths stay honest.
- Session revocation is expiry-based; there is no server-side session store
  to invalidate individual sessions early.
- Reports are recorded and rate-limited, but V1 has no automated moderation
  action on top of them.
