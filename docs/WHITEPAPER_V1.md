# $MAIL

## Wallet-Native Communication for Solana

**Whitepaper V1**

> Every wallet has an address.
> Now it has a mailbox.

Maintained by EgoShiftLabs · Public technical release `v1.0-poc`

---

## Abstract

$MAIL is wallet-to-wallet mail for Solana. It treats a Solana wallet address the way the postal system treats a street address: as a place correspondence can be sent, regardless of whether the occupant has ever announced they are ready to receive it.

Anyone can address a letter to any valid Solana wallet. The recipient does not need an account, a username, an email address, or a phone number — and does not need to have used $MAIL before. Mail waits in the wallet's mailbox until the owner proves control of the address with a signed authentication message and checks it.

V1 is a functional, security-tested proof of concept: letters, requests from unknown senders, junk, blocking, reporting, and privacy-first sharing, built on signature authentication that never moves assets. Basic consumer mail is free, and the project's public source is published for independent inspection.

This paper describes what V1 is, the principles it is built on, its security model, and the direction of future work. It describes future functionality as intent, not as promises.

## The communication problem created by wallet-only identity

On Solana, identity increasingly begins and ends with a wallet address. A wallet can hold assets, sign transactions, and interact with applications — but it cannot receive a message.

There is no native way to reach the owner of an arbitrary wallet:

- Off-chain channels (email, Telegram, Discord, X) require knowing who the owner is somewhere else, which defeats wallet-native identity and invites impersonation.
- On-chain "messages" (memo transactions, dust transfers with payloads) are public, costly, easily abused, and are not a correspondence experience.
- Existing wallet chat products typically require both parties to register before contact is possible, which means the empty network cannot bootstrap itself.

The result is a communication gap in a system otherwise built on addressability: every wallet has a public address, and almost none of them can receive mail.

## Wallet addresses as mailbox addresses

$MAIL's founding observation is that a Solana wallet address already has the essential property of a mailing address: it is public, unique, and durable.

$MAIL gives that address another function: a mailbox.

- No username.
- No email address.
- No phone number.

The address *is* the identity. Ownership of the mailbox is established cryptographically — by the wallet's ability to sign a message — not by an account system layered on top.

## Addressing wallets that have never registered

The defining product behavior of $MAIL, inherited directly from physical mail: **the recipient does not need to exist yet, as far as $MAIL is concerned.**

Any valid supported Solana wallet may be addressed. The recipient:

- does not need a $MAIL account
- does not need to have visited $MAIL previously
- does not need to be online
- does not need to register before mail is addressed

Mail addressed to a wallet is held for that wallet. When the owner eventually authenticates, their mail is already waiting. This is the core magic moment of the product, and V1 protects it.

## Signature authentication

Proving ownership of a mailbox means proving control of the wallet — nothing more.

$MAIL authentication is signature-based:

1. The client requests an authentication challenge for a wallet address.
2. The server issues a random, single-use, expiring challenge bound to that wallet, presented as a human-readable message that states plainly: *no SOL will move, and no transaction will be submitted.*
3. The wallet signs the message — a message signature, never a transaction.
4. The server verifies the ed25519 signature against the wallet's public key, consumes the challenge atomically so it can never be reused, and establishes a signed, HTTP-only session.

Signing in transfers no SOL, transfers no tokens, grants no spending approvals, and submits nothing to the chain. $MAIL never asks for a seed phrase or a private key; nothing legitimate ever will.

## The V1 postal system: Mailbox, Requests, Junk, Sent

V1 organizes correspondence the way a post office would:

- **Mailbox** — accepted and known correspondence.
- **Requests** — first contact from unknown senders, held for the recipient's decision.
- **Junk** — unwanted or filtered correspondence.
- **Sent** — outgoing correspondence.

Replies and threads are supported, but the experience deliberately preserves the letter metaphor: people write letters and send them to an address. There are no typing indicators, no online status, no read-receipt pressure loop.

## Honest states: Addressed, Delivered, Opened

$MAIL uses three truthful communication states and refuses to overclaim:

- **ADDRESSED** — The system accepted correspondence addressed to the wallet. This does not mean the recipient knows about it.
- **DELIVERED** — The authenticated recipient reached an appropriate $MAIL surface where the correspondence was presented.
- **OPENED** — The authenticated recipient explicitly opened the correspondence.

"Delivered" is never claimed while mail merely waits, and "opened" is never claimed without an explicit open by the authenticated recipient. This honesty rule applies everywhere, including marketing copy.

## Recipient control

The recipient is in charge of their own mailbox:

- Mail from unknown senders lands in **Requests** by default; the recipient can change how unknown senders are handled (requests, direct to mailbox, or straight to junk).
- Accepting a request establishes approved correspondence; approved senders reach the Mailbox directly.
- Sending mail to someone automatically approves their replies into your Mailbox.
- **Blocking** is immediate: future mail from a blocked wallet is refused (RETURN TO SENDER), and existing mail is junked.
- **Reporting** attaches a recipient-filed report to a message and sender for future moderation tooling.
- Links in mail are never trusted: destination domains are detected at send time and surfaced with a warning before anything opens.

