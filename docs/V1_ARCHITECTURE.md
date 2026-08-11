# $MAIL — V1 Architecture

## Stack

- **Frontend** — React + Vite (`artifacts/mail`), wouter routing,
  TanStack Query hooks generated from the OpenAPI spec (Orval),
  @solana/wallet-adapter for Phantom/Solflare with custom UI.
- **API** — Express 5 (`artifacts/api-server`), routes validated on input
  and output with Zod schemas generated from the same OpenAPI spec.
- **Contract** — `lib/api-spec/openapi.yaml` is the single source of truth.
  Codegen produces `@workspace/api-zod` (server) and typed React Query
  hooks (client).
- **Database** — PostgreSQL via Drizzle ORM (`lib/db`).

## Data model

| Table | Purpose |
| --- | --- |
| `messages` | Letters. Sender/recipient wallets, body, recipient-side folder (`mailbox` / `requests` / `junk`), thread id (root message id), reply reference, URL flags, `created_at` (addressed), `delivered_at`, `opened_at`. |
| `mailbox_preferences` | Per-wallet settings; `unknown_sender_handling` decides where mail from strangers lands (default `requests`). |
| `approved_senders` | Approved correspondence pairs. Created when an owner sends mail to someone or accepts a request. Approved senders land in Mailbox. |
| `blocked_wallets` | Block list. Blocks refuse future mail (403 RETURN TO SENDER) and junk existing mail. |
| `reports` | Recipient-filed reports against a message/sender. |
| `auth_challenges` | Short-lived (10 min), single-use sign-in nonces. |

## Authentication flow

1. `POST /api/auth/challenge` — client submits a wallet address, server
   stores a nonce and returns a human-readable message to sign (includes
   the "No SOL will move" reassurance).
2. Wallet signs the message (`signMessage`, never a transaction).
3. `POST /api/auth/verify` — server verifies the ed25519 signature
   (tweetnacl) against the wallet public key (bs58-decoded), deletes the
   challenge, and sets an HTTP-only, HMAC-signed session cookie
   (`SESSION_SECRET`, 30-day expiry).
4. First-ever sign-in seeds a welcome letter from the Postmaster so the
   first CHECK MY MAIL has mail in it.

## Message lifecycle

- **Send** — sender must be authenticated (so `sender_verified` is always
  true in V1). Recipient only needs to be a valid base58 32-byte address.
  Placement: blocked → 403; self-mail or approved sender → Mailbox;
  otherwise recipient's `unknown_sender_handling` (default Requests).
  Sending to someone auto-approves their replies into your Mailbox.
- **Delivered** — set when the recipient lists a folder containing the
  message or views its detail while authenticated (first $MAIL surface).
- **Opened** — set only by the explicit open action from the recipient.
- **Threads** — `thread_id` is the root message's id; replies inherit it.
- **URL safety** — server detects URLs at send time and stores the
  destination domains; the client warns before any link opens.

## Privacy boundaries

- Share card endpoint never returns the body (`body: null` always).
- All mailbox reads are scoped to the authenticated session wallet;
  message detail requires being sender or recipient.

## Frontend routes

`/` (landing world) · `/mailbox` (folders) · `/message/:id` (letter) ·
`/compose` · `/settings`
