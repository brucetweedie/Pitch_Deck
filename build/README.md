# Ribbon Unfurl — render harness

Animates the **approved** `../design/end-state.svg` into a 1920×1080 H.264 MP4:
nine music-licensing questions appear as amber ribbons that unfurl left→right and
**accumulate** on black. Drop-in for one PowerPoint slide (no audio).

This harness is **pure animation**. It reveals the ribbons that are already baked
into `end-state.svg`. It does **not** lay out, measure, or change any text.

## One-time setup

```sh
cd build
npm install
npx playwright install chromium
```

`ffmpeg` is provided by the `ffmpeg-static` npm package — no system install needed.

## Render

```sh
npm run render          # keeper -> out/ribbons.mp4   (1300 ms cadence)
npm run render:1700     # comparison -> out/ribbons-1700ms.mp4
```

Output: H.264, `yuv420p`, 1920×1080, 60fps, no audio.

## Re-render for TIMING

Edit the `CONFIG` block at the top of `render.mjs` (or pass CLI overrides) and run again:

```sh
node render.mjs --cadence 1700 --out out/ribbons-1700ms.mp4
```

| Flag        | Default | Meaning                                   |
|-------------|---------|-------------------------------------------|
| `--leadin`  | 400     | black hold (ms) before the first ribbon   |
| `--cadence` | 1300    | ms between successive ribbon **starts**   |
| `--unfurl`  | 340     | per-ribbon unfurl duration (ms)           |
| `--tail`    | 0       | hold on the full wall at the end (ms); 0 = stop on last ribbon |
| `--fps`     | 60      | frames per second                         |
| `--out`     | out/ribbons.mp4 | output path                       |

Easing is `cubic-bezier(0.16, 1, 0.3, 1)`, shared by the carpet reveal and the
roll/curl travel (per the build brief — the source of truth for motion).

## Re-render for WORDING — upstream, not here

To change a question, **do not** edit this harness. Re-run the sandbox generator
(`build_ribbons.py`) that produced `end-state.svg` — it re-measures rendered glyph
widths and re-sizes each ribbon — then re-approve the new `end-state.svg` and
re-render here.

## How it works

1. Loads `end-state.svg` inline so the embedded Inter woff2 and all `#ribbon-N`
   groups are in the DOM.
2. Reads each `.carpet` `x`/`width` to drive that ribbon's reveal and roll travel.
3. Steps a **deterministic clock** in fixed increments (no wall-clock); at each
   step it sets animation state and screenshots via Playwright (frame-accurate).
4. Pipes the PNG frames through `ffmpeg` to the final MP4. Temp frames are written
   to `.frames/` and deleted afterwards.