Recipient control takes priority over sender convenience.

## Privacy and safety

Private correspondence is private by default.

- All mailbox reads are scoped to the authenticated session wallet; message detail is available only to the sender or recipient.
- The shareable "I got mail" card never contains the letter body — the server never returns body content in share data. Revealing content is an explicit, owner-side choice.
- Future discovery systems must never reveal private message bodies or unnecessary sensitive metadata.

Safety tooling — request isolation, junk, blocking, reporting, link warnings — is part of the V1 foundation, and future development is required to strengthen it, never weaken it for engagement.

## Why $MAIL is mail rather than another chat app

Chat is a presence medium: it implies both parties are here, now, and expects an immediate reply. Mail is an addressability medium: it works even when the recipient is absent, unknown, or not yet a user — which is exactly the situation on Solana, where the address space is enormous and almost none of it is "online" in any messaging product.

$MAIL is deliberately correspondence, not chat:

- letters, not message bubbles
- an address that can receive, not an account that must be created
- requests and junk, not open DMs
- honest delivery states, not read-receipt pressure

$MAIL is not intended to become another Telegram, Discord, or messenger clone. The complexity belongs underneath the mailbox, never in front of the user.

## The Consumer Mailbox

V1 is the consumer mailbox: a simple, mobile-first, wallet-browser-first experience with two primary journeys.

**Check my mail** → connect wallet → sign the ownership challenge → read what's waiting.

**Send mail** → paste or choose a wallet address → write the letter → send.

Everything else — safety controls, preferences, share cards — supports those two journeys. The product language is postal (letters, the Postmaster, RETURN TO SENDER), friendly, and nontechnical wherever possible.

## Future: Mail Desk

*Future work — not part of V1.*

Mail Desk is the contemplated project-facing surface: verified projects and organizations sending signed announcements to their holders, strictly separated from personal mail, with recipients opting in per project. It is deliberately absent from V1 so that personal correspondence defines the product first.

## Future: Developer Mode

*Future work — not part of V1.*

Developer Mode is contemplated infrastructure for building on $MAIL: authenticated APIs, programmatic mail, webhooks, verified organizational senders, application-generated correspondence, and project-to-holder communication. The long-term economic intuition: consumers create network activity; developers, projects, and organizations pay for advanced infrastructure.

## Future: Packages

*Future work — not part of V1. Requires separate security review before any implementation.*

A Package is a letter that carries something: **letter + asset = package.** Possible future uses include SOL gifts, token gifts, project rewards, and airdrop distribution that arrives with context instead of appearing unexplained in a wallet. Acceptance of any value-bearing mail would be explicit and transaction-signed by the recipient — never automatic. V1 contains no asset transfer functionality, and none will be added until a dedicated security architecture has been reviewed and approved.

## Future: Certified Mail

*Research — not part of V1.*

Certified Mail is a research direction: a contemplated class of correspondence with stronger sender verification and stronger delivery attestation than ordinary mail, for situations where who sent it and whether it arrived matter more than usual. Its design, guarantees, and mechanism are open research questions and no specific implementation is promised.

## The discovery challenge

Mail can be addressed to any wallet — but a wallet owner who has never heard of $MAIL does not know their mail is waiting. Discovery is therefore the central growth problem, and it must be solved without violating privacy.

A bare wallet address is not automatically a notification endpoint, and $MAIL never pretends otherwise. Discovery has to be built from privacy-safe signals and explicitly enrolled channels.

## Future: Mail Flag

*Future work — not part of V1.*

The Mail Flag is the contemplated privacy-safe discovery primitive: a way to indicate that a wallet has mail waiting — **MAIL WAITING** — without exposing the correspondence, the sender, or anything about the contents. It is discovery, not public inbox access: ownership authentication remains required to read anything.

## Future: opt-in notifications

*Future work — not part of V1.*

Notification capability requires a supported, explicitly enrolled channel — browser/PWA push, wallet-supported notification infrastructure, Telegram, or other channels the owner deliberately connects. Notifications must announce that the flag is up without leaking sender or content off-platform.

## Spam and attention control

A system where anyone can address anyone must take abuse seriously from the start. V1 ships with the foundation:

- unknown-sender isolation into Requests
- junk handling, blocking (with refusal of future mail), and reporting
- layered rate limiting on sending, reporting, blocking, and authentication endpoints
- payload limits and strict input validation
- wallet-enumeration resistance, so the API does not reveal whether an arbitrary wallet has mail

Before broad public adoption, this hardening must deepen: sender throttling, abuse detection, and automated attack controls are prerequisites for high-volume delivery, not afterthoughts. Future economic mechanisms (such as optional paid postage for unsolicited reach) are contemplated as spam filters — while replies and basic correspondence stay free.

## The free consumer utility principle

$MAIL is utility-first. Ordinary users must be able to **receive, read, send, and reply** without purchasing anything.

Basic consumer mail is free in V1 and should remain free. Monetization belongs around advanced network infrastructure — never as a tollbooth in front of a person's own mailbox.

## Future $MAIL token philosophy

