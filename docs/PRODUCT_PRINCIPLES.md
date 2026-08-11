# $MAIL — Product Principles

> Every wallet has an address. Now it has a mailbox.

## 1. The mailbox is a place, not an app

The landing surface is a small interactive world with one hero — the mailbox
character — and one primary action: **CHECK MY MAIL**. It must never feel
like a dashboard, an inbox tool, or a DeFi terminal.

## 2. Mail, not messages

$MAIL is correspondence, not chat. People write letters, seal them, and send
them to an address. Replies are letters too. There is no typing indicator,
no online status, no read-receipt pressure loop. Language is postal:
deliveries, letters, the Postmaster, RETURN TO SENDER.

## 3. Any wallet can receive mail

A recipient never needs to have used $MAIL. Mail is **addressed** to any
valid Solana wallet and waits. When the owner proves the wallet is theirs,
their mail is already there. This is the core magic moment — protect it.

## 4. Honest states, always

- **Addressed** — recorded for the recipient's wallet.
- **Delivered** — surfaced on a $MAIL surface the recipient actually accessed.
- **Opened** — the authenticated recipient opened the letter.

Never claim "delivered" when the recipient has not been on a $MAIL surface.
Never claim "opened" when they have not opened it. No exceptions, ever,
including marketing copy.

## 5. Signatures, never transactions

Authentication is a message signature. $MAIL never submits a transaction,
never requests token approval, never touches funds. Every signing surface
repeats the reassurance: **No SOL will move.**

## 6. The recipient is in control

- Unknown senders land in **Requests** (recipient can change this default).
- Accepting a request establishes approved correspondence.
- Blocking is immediate: existing mail goes to Junk, future mail is refused
  with RETURN TO SENDER.
- Links in mail are never trusted: destination domains are surfaced and
  warned about before anything opens.

## 7. Private by default, shareable by choice

"I GOT MAIL" is shareable. The letter inside is not — the share card never
contains the body, and the server never returns body content in share data.
Revealing content is an explicit, owner-side choice.

## 8. No crypto clichés

No rockets, no moons, no lasers, no degen-speak, no emojis in product UI.
The brand is a friendly, trustworthy postal service that happens to run on
Solana.

## 9. Out of scope for V1 (on purpose)

- Mail Desk (project-facing bulk sending surface)
- The Porch (public drop-off) — visible as a boarded-up placeholder only
- Attachments, tokens-in-mail, paid postage
