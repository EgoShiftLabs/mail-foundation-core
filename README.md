# $MAIL

> Every wallet has an address. Now it has a mailbox.

$MAIL is wallet-to-wallet mail for Solana, developed and maintained by **EgoShiftLabs**.

Any valid Solana wallet address can receive $MAIL — even if its owner has never
used $MAIL before. Mail waits in the recipient's mailbox until they sign in and
check it. Basic V1 mail is free.

This repository is the **V1 proof-of-concept / early public technical release**,
published for transparency and independent technical verification.

## What V1 does

- **Letters** — wallet-to-wallet messages between Solana addresses.
- **Mail requests** — first contact from an unknown sender arrives as a request
  the recipient can accept, decline, or junk.
- **Junk, blocking, and reports** — recipient-controlled safety tools.
- **Share cards** — privacy-first public cards for sharing a mailbox address.

## Trust model

Read this before connecting a wallet — to $MAIL or to anything else:

- Sign-in uses a **signed message**, never a transaction. A wallet signature
  proves control of the wallet address for authentication purposes — nothing more.
- The authentication challenge is a random, single-use, expiring nonce. It does
  not request, construct, or submit any asset movement.
- Signing in transfers no SOL and no tokens, and grants no spending approvals.
- **$MAIL never asks for a seed phrase or private key.** Nothing in this
  application requests one, and nothing legitimate ever will.
- V1 holds no assets: there is no custody, no token functionality, and no
  payment flow anywhere in this codebase.

These claims are verifiable from source: wallet authentication lives in
`artifacts/api-server/src/routes/auth.ts` and
`artifacts/api-server/src/lib/wallet.ts` (ed25519 signature verification), with
session handling in `artifacts/api-server/src/lib/session.ts`.

## Security

**Internal adversarial security testing: 36/36 test scenarios passing after
remediation.** This was internal testing by the maintainers, not an independent
or third-party audit, and no external certification is claimed.

- [`SECURITY_AUDIT_V1.md`](SECURITY_AUDIT_V1.md) — the adversarial audit:
  findings, remediations, and residual-risk notes.
- [`SECURITY_TEST_MATRIX_V1.md`](SECURITY_TEST_MATRIX_V1.md) — the full test
  matrix mapping each security claim to a test scenario.
- [`artifacts/api-server/security-tests.mjs`](artifacts/api-server/security-tests.mjs)
  — the rerunnable adversarial test harness (no real wallets or keys; it
  generates disposable keypairs at runtime).

Covered controls include: unpredictable single-use expiring auth challenges,
wallet-bound signature verification, replay protection, cross-wallet mailbox
isolation, authorization enforcement on every route, sender-state restrictions,
block enforcement, input validation and malformed-ID handling, body-size
limits, security headers, layered rate limiting, generic error responses, and
parameterized database access throughout.

**Independent technical review is welcome.** See [`SECURITY.md`](SECURITY.md)
for how to report a vulnerability responsibly.

## Architecture

- **Frontend** — React + Vite SPA (`artifacts/mail`), TanStack Query hooks
  generated from the OpenAPI spec, `@solana/wallet-adapter` for wallet
  connections.
- **API** — Express 5 (`artifacts/api-server`), zod-validated input, DTO-mapped
  output, HMAC-signed HttpOnly session cookies.
- **Database** — PostgreSQL via Drizzle ORM (`lib/db`), parameterized queries
  only.
- **Shared libraries** — `lib/api-spec` (OpenAPI), `lib/api-zod` (schemas),
  `lib/api-client-react` (generated client).

See [`docs/V1_ARCHITECTURE.md`](docs/V1_ARCHITECTURE.md) for the full
architecture notes and [`docs/SECURITY_NOTES.md`](docs/SECURITY_NOTES.md) for
the security design summary.

## Building and running locally

Requirements: Node.js 20+, [pnpm](https://pnpm.io), PostgreSQL.

```sh
pnpm install
BASE_PATH=/ PORT=3000 pnpm run build   # typechecks and builds every package
```

(The web frontend's build config reads `BASE_PATH` and `PORT` at config-load
time, so they must be set even for a build.)

To run the app you need a PostgreSQL database and these environment variables
(names only — values are never committed to this repository):

| Variable         | Used by            | Purpose                                   |
| ---------------- | ------------------ | ----------------------------------------- |
| `DATABASE_URL`   | API server, db     | PostgreSQL connection string              |
| `SESSION_SECRET` | API server         | HMAC key for signed session cookies       |
| `PORT`           | each server        | Listen port (required, no default)        |
| `BASE_PATH`      | API server, web    | URL prefix the service is mounted under   |

```sh
# 1. Create the schema
DATABASE_URL=... pnpm --filter @workspace/db run push

# 2. Start the API server (mounted under /api)
DATABASE_URL=... SESSION_SECRET=<long-random-string> PORT=3001 BASE_PATH=/api \
  pnpm --filter @workspace/api-server run dev

# 3. Start the web frontend
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/mail run dev
```

The development layout assumes a fronting reverse proxy that serves the SPA and
the API from one origin; when running the pieces directly, point the frontend
at the API origin accordingly.

### Running the security test harness

With the API server running:

```sh
API_BASE=http://localhost:3001/api node artifacts/api-server/security-tests.mjs
```

The harness runs the full adversarial suite (36 scenarios) against the live
API using disposable keypairs generated in-process.

## Provenance

This public snapshot was exported from the approved $MAIL development baseline.
See [`PUBLIC_RELEASE_PROVENANCE.md`](PUBLIC_RELEASE_PROVENANCE.md) for the exact
source commit hash and sanitization notes.

Project governance and change-control rules for the V1 baseline are documented
in [`MAIL_V1_MASTER_SPECIFICATION.md`](MAIL_V1_MASTER_SPECIFICATION.md),
[`V1_SPEC_COMPLIANCE_REPORT.md`](V1_SPEC_COMPLIANCE_REPORT.md), and
[`CHANGE_CONTROL.md`](CHANGE_CONTROL.md).

## License

This repository is currently published **without a software license**; the
licensing decision is intentionally deferred. All rights reserved by
EgoShiftLabs until a license is chosen.
