# $MAIL V1 — MASTER SPECIFICATION

Canonical Product Record
Status: **FROZEN FUNCTIONAL PROOF OF CONCEPT**

> This document is the authoritative source of truth for $MAIL V1. If any future
> instruction conflicts with this specification: STOP, IDENTIFY THE CONFLICT,
> SURFACE THE DECISION. Do not silently redefine the project.
> See `CHANGE_CONTROL.md` for the change classification process.
> Frozen baseline: git tag `v1-poc-frozen`.

---

## PRODUCT IDENTITY

Project: **$MAIL**

Core positioning:

> "Every wallet has an address. Now it has a mailbox."

$MAIL is a wallet-native communication utility for Solana.

A Solana wallet address functions as the mailing address.

Users do not need traditional usernames, email accounts, phone numbers, Telegram
identities, Discord identities, or real-world identities in order to receive
wallet-addressed correspondence.

Ownership of a mailbox is established through cryptographic wallet authentication.

## FOUNDATIONAL PRODUCT PRINCIPLE

$MAIL is utility-first.

Basic consumer mail must remain accessible without requiring ownership of the
$MAIL token.

Ordinary users should be able to:

- RECEIVE
- READ
- SEND
- REPLY

without purchasing $MAIL.

Future token utility should exist around advanced network infrastructure rather
than creating a tollbooth around basic communication.

## AUTHENTICATION

$MAIL uses wallet signatures to establish control of a mailbox.

Authentication must clearly communicate:

- "No SOL will move."
- "No transaction will be submitted."

Authentication must never silently become an asset transfer or blockchain
transaction.

Authentication architecture should use secure anti-replay practices including
appropriate nonce, wallet identity, issuance, and expiration handling.

Never request:

- seed phrases
- private keys
- recovery phrases
- secret phrases

**EVER.**

## ADDRESSABILITY

Any valid supported Solana wallet may be addressed.

The recipient:

- does not need a $MAIL account
- does not need to have visited $MAIL previously
- does not need to be online
- does not need to register before mail is addressed

This is fundamental product behavior.

## DELIVERY STATES

$MAIL uses three truthful communication states.

**ADDRESSED** — The system has accepted mail addressed to a recipient wallet.
This does NOT mean the recipient knows about it.

**DELIVERED** — Used only when the recipient reaches an appropriate
authenticated $MAIL surface and the product can legitimately establish delivery.

**OPENED** — Used only after the authenticated recipient actually opens the
delivery.

Never overclaim delivery or read status.

## V1 POSTAL SYSTEM

- **MAILBOX** — Accepted/known correspondence.
- **REQUESTS** — Correspondence from unknown senders.
- **JUNK** — Unwanted or filtered correspondence.
- **SENT** — Outgoing correspondence.
- **PORCH** — Reserved for future packages, gifts, SOL/token deliveries, or
  other value-bearing mail. Porch functionality is NOT part of frozen V1.

## UNKNOWN SENDERS

Default:

> Unknown Sender → Requests

Recipient controls may include:

- Requests
- Direct to Mailbox
- Send to Junk

Recipient control takes priority over sender convenience.

## CONVERSATIONS

Replies and threaded communication are supported.

The visual experience should preserve the mail/letter metaphor rather than
evolving into a generic chat application.

$MAIL is NOT intended to become another Telegram, Discord, or conventional
messenger clone.

## SAFETY

The current safety foundation includes:

- blocking
- reporting
- unknown sender isolation
- link/domain warnings
- junk handling

Future development must strengthen these controls.

Safety must never be weakened simply to increase engagement.

## PRIVACY

Private correspondence is private by default.

Future public discovery systems must never reveal private message bodies.

Future Mail Flag functionality may expose a privacy-safe state such as:

> MAIL WAITING

but must not expose private correspondence or unnecessary sensitive metadata.

Ownership authentication remains required to access protected correspondence.

## PRODUCT EXPERIENCE

Approved visual/product language:

- mailbox
- post office
- letters
- requests
- junk mail
- sent mail
- porch
- postal states
- physical-mail interactions

The product must NOT drift into a generic Web3 dashboard.

Approved product doctrine:

> "Toy-simple. Technically serious."
>
> "The complexity belongs underneath the mailbox, never in front of the user."

