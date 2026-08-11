# Security Policy — $MAIL

## The two rules that matter most

1. **Never provide a seed phrase. To anyone. Ever.**
2. **Never provide a private key.**

$MAIL never asks for either. No screen, prompt, email, DM, or "support agent"
associated with $MAIL will ever legitimately request them. Anything that does
is an attack.

## How $MAIL authentication works

- Authentication is **signature-based**: your wallet signs a random, single-use,
  expiring challenge message to prove control of the address.
- Signing in is **not a transaction**. It transfers no SOL or tokens and grants
  no spending approvals.
- Authentication does not require asset custody, and **V1 does not provide
  asset custody** — this application never holds, moves, or approves movement
  of any asset.

If a wallet prompt during $MAIL sign-in ever asks you to approve a
*transaction* rather than sign a *message*, stop and report it.

## Reporting a vulnerability

Responsible disclosure is appreciated and taken seriously.

- Report vulnerabilities privately via
  [GitHub Security Advisories](https://github.com/EgoShiftLabs/mail-foundation-core/security/advisories/new)
  for this repository.
- Include enough detail to reproduce the issue (affected route/component,
  request/response, preconditions).
- **Please do not publicly disclose an exploitable vulnerability** before the
  maintainers have had a reasonable opportunity to investigate and remediate.

There is currently no bug bounty program, and no financial compensation is
offered or implied.

## Current security documentation

- [`SECURITY_AUDIT_V1.md`](SECURITY_AUDIT_V1.md) — internal adversarial audit
  findings and remediations (36/36 scenarios passing after remediation).
- [`SECURITY_TEST_MATRIX_V1.md`](SECURITY_TEST_MATRIX_V1.md) — claim-by-claim
  test matrix.
- [`artifacts/api-server/security-tests.mjs`](artifacts/api-server/security-tests.mjs)
  — rerunnable adversarial test harness.
- [`docs/SECURITY_NOTES.md`](docs/SECURITY_NOTES.md) — security design summary.

This testing was internal. No independent or third-party audit is claimed.
Independent technical review is welcome.
