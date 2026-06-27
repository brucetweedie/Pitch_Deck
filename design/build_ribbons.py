import base64, io, os, urllib.request
from PIL import ImageFont
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options

# ---------------- self-bootstrap Inter SemiBold ----------------
# Reproducible from a clean sandbox: fetch the Inter variable font and
# instance a static SemiBold (wght=600, opsz=14). No external font install needed.
TTF = "fonts/Inter-SemiBold.ttf"
if not os.path.exists(TTF):
    os.makedirs("fonts", exist_ok=True)
    var = "fonts/InterVar.ttf"
    url = "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf"
    urllib.request.urlretrieve(url, var)
    from fontTools.varLib.instancer import instantiateVariableFont
    f = TTFont(var)
    instantiateVariableFont(f, {"wght": 600, "opsz": 14}, inplace=True)
    for rec in f["name"].names:
        if rec.nameID in (1, 16, 4): rec.string = "Inter SemiBold"
        if rec.nameID == 6:          rec.string = "Inter-SemiBold"
        if rec.nameID in (2, 17):    rec.string = "Regular"
    f.save(TTF)

# ---------------- PARAMETERS ----------------
W, H        = 1920, 1080
FONT_SIZE   = 46
RIBBON_H    = 88
TEXT_PAD_L  = 44      # left padding before text
GAP_TXT_ROLL= 40      # gap between text end and roll
ROLL_W      = 46
ROLL_OVER   = 7       # roll overhang above/below carpet
RADIUS      = 8
CASCADE     = 22      # rightward step per row
START_X     = 130
AMBER       = "#FDB525"
TEXT_COL    = "#000000"
CAL         = 1.15    # cairosvg/browser render Inter ~15% wider than PIL metrics

# locked v3 question set (8)
QUESTIONS = [
    "Can we re-record our own version?",
    "Are we able to change the lyrics?",
    "Can we add an extra spot, and cinema, and podcasts?",
    "Why not just use a song from the free TikTok library?",
    "Can we find a more recognisable song?",
    "What about User Generated Content & Influencer posts?",
    "Can you get the quoted price down?",
    "Would the artist be willing to appear in the campaign?",
]

# ---------------- measure real Inter widths ----------------
pil = ImageFont.truetype(TTF, FONT_SIZE)
def text_w(s): return pil.getlength(s) * CAL

# vertical layout
n = len(QUESTIONS)
gap = 22
pitch = RIBBON_H + gap
span = n*RIBBON_H + (n-1)*gap
top = (H - span)//2

# ---------------- subset + woff2 + base64 the font ----------------
chars = set("".join(QUESTIONS))
ft = TTFont(TTF)
opt = Options(); opt.flavor="woff2"; opt.desubroutinize=True
ss = Subsetter(options=opt)
ss.populate(text="".join(sorted(chars)))
ss.subset(ft)
buf = io.BytesIO(); ft.flavor="woff2"; ft.save(buf)
font_b64 = base64.b64encode(buf.getvalue()).decode()
FONT_FACE = ("@font-face{font-family:'Inter';font-weight:600;font-style:normal;"
             "src:url(data:font/woff2;base64,%s) format('woff2');}" % font_b64)

# ---------------- svg building ----------------
def defs():
    return f'''<defs>
  <style>{FONT_FACE}
    text{{font-family:'Inter',sans-serif;font-weight:600;}}</style>
  <linearGradient id="rollg" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0"   stop-color="#9a6206"/>
    <stop offset="0.30" stop-color="#f0ad2c"/>
    <stop offset="0.52" stop-color="#ffc24a"/>
    <stop offset="0.74" stop-color="#e09a18"/>
    <stop offset="1"   stop-color="#7e4f03"/>
  </linearGradient>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="160%">
    <feDropShadow dx="0" dy="7" stdDeviation="9" flood-color="#000000" flood-opacity="0.55"/>
  </filter>
</defs>'''

def ribbon(x, y, text, part_attr="class"):
    tw = text_w(text)
    carpet_w = TEXT_PAD_L + tw + GAP_TXT_ROLL + ROLL_W
    roll_x = x + carpet_w - ROLL_W
    cy = y + RIBBON_H/2
    a = part_attr
    return f'''<g {a}="ribbon" data-w="{carpet_w:.0f}">
  <rect {a}="shadow" x="{x}" y="{y}" width="{carpet_w:.1f}" height="{RIBBON_H}" rx="{RADIUS}" fill="{AMBER}" filter="url(#sh)"/>
  <rect {a}="carpet" x="{x}" y="{y}" width="{carpet_w:.1f}" height="{RIBBON_H}" rx="{RADIUS}" fill="{AMBER}"/>
  <rect {a}="curl" x="{roll_x-10:.1f}" y="{y}" width="14" height="{RIBBON_H}" fill="#d98e15"/>
  <text {a}="text" x="{x+TEXT_PAD_L}" y="{cy:.1f}" font-size="{FONT_SIZE}" fill="{TEXT_COL}" dominant-baseline="central">{text.replace("&","&amp;")}</text>
  <g {a}="roll">
    <rect x="{roll_x:.1f}" y="{y-ROLL_OVER}" width="{ROLL_W}" height="{RIBBON_H+2*ROLL_OVER}" rx="{ROLL_W/2:.0f}" fill="url(#rollg)" stroke="#6e4502" stroke-width="1"/>
    <ellipse cx="{roll_x+ROLL_W/2:.1f}" cy="{y-ROLL_OVER+6}" rx="{ROLL_W/2-3:.0f}" ry="5" fill="#caa23a" opacity="0.7"/>
  </g>
</g>'''

# end-state.svg (8 ribbons, parts as class, each wrapped in #ribbon-N)
rows=[]
for i,q in enumerate(QUESTIONS):
    x = START_X + i*CASCADE
    y = top + i*pitch
    rows.append(f'<g id="ribbon-{i+1}">\n{ribbon(x,y,q,"class")}\n</g>')
endsvg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
{defs()}
<rect width="{W}" height="{H}" fill="#000000"/>
{chr(10).join(rows)}
</svg>'''
open("end-state.svg","w").write(endsvg)

# diagnostics: right edge of each carpet must clear ~1860
edges=[]
for i,q in enumerate(QUESTIONS):
    x = START_X + i*CASCADE
    cw = TEXT_PAD_L + text_w(q) + GAP_TXT_ROLL + ROLL_W
    edges.append(round(x+cw))
print("carpet right edges:", edges)
print("max right edge:", max(edges), "(must be < ~1860)")
print("font woff2 subset bytes:", len(buf.getvalue()))
print("written: end-state.svg")
