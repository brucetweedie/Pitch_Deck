# ASSET_CONTRACT — Ribbon Unfurl screen (for Claude Design)

**Audience: Claude Design.** You own visual finish. Chat (orchestrator) owns motion/timing; Claude Code owns rendering. Deliver assets to the structure below so CC can animate the parts without rebuilding your artwork. This is the whole point of the three-way: if you flatten the ribbon, CC has to re-fake the motion and your work is wasted.

## The screen, in one line
A black slide on which music-licensing client questions appear one at a time as amber ribbons that unfurl left-to-right and **accumulate** into a wall — illustrating how complex licensing really is.

## Brand (non-negotiable)
- Amber `#FDB525` (PMS 1235 C) — primary ribbon fill
- Grey `#7F7F73` (PMS 416 C) — quiet accents only
- Black `#000000` — stage background
- White `#FFFFFF` — sparingly
- Type: **Inter only**. Question text Inter Medium or SemiBold. No other families.
- Aesthetic: minimalist, single focus, generous whitespace, calm confidence. The motion carries the energy; the artwork stays clean.

## Canvas
1920×1080, black. Design at full resolution.

## Critical structural rule
Do **not** deliver flattened ribbons. Deliver one reusable **ribbon kit** as layered SVG with named, separable parts so CC can transform each independently:
- `#roll` — the rolled bundle at the leading edge (reads as a rolled carpet/scroll; darker amber, subtle internal shading). CC translates this along the reveal edge.
- `#carpet` — the ribbon body (amber). CC reveals it via a left→right clip.
- `#curl` — the curled lip at the carpet's leading edge (slightly darker amber + a thin highlight to catch light). Sits just inside the roll; this is what sells the "unrolling" read.
- `#text` — a slot/group for the question string (separate layer; CC swaps the text and the clip reveals it with the carpet).
- `#shadow` — optional soft contact shadow beneath the ribbon for depth on black.
Group all as `#ribbon`, origin at the **left edge** (unroll start). Keep geometry parametric: the carpet should stretch to text width without distorting the roll or curl.

## Deliverables
1. `ribbon-kit.svg` — the layered named ribbon above; one ribbon, empty text slot.
2. `stage-frame.svg` — the black stage and any fixed chrome. Default: no heading, no footer — confirm with Bruce if you think otherwise.
3. `end-state.svg` (or PNG) — the **full accumulated wall** of ~9 ribbons as the look-approval target. This is the frame Bruce signs off.
4. `tokens.css` (or `.json`) — the brand values above as variables for CC to consume.

## Layout rules for the wall
- Left-aligned stack; ribbons sized to text + comfortable padding.
- Real whitespace between ribbons — not crammed. ~9 lines on 1080 should breathe.
- A disciplined horizontal stagger of start-x is fine for rhythm; no chaos.
- Mostly amber. A grey ribbon or two only if it earns rhythm — default all amber for cleanliness.

## Motion context you must design *for* (CC implements)
- Each ribbon unfurls L→R in ~0.34s with a snappy, slight-overshoot feel — a whip-out, not a ceremonial roll.
- Ribbons accumulate (persist), building the wall.
- The `#roll` rides the leading edge and ends at the ribbon's right end.
- Implication: the roll and curl must read correctly **mid-reveal at speed**, not only at rest. Keep them simple enough to register at 0.3s.

## Paths (proposed — match the CRM convention if it differs)
`/design/ribbon-kit.svg`, `/design/stage-frame.svg`, `/design/end-state.svg`, `/design/tokens.css`

## Out of scope for you
Timing, easing, frame rendering, the MP4 — all CC's, per `BUILD_BRIEF.md`.