The experience remains:

- mobile-first
- wallet-browser-first
- simple
- friendly
- understandable
- nontechnical where possible

## PRIMARY CONSUMER JOURNEY

**CHECK MY MAIL**

→ choose/connect wallet
→ sign ownership challenge
→ access mailbox

**SEND MAIL**

→ choose/paste wallet address
→ write message
→ send

This must remain simple.

## SOUND AND INTERACTION

Postal sound and interaction feedback are approved.

Sound must remain user-controlled.

Interaction personality should enhance the postal metaphor without making the
product cumbersome.

## V1 FREEZE BOUNDARY

The current product is the approved functional proof of concept.

V1 must not silently expand into:

- token trading interface
- price charts
- staking
- forced token ownership
- speculative token mechanics
- airdrop mechanics
- asset custody
- Packages
- Mail Desk
- full CRM
- NFT minting
- inscriptions
- complex social features
- unrelated Web3 functionality

Those belong to future deliberate decisions.

## NEXT INFRASTRUCTURE LAYER

The first approved expansion after V1 is:

**DISCOVERY + PROTECTION**

This includes future work around:

- Mail Flag
- privacy-safe mailbox lookup
- opt-in notifications
- deep links
- anti-spam
- rate limiting
- abuse protection

## MAIL FLAG

Future Mail Flag functionality may indicate that a wallet has mail waiting
without exposing the correspondence.

Example:

> MAIL WAITING

This is discovery, not public inbox access.

## NOTIFICATIONS

A bare wallet address is not automatically a notification endpoint.

Notification capability requires a supported channel such as:

- browser/PWA push
- wallet-supported notification infrastructure
- Telegram
- other explicitly enrolled delivery channels

$MAIL must never pretend otherwise.

## ANTI-SPAM

Before broad public adoption or high-volume delivery, $MAIL requires:

- rate limiting
- sender throttling
- payload limits
- abuse detection
- enumeration protection
- automated attack controls

## $MAIL TOKEN PRINCIPLES

A future $MAIL token is planned.

V1 does not depend on it.

Basic consumer mailbox access must remain free.

Potential future token utility may involve:

- developer/API credits
- verified organizational senders
- advanced distribution infrastructure
- high-volume network services
- premium developer capabilities
- network participation

These are future possibilities rather than current promises.

**IMMUTABLE PRODUCT PRINCIPLE:**

Holding $MAIL must not become a prerequisite for ordinary users to access their
basic mailbox.

## DEVELOPER MODE

Developer Mode is future infrastructure.

Potential capabilities may include:

- authenticated APIs
- programmable mail
- verified senders
- webhooks
- analytics
- scheduled delivery
- wallet segmentation
- advanced distribution tools

Potential long-term economic model:

> Consumers create network activity.
> Developers, projects, and organizations pay for advanced infrastructure.

## PACKAGES

Packages are future functionality.

Concept:

> Letter + Asset = Package

Possible future uses:

- SOL gifts
- token gifts
- project rewards
- airdrop distribution with context
- other digital assets

Do NOT implement asset transfer functionality until a separate security
architecture has been reviewed and approved.

## NETWORK EFFECT

Core acquisition loop:

Sender
→ addresses mail to wallet
→ recipient may never have used $MAIL
→ recipient discovers mail
→ recipient visits $MAIL
→ authenticates wallet
→ opens existing mail
→ becomes participant
→ sends mail to another wallet

Primary future network metric:

**MAILBOX ACTIVATION RATE**

Definition:

> Percentage of previously inactive recipient wallets that later authenticate
> and access their mailbox after receiving legitimate mail.

## CHANGE CONTROL

This file is the source of truth for V1.

All future work should classify proposed changes as:

**FIX** — Repairs existing intended behavior.

**POLISH** — Improves implementation without changing product behavior.

**FEATURE** — Adds a new capability.

**ARCHITECTURAL CHANGE** — Changes fundamental behavior, security, privacy,
economics, or product philosophy.

Fixes and appropriate polish may proceed when consistent with this document.

Features require deliberate product consideration.

Architectural changes require explicit approval.

If future instructions conflict with this specification:

1. STOP
2. IDENTIFY THE CONFLICT
3. SURFACE THE DECISION

Do not silently redefine the project.
