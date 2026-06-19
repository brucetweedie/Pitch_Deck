# BUILD_BRIEF — Ribbon Unfurl render harness (for Claude Code)

**Audience: Claude Code on Bruce's Windows machine.** You own rendering. Consume CD's assets from `/design` and produce a 1920×1080 MP4. The motion spec below is the source of truth.

## Goal
Render an MP4 of music-licensing questions appearing as amber ribbons that unfurl left-to-right and **accumulate** on black. It's a drop-in for one PowerPoint slide — Bruce pastes it himself (delete-old / paste-new), so no audio, exact canvas, clean loop-out.

## Inputs (from CD, `/design`)
- `ribbon-kit.svg` — layered ribbon, named parts `#roll #carpet #curl #text #shadow`, grouped `#ribbon`, origin at left edge.
- `stage-frame.svg` — black stage.
- `end-state.svg` — final composition reference (sanity-check your last frame against it).
- `tokens.css` — brand values.

## Approach (recommended)
Headless-browser frame capture, for fidelity:
1. Build an HTML page that lays out the stage and instantiates one `#ribbon` per question from CD's kit, with the string injected into `#text`.
2. Animate in code: per ribbon, reveal `#carpet`+`#text` via a left→right `clip-path` inset, translate `#roll` along the leading edge, both on the **same** easing and duration; `#curl` rides with the roll.
3. Drive a **deterministic clock** — do not rely on wall-clock. Step time in fixed increments; at each step set animation state and screenshot (Playwright or Puppeteer). This guarantees frame-accurate, reproducible output.
4. Pipe PNG frames → ffmpeg → H.264 MP4, `yuv420p`, 1920×1080, 60fps.

If browser capture proves painful, render frames directly with a canvas/SVG lib headless — but browser capture is preferred for crisp Inter and correct easing.

## Motion spec (source of truth)
- Canvas 1920×1080, 60fps.
- Per-ribbon unfurl: **340 ms**, easing `cubic-bezier(0.16, 1, 0.3, 1)` (snap + slight overshoot). `#roll` translate and `#carpet` clip share this exactly.
- Cadence (gap between successive ribbon **starts**): **1000 ms** default. CONFIG.
- Mode: **accumulate** — ribbons persist after unfurling.
- Tail hold on the full wall: **2500 ms**.
- Total ≈ (N−1)×cadence + unfurl + tail. N=9 → ≈ 10.8 s.
- Optional polish (nice-to-have, not v1-blocking): a 1–2 px motion-blur smear on the carpet leading edge during unfurl; a one-frame settle/overshoot at the end of each unfurl.

## Dwell rationale (don't shorten cadence blindly)
On-screen comfortable reading ≈ 17 chars/sec; Bruce's audience ≈ 20–22 cps. Longest question ~35 chars → ~1.6–2.0 s to read in isolation. In **accumulate** mode the cadence can sit *below* per-line read time, because lines persist and are read as a growing block. 1000 ms reads as "hard and fast" while staying legible. For a calmer feel, raise cadence toward 1600–1900 ms.

## Config (top-of-file; no code-diving to change)
- `QUESTIONS` — ordered list of strings (seed below; Bruce finalises wording).
- `CADENCE_MS = 1000`
- `UNFURL_MS = 340`
- `TAIL_MS = 2500`
- `FPS = 60`
- Output: `/build/out/ribbons.mp4`

## Seed question list (Bruce to finalise)
1. Can we re-record our own version?
2. Can we change the lyrics?
3. What about User Generated Content?
4. Can we add an extra 15-second spot?
5. Does this cover social cut-downs?
6. What if we go global next year?
7. Can we use it in a sizzle reel?
8. Is TV and online one licence or two?
9. What about a sponsor's logo over it?

## Output
- `/build/out/ribbons.mp4` — H.264, `yuv420p`, 1920×1080, 60fps, **no audio**.
- Re-render = edit config, run one command. Document that command in `/build/README.md`.

## Out of scope
Visual/brand design — that's CD's `/design` assets. Don't restyle; consume.