A future $MAIL token is contemplated. **V1 does not depend on it**: there is no token functionality, no payment flow, and no custody anywhere in the V1 codebase.

The philosophy for any future token is fixed:

- Basic consumer mail must remain free. Holding a token must never become a prerequisite for ordinary users to access their own mailbox.
- Future token utility should come from legitimate network demand — developer and API infrastructure, verified organizational senders, advanced distribution services, high-volume network capabilities — not from forced access to basic communication.

These are directions, not commitments. No tokenomics are defined in this paper, deliberately.

## Network effect

$MAIL's acquisition loop is the mail itself:

1. A sender addresses mail to a wallet.
2. The recipient may never have used $MAIL.
3. The recipient discovers there is mail waiting.
4. They visit $MAIL and authenticate their wallet.
5. Their mail is already there — the mailbox was always theirs.
6. They reply, or send mail to another wallet.

Every letter to a new wallet is an invitation that carries its own payload. The product grows by being used, not by requiring both sides to join first.

## Mailbox Activation Rate

The primary future network metric:

> **Mailbox Activation Rate** — the percentage of previously inactive recipient wallets that later authenticate and access their mailbox after receiving legitimate mail.

It measures the only loop that matters: mail sent into the dark actually turning on mailboxes. V1 does not publish metrics; the definition is recorded here so that future measurement is honest from day one.

## Security model

V1's security model, in brief (full detail in the repository's security documentation):

- **Authentication** — random, cryptographically unpredictable challenges; wallet-bound; expiring; consumed atomically on use (single-use, race-safe); ed25519 signatures verified server-side; malformed input fails safely.
- **Sessions** — HMAC-signed, HTTP-only cookies; tampered or forged sessions are rejected.
- **Authorization** — every mailbox read and mutation is scoped to the authenticated session wallet; cross-wallet access attempts are denied; delivery/opened states advance only through the real recipient.
- **Input handling** — strict validation of wallets, identifiers, folders, and preferences; body-size caps at both the JSON and content layer; parameterized queries throughout; no server-side HTML rendering of mail content.
- **Abuse resistance** — layered per-IP and per-wallet rate limiting on challenge, verify, send, report, and block endpoints, with a bounded, fail-closed limiter store.
- **Disclosure control** — uniform challenge responses prevent wallet enumeration; a central error handler returns generic messages without stack traces.
- **No custody** — V1 holds no assets. Authentication cannot move SOL and cannot submit a transaction.

**36 of 36 internal adversarial security test scenarios pass after remediation.** This was internal testing by the maintainers with a rerunnable harness using disposable, zero-asset keypairs. **It is not an independent third-party security audit**, and no external certification is claimed. The audit report, the claim-by-claim test matrix, and the harness itself are published in the repository so the testing can be re-run and challenged.

## Current V1 limitations

V1 is a proof of concept, and says so. Known, documented limitations include:

- Rate limits are per-instance and in-memory; horizontal scaling requires a shared store or edge enforcement.
- Reports are stored but not yet acted on automatically; moderation tooling is future work.
- No notification channels yet — mail discovery currently requires visiting $MAIL.
- Ordinary V1 correspondence is stored off-chain and is not presented as on-chain messaging.
- The Porch (public drop-off), Mail Desk, Packages, and Developer Mode are visible in the product philosophy but intentionally unbuilt.
- Challenge expiry is verified by code inspection rather than a live time-elapsed test; single-use and wallet binding are dynamically tested.

## Public-source philosophy

Trust claims about wallet software are worthless if they cannot be checked. The V1 technical source is published so that anyone can:

- read the authentication implementation and confirm that signing in is a message signature, never a transaction
- confirm there is no code path that requests a seed phrase or private key, custodies assets, or submits transactions
- re-run the adversarial security harness against their own instance
- audit the privacy boundaries around mail bodies and share cards

The repository is published for transparency and independent technical verification: **verify, don't just trust.** Independent technical review is welcome, and responsible disclosure is documented in `SECURITY.md`.

## Roadmap

- **CURRENT** — V1 foundation and public technical source: the consumer mailbox, signature authentication, requests/junk/blocking/reporting, privacy-first share cards, and the published security documentation.
- **NEXT** — Discovery and protection: the Mail Flag, opt-in notifications, and stronger abuse infrastructure.
- **LATER** — Developer Mode, authenticated APIs, and the early Mail Desk.
- **RESEARCH** — Packages, contextual airdrops, Certified Mail, asset-aware correspondence, and future network/token economics.

No completion percentages, no dates. Sequence over schedule.

## Conclusion

Every Solana wallet already has an address. $MAIL's proposition is that the address deserves a mailbox: a private, recipient-controlled place where anyone can be reached and no one can be exploited by the act of checking their own mail.

V1 keeps the promise small and keeps it honestly: letters between wallets, authentication that only ever proves ownership, safety controls in the recipient's hands, honest delivery states, free basic mail, and public source for anyone who prefers verification to trust.

The mailbox comes first. The network grows one letter at a time.

---

*This whitepaper describes V1 as implemented and future work as intent. Where this document and the V1 Master Specification differ, the specification governs. Nothing in this paper is an offer, a promise of future functionality, or financial advice.*
