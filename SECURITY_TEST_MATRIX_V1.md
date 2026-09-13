# $MAIL V1 — SECURITY TEST MATRIX (PASS #1)

Executed by `artifacts/api-server/security-tests.mjs` against the running API
using disposable, zero-asset ed25519 keypairs (A/sender, B/recipient,
C/unknown, D/blocked, Attacker). Re-run: `node security-tests.mjs` from
`artifacts/api-server` against a freshly restarted server.

Date: 2026-08-11 — **36 executed, 36 PASS, 0 FAIL.**

## Authentication & sessions

| # | Scenario | Result |
|---|---|---|
| 1 | Valid signature authenticates | PASS |
| 2 | Challenge states "No SOL will move / No transaction will be submitted" | PASS |
| 3 | Challenge is bound to the requesting wallet | PASS |
| 4 | Replay of a consumed challenge rejected (single-use) | PASS |
| 5 | Wrong-key signature cannot authenticate a wallet | PASS |
| 6 | Challenge issued for A cannot authenticate B (cross-nonce) | PASS |
| 7 | Malformed signature fails safely (401, no 500) | PASS |
| 8 | Invalid wallet format rejected at challenge (400) | PASS |
| 9 | Concurrent duplicate verify establishes exactly one session (atomic single-use) | PASS |
| 10 | Tampered session cookie rejected (401) | PASS |
| 11 | Forged unsigned session rejected (401) | PASS |
| — | Challenge expiry (10 min) | NOT TESTED (time-based); verified by code inspection |

## Authorization & cross-wallet privacy

| # | Scenario | Result |
|---|---|---|
| 12 | Protected endpoints require auth (summary/list/prefs/blocked/send → 401) | PASS |
| 13 | Authenticated send succeeds | PASS |
| 14 | Third party cannot read another wallet's message (404) | PASS |
| 15 | Third party cannot open/accept/junk/share another wallet's message (404) | PASS |
| 16 | Sender cannot mark own outgoing mail opened (state integrity) | PASS |
| 17 | Delivery/opened states advance only via the real recipient | PASS |
| 18 | Share card keeps body private by default (body null, revealed false) | PASS |

## Input validation & injection

| # | Scenario | Result |
|---|---|---|
| 19 | Malformed message id → 404 across all 6 id routes (no DB 500) | PASS |
| 20 | Report with malformed messageId → 404 (no DB 500) | PASS |
| 21 | Send with malformed replyToMessageId → 400 (no DB 500) | PASS |
| 22 | XSS payload stored/returned verbatim as data (no server transform) | PASS |
| 23 | SQL-injection payload inert (parameterized queries) | PASS |
| 24 | SQLi in wallet field rejected as invalid address (400) | PASS |
| 25 | Over-limit body (>4000 chars) rejected (400) | PASS |
| 26 | Oversized JSON payload refused (413/400) | PASS |
| 27 | Whitespace-only body rejected (400) | PASS |

## Blocking & reporting

| # | Scenario | Result |
|---|---|---|
| 28 | Blocked sender refused (RETURN TO SENDER, 403) | PASS |
| 29 | A wallet cannot modify another wallet's block list | PASS |
| 30 | Cannot report a message not addressed to you (404) | PASS |

## Abuse resistance & disclosure

| # | Scenario | Result |
|---|---|---|
| 31 | Malformed JSON → clean 4xx, no stack trace / SyntaxError leaked | PASS |
| 32 | Challenge response identical for known vs never-seen wallet (no enumeration) | PASS |
| 33 | Send endpoint rate-limits floods (429) | PASS |
| 34 | Report endpoint rate-limits spam (429) | PASS |
| 35 | Unblock endpoint rate-limits churn (429) | PASS |
| 36 | Challenge issuance rate-limits floods (429) | PASS |

## Cryptographic primitives (code-verified — not counted in the 36 dynamic tests)

| # | Scenario | Result |
|---|---|---|
| C1 | POSTMASTER wallet is unspendable (32 bytes of 9, no private key) | PASS (code inspection) |
| C2 | Nonce = crypto.randomBytes(24), single-use, wallet-bound | PASS (see #4, #9) |

## Not tested (documented)

- **Challenge expiry window** — would require a 10-minute live wait; the
  `expiresAt` check is code-verified and single-use/binding are dynamically
  tested.
- **Browser wallet extensions (Phantom/Solflare)** — require a real extension
  and human interaction; server-side guarantees are independent of the client
  (see SECURITY_AUDIT_V1.md §9).
- **Multi-instance rate limiting** — current limiter is single-instance by
  design (SECURITY_AUDIT_V1.md §11).
