# $MAIL MOTION BIBLE

## Core Philosophy
"Toy-simple. Technically serious." Motion should feel physical, satisfying, and slightly exaggerated, but never overwhelming. No confetti storms, camera shake, sparkles, or floaty ambient motion. Cause → Reaction.

## Animations

### 1. Primary New-Mail Animation (The Flag Snap)
- **TRIGGER**: `hasNewMail` changes from `false` to `true`.
- **START STATE**: Mailbox idle in Nav.
- **ACTION**: 
  - (With full assets: Flag snaps upward with crisp mechanical momentum, eyes stretch, door bounces.)
  - (Current implementation: Mailbox wiggles excitedly and a pulse indicator appears.)
- **DURATION**: ~1.0s loop.
- **PHYSICAL FEEL**: Mechanical and excitable.
- **END STATE**: Stable, indicator active.
- **REDUCED MOTION**: Fallback to simple opacity fade of the indicator, no wiggle.

### 2. Envelope Opening (Mail Reveal)
- **TRIGGER**: User taps an unread envelope in the mailbox.
- **START STATE**: Mailbox list item with flap down.
- **ACTION**: Flap rotates up, card moves forward (scale up), fade into the read view.
- **DURATION**: ~0.5s - 0.9s.
- **PHYSICAL FEEL**: Paper unfolding, moving closer to the reader.
- **END STATE**: Read view takes over.
- **REDUCED MOTION**: Instant cut or simple crossfade.

### 3. Send Mail (Departure)
- **TRIGGER**: User clicks "SEND MAIL" in the compose screen.
- **START STATE**: Compose form visible.
- **ACTION**: Form slides up and scales down as if being dropped into a slot or whisked away.
- **DURATION**: 0.6s.
- **PHYSICAL FEEL**: Swift departure.
- **END STATE**: Form disappears, routing back to Sent/Mailbox.
- **REDUCED MOTION**: Opacity fade to 0.

### 4. Page Transitions
- **TRIGGER**: Navigating between bottom tabs.
- **START STATE**: Current page.
- **ACTION**: Soft slide-in from bottom and fade-in for list items.
- **DURATION**: 0.4s stagger.
- **PHYSICAL FEEL**: Items slotting into a tray.
- **END STATE**: Fully visible list.
- **REDUCED MOTION**: Simple fade.
