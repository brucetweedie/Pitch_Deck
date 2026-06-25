// =============================================================================
// Ribbon Unfurl render harness
// -----------------------------------------------------------------------------
// Animates the APPROVED design/end-state.svg into a 1920x1080 H.264 MP4.
// This harness is PURE ANIMATION: it reveals the nine ribbons that are already
// baked into end-state.svg. It does NOT lay out, measure, or change any text.
// To change wording, re-run the upstream sandbox generator that produced
// end-state.svg, re-approve the new SVG, then re-render here. (See README.md.)
//
// Motion (per BUILD_BRIEF, source of truth):
//   - per ribbon: clip-reveal carpet+text L->R while the roll+curl ride the
//     leading edge, both on the SAME easing + duration
//   - mode: accumulate (ribbons persist once unfurled)
//   - deterministic clock: fixed time steps -> screenshot each frame
//   - PNG frames -> ffmpeg -> H.264 / yuv420p / 1920x1080 / 60fps / no audio
// =============================================================================

import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// CONFIG  (timing only — text is not config; it is baked into end-state.svg)
// Edit a value here and re-run `npm run render` to re-time the keeper.
// ---------------------------------------------------------------------------
const CONFIG = {
  LEAD_IN_MS: 400,    // black hold before the first ribbon starts (opening frame is black)
  CADENCE_MS: 1300,   // gap between successive ribbon STARTS
  UNFURL_MS:  340,    // per-ribbon unfurl duration
  TAIL_MS:    2500,   // hold on the full wall at the end
  FPS:        60,
  EASING:     [0.16, 1, 0.3, 1], // cubic-bezier — snap + slight overshoot
  OUT:        'out/ribbons.mp4',
  SVG:        '../design/end-state.svg',
};

// CLI overrides: --cadence 1700  --out out/foo.mp4  --unfurl 340  --tail 2500  --fps 60
const argv = process.argv.slice(2);
function flag(name) {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && i + 1 < argv.length ? argv[i + 1] : undefined;
}
if (flag('leadin')  !== undefined) CONFIG.LEAD_IN_MS = Number(flag('leadin'));
if (flag('cadence') !== undefined) CONFIG.CADENCE_MS = Number(flag('cadence'));
if (flag('unfurl')  !== undefined) CONFIG.UNFURL_MS  = Number(flag('unfurl'));
if (flag('tail')    !== undefined) CONFIG.TAIL_MS    = Number(flag('tail'));
if (flag('fps')     !== undefined) CONFIG.FPS        = Number(flag('fps'));
if (flag('out')     !== undefined) CONFIG.OUT        = flag('out');

const W = 1920, H = 1080;
const svgPath = resolve(__dirname, CONFIG.SVG);
const outPath = resolve(__dirname, CONFIG.OUT);
const framesDir = join(__dirname, '.frames');

