# $MAIL — CHANGE CONTROL

`MAIL_V1_MASTER_SPECIFICATION.md` is the authoritative source of truth for
$MAIL V1. The approved working baseline is preserved at git tag
`v1-poc-frozen`.

## Change classification

Every proposed change must be classified before work begins:

| Class | Definition | May proceed? |
|---|---|---|
| **FIX** | Repairs existing intended behavior. | Yes, when consistent with the Master Specification. |
| **POLISH** | Improves implementation without changing product behavior. | Yes, when consistent with the Master Specification. |
| **FEATURE** | Adds a new capability. | Requires deliberate product consideration first. |
| **ARCHITECTURAL CHANGE** | Changes fundamental behavior, security, privacy, economics, or product philosophy. | Requires explicit approval first. |

## Rules for future development

1. The Master Specification is authoritative. Read it before making changes.
2. Working V1 systems are protected and must be preserved: wallet connection,
   signature authentication, message sending, addressability of any valid
   Solana wallet (including wallets that have never used $MAIL), Mailbox /
   Requests / Junk / Sent folders, reply/thread behavior, unknown-sender rules,
   blocking/reporting, link warnings, message status tracking, settings, the
   mobile-first interface, and the postal visual system.
3. Major changes (FEATURE, ARCHITECTURAL CHANGE) require explicit approval
   before implementation.
4. New features belong outside the frozen V1 baseline — never silently fold
   them into V1.
5. No silent scope expansion. If an instruction conflicts with the Master
   Specification: STOP, identify the conflict, and surface the decision to the
   user before proceeding.

## Baseline recovery

To inspect or return to the approved V1 baseline:

```
git diff v1-poc-frozen        # compare current state against the freeze
git checkout v1-poc-frozen    # inspect the frozen tree (detached HEAD)
```

Development-environment checkpoints provide additional restore points on top of this tag.
