# V1 SPEC COMPLIANCE REPORT

Current implementation reviewed against `MAIL_V1_MASTER_SPECIFICATION.md`.
Baseline: git tag `v1-poc-frozen`. Date: 2026-08-11.

Categories: **COMPLIANT** / **MINOR DIFFERENCE** / **CONFLICT**

| Spec area | Status | Notes |
|---|---|---|
| Product identity & positioning | COMPLIANT | Wallet = mailing address; landing leads with the canonical line. No usernames/emails/identities anywhere. |
| Utility-first / no token gate | COMPLIANT | No token, no balance checks, no gating of receive/read/send/reply. |
| Authentication | COMPLIANT | Challenge message includes both "No SOL will move." and "No transaction will be submitted." Single-use nonce bound to wallet, 10-minute expiry, ed25519 verification, signed HMAC session cookie. Seed phrases / private keys are never requested. |
| Addressability | COMPLIANT | Any valid base58 32-byte Solana address is accepted; recipient needs no account, prior visit, or online presence. Mail waits until the recipient first authenticates. |
| Delivery states (truthful) | COMPLIANT | ADDRESSED at accept; DELIVERED only when the authenticated recipient's client lists the folder; OPENED only via the authenticated open action. No overclaiming. |
| Postal system (5 folders) | COMPLIANT | Mailbox / Requests / Junk / Sent functional; Porch is a reachable but explicitly closed "COMING LATER" state with no functionality — matches the freeze boundary. |
| Unknown senders | COMPLIANT | Default routes to Requests; recipient preference supports `requests` / `mailbox` / `junk`; blocklist overrides everything (403 RETURN TO SENDER). Recipient control wins. |
| Conversations | COMPLIANT | Threaded replies exist; presentation stays letter/correspondence, not chat bubbles. |
| Safety foundation | COMPLIANT | Blocking (also junks existing mail + revokes approval), reporting, unknown-sender isolation, junk handling, link/domain detection on all mail. |
| Link/domain warnings | MINOR DIFFERENCE | URL warning banner renders for incoming mail in Requests and Junk (where unknown/filtered senders live). Mail from known/approved senders in Mailbox shows no banner. Domains are detected and stored for all messages, so widening the banner is trivial if ever desired. Does not materially change product behavior. |
| Privacy | COMPLIANT | Message bodies are private; share card serializes `body: null` by default; all correspondence access requires authenticated ownership. |
| Product experience | COMPLIANT | Postal language throughout; envelope objects, postal statuses, mobile-first bottom-tray navigation. "Toy-simple. Technically serious." retained as internal doctrine (docs), removed from consumer copy. |
| Primary consumer journey | COMPLIANT | CHECK MY MAIL → connect → sign → mailbox. SEND MAIL → paste address → write → send. No extra steps. |
| Sound & interaction | COMPLIANT | Sound preference exists, OFF by default, no audio shipped; interactions are cause→reaction postal moments with reduced-motion support. |
| V1 freeze boundary | COMPLIANT | No trading, charts, staking, custody, Packages, Mail Desk, NFT, or other out-of-scope features present. |

## Conflicts

**None discovered.** No locked principle is violated by the current
implementation. (No conflicts were invented to create work.)

## Issues to address BEFORE the security audit

These are not spec conflicts — the spec itself defers them to the
DISCOVERY + PROTECTION layer — but the audit will flag them, so they are
recorded here for that task:

1. **No rate limiting or sender throttling** on any endpoint (auth challenge
   issuance, send, report). A single wallet can send unlimited mail.
2. **No enumeration protection** — endpoints do not currently disguise whether
   a wallet has a mailbox/preferences record.
3. **Abuse-detection signals are minimal** — reports are stored but nothing is
   automated on top of them.
4. Payload limit exists on message body (4,000 chars) — adequate for V1, but
   the audit should confirm limits on all other user-supplied fields.