// Temp artifacts this harness may create or leave behind. Swept internally via
// fs.rmSync (never via a shell `rm`), so a global rm-deny can't break a render.
const tempArtifacts = [
  framesDir,                       // per-frame PNG scratch dir (this script's own)
  join(__dirname, 'checkframes'),  // verification stills pulled out for review
  join(__dirname, 'measure.mjs'),  // one-off width-measurement script
];
function sweepTemp() {
  for (const p of tempArtifacts) rmSync(p, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// In-page animation code (runs inside headless Chromium, injected as a string).
// Grows carpet+shadow width and clips text to the revealed region; the roll and
// curl translate so their leading edge tracks the reveal. All driven by one
// eased progress value per ribbon, on the shared cubic-bezier easing.
// ---------------------------------------------------------------------------
const PAGE_SCRIPT = `
window.__bezier = function (p1x, p1y, p2x, p2y) {
  const cx = 3*p1x, bx = 3*(p2x-p1x)-cx, ax = 1-cx-bx;
  const cy = 3*p1y, by = 3*(p2y-p1y)-cy, ay = 1-cy-by;
  const sx = t => ((ax*t+bx)*t+cx)*t;
  const sy = t => ((ay*t+by)*t+cy)*t;
  const dx = t => (3*ax*t+2*bx)*t+cx;
  const solve = x => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x, d = dx(t);
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return t < 0 ? 0 : t > 1 ? 1 : t;
  };
  return x => (x <= 0 ? 0 : x >= 1 ? 1 : sy(solve(x)));
};

window.__setup = function (cfg) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.querySelector('svg');
  let defs = svg.querySelector('defs');
  if (!defs) { defs = document.createElementNS(NS, 'defs'); svg.insertBefore(defs, svg.firstChild); }
  const groups = Array.from(svg.querySelectorAll('g.ribbon'));
  const ribbons = groups.map((g, i) => {
    const carpet = g.querySelector('.carpet');
    const shadow = g.querySelector('.shadow');
    const text   = g.querySelector('.text');
    const curl   = g.querySelector('.curl');
    const roll   = g.querySelector('.roll');
    const x = parseFloat(carpet.getAttribute('x'));
    const y = parseFloat(carpet.getAttribute('y'));
    const w = parseFloat(carpet.getAttribute('width'));
    const h = parseFloat(carpet.getAttribute('height'));
    // clipPath so the question text reveals with the carpet, not before it
    const id = 'rclip-' + i;
    const cp = document.createElementNS(NS, 'clipPath');
    cp.setAttribute('id', id);
    cp.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('height', h); r.setAttribute('width', 0);
    cp.appendChild(r); defs.appendChild(cp);
    text.setAttribute('clip-path', 'url(#' + id + ')');
    g.setAttribute('opacity', '0'); // fully hidden until this ribbon's turn
    return { group: g, carpet, shadow, text, curl, roll, clipRect: r, x, w, start: cfg.LEAD_IN_MS + i * cfg.CADENCE_MS };
  });
  window.__cfg = cfg;
  window.__ribbons = ribbons;
  window.__ease = window.__bezier(cfg.EASING[0], cfg.EASING[1], cfg.EASING[2], cfg.EASING[3]);
  // park everything at reveal 0
  window.__frame(0);
};

window.__frame = function (t) {
  const cfg = window.__cfg, R = window.__ribbons, ease = window.__ease;
  for (const rb of R) {
    // hidden-until-turn: nothing (not even the roll) shows before this ribbon starts
    if (t < rb.start) { rb.group.setAttribute('opacity', '0'); continue; }
    rb.group.setAttribute('opacity', '1');
    let p = (t - rb.start) / cfg.UNFURL_MS;
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    const e = ease(p);
    const wv = rb.w * e;          // revealed width
    rb.carpet.setAttribute('width', wv);
    rb.shadow.setAttribute('width', wv);
    rb.clipRect.setAttribute('width', wv);
    const tx = -rb.w * (1 - e);   // roll+curl ride the leading edge
    rb.roll.setAttribute('transform', 'translate(' + tx + ',0)');
    rb.curl.setAttribute('transform', 'translate(' + tx + ',0)');
  }
};
`;

function buildHtml(svg) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#000;width:${W}px;height:${H}px;overflow:hidden}
svg{display:block}</style></head><body>${svg}<script>${PAGE_SCRIPT}</script></body></html>`;
}

function runFfmpeg(args) {
  return new Promise((res, rej) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('error', rej);
    p.on('close', code => (code === 0 ? res() : rej(new Error('ffmpeg exited ' + code))));
  });
}

async function main() {
  if (!existsSync(svgPath)) throw new Error('SVG not found: ' + svgPath);
  const svg = readFileSync(svgPath, 'utf8');

  const N = (svg.match(/class="ribbon"/g) || []).length;
  const total = CONFIG.LEAD_IN_MS + (N - 1) * CONFIG.CADENCE_MS + CONFIG.UNFURL_MS + CONFIG.TAIL_MS;
  const dt = 1000 / CONFIG.FPS;
  const nFrames = Math.round(total / 1000 * CONFIG.FPS) + 1; // inclusive of final wall

  console.log(`Ribbons: ${N}  Cadence: ${CONFIG.CADENCE_MS}ms  Total: ${(total/1000).toFixed(2)}s  Frames: ${nFrames}`);
  console.log(`Output : ${outPath}`);

  sweepTemp();                     // clear any leftover temp from a prior run
  mkdirSync(framesDir, { recursive: true });
  mkdirSync(dirname(outPath), { recursive: true });

  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(buildHtml(svg), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(cfg => window.__setup(cfg), CONFIG);

  for (let f = 0; f < nFrames; f++) {
    const t = Math.min(f * dt, total);
    await page.evaluate(tt => window.__frame(tt), t);
    const name = String(f).padStart(5, '0');
    await page.screenshot({ path: join(framesDir, `f_${name}.png`), clip: { x: 0, y: 0, width: W, height: H } });
    if (f % 60 === 0 || f === nFrames - 1) process.stdout.write(`\r  frame ${f + 1}/${nFrames}`);
  }
  process.stdout.write('\n');
  await browser.close();

  console.log('Encoding MP4...');
  await runFfmpeg([
    '-y',
    '-framerate', String(CONFIG.FPS),
    '-i', join(framesDir, 'f_%05d.png'),
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '16',
    '-pix_fmt', 'yuv420p',
    '-r', String(CONFIG.FPS),
    '-movflags', '+faststart',
    '-an',
    outPath,
  ]);

  sweepTemp();                     // remove all temp artifacts on completion
  console.log('Done: ' + outPath);
}

main().catch(err => { console.error(err); process.exit(1); });
