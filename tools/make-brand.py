#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Generate Spagitty's brand collateral from the one source mark.

Every asset here is derived from the author's hand-drawn mark
(`assets/brand/mark.svg`) via `tools/make-icons.py` — the lockup is not a
separate drawing but the same plate-plus-strands mark composed with the
wordmark, so the identity cannot drift into a second version of the icon.

    assets/brand/
      brand-mark.png         the mark (amber plate, dark strands) on transparency
      lockups/               wordmark lockups for dark and light surfaces (PNG + SVG)
      favicon/               favicon.ico + 16/32/64 PNGs
      hero.png               the README banner
      preview.html           the sweep page (open in a browser, per Amendment 4)
      font/Inter.ttf         the wordmark typeface (SIL OFL 1.1), committed so
                             generation is hermetic — no network fetch
    src-tauri/icons/
      menubar-mono.*         macOS menu bar template mark (alpha-only, 18/36)
      tray-black.*           monochrome mark for bright trays (22/44)
      tray-white.*           monochrome mark for dark trays (22/44)

The tray and menubar marks are the strands alone — no plate — in a single
tone that adapts to the tray's colour, because a full amber plate would not
read at 18–22 px on a system slot.

Regenerate with:

    python3 tools/make-brand.py          # writes the collateral
    python3 tools/make-brand.py --check  # verifies the committed files match

Requires Pillow. The wordmark is set in Inter (SIL OFL 1.1); the UI itself
runs on the system font stack, so the brand font and the app font are
independent.
"""

from __future__ import annotations

import argparse
import importlib.util
import io
import pathlib
import re
import sys

from PIL import Image, ImageDraw, ImageFont

REPO = pathlib.Path(__file__).resolve().parent.parent
BRAND = REPO / "assets" / "brand"
ICONS = REPO / "src-tauri" / "icons"
FONT = BRAND / "font" / "Inter.ttf"

# The mark's viewBox proportions, shared with the renderer in make-icons.py.
VIEW_W, VIEW_H = 912.0, 953.0

# The shared mark source lives in make-icons.py (the hyphen makes it unimportable
# as a module, so load it by path — this is the single renderer of the geometry).
_SOURCE = importlib.util.spec_from_file_location(
    "make_icons", REPO / "tools" / "make-icons.py")
make_icons = importlib.util.module_from_spec(_SOURCE)
_SOURCE.loader.exec_module(make_icons)

render_mark = make_icons.render_mark
STRAND_COLOUR = make_icons.STRAND_COLOUR

# The wordmark inks: `ink_light` sits on dark surfaces, `ink_dark` on light ones.
INK_LIGHT = (214, 222, 244, 255)  # --ink in the dark theme
INK_DARK = STRAND_COLOUR          # the mark's own strand grey, reads on light panels

# The amber plate for the README hero background.
HERO_AMBER = (238, 176, 77, 255)


# --- Typography -------------------------------------------------------------

def load_wordmark_font(em: float) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(str(FONT), size=round(em))
    try:
        axes = {a[0]: (a[1], a[2], a[3]) for a in font.get_variation_axes()}
    except Exception:
        return font
    values = []
    for name, (lo, _default, hi) in axes.items():
        if name == "opsz":
            values.append(max(lo, min(hi, 48)))
        elif name == "wght":
            values.append(660)
        else:
            values.append(_default)
    try:
        font.set_variation_by_axes(values)
    except Exception:
        pass
    return font


def wordmark_width(font: ImageFont.FreeTypeFont, text: str, tracking: float) -> int:
    return sum(font.getlength(c) for c in text) + tracking * (len(text) - 1)


def wordmark_baseline(font: ImageFont.FreeTypeFont, text: str, center_y: float) -> float:
    """The baseline that puts the ink's optical centre on `center_y`.

    Pillow's default text origin is the top-left of the em box, not the
    baseline — treating a centreline as a baseline dropped the wordmark a full
    ascender below the mark. Anchor at the baseline and centre on the ink.
    """
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    _l, top, _r, bottom = probe.textbbox((0, 0), text, font=font, anchor="ls")
    return center_y - (top + bottom) / 2


def draw_wordmark(image: Image.Image, font: ImageFont.FreeTypeFont, text: str,
                  start_x: float, center_y: float, tracking: float, fill) -> float:
    draw = ImageDraw.Draw(image)
    baseline = wordmark_baseline(font, text, center_y)
    x = start_x
    for c in text:
        draw.text((round(x), round(baseline)), c, font=font, fill=fill, anchor="ls")
        x += font.getlength(c) + tracking
    return x


def hexc(colour: tuple) -> str:
    return "#{:02x}{:02x}{:02x}".format(*(c for c in colour[:3]))


def png(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


# --- The bare mark ----------------------------------------------------------

def render_bare_mark(px: int) -> Image.Image:
    """The mark (amber plate + dark strands) on transparency."""
    return render_mark(px)


# --- Lockup --------------------------------------------------------------

def compose_lockup(ink: tuple, wordmark: str = "spagitty") -> Image.Image:
    em = 110
    font = load_wordmark_font(em)
    tracking = em * 0.045
    tw = wordmark_width(font, wordmark, tracking)
    mark_h = round(em * 5.0)
    gap = round(em * 1.1)
    margin = round(em * 0.6)
    width = round(margin + mark_h + gap + tw + margin)
    height = round(mark_h + 2 * margin)
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    mark = render_bare_mark(mark_h)
    canvas.alpha_composite(mark, (margin, margin))
    # Shared optical centreline with the mark — brand guide §4.2.
    center_y = margin + mark_h / 2
    draw_wordmark(canvas, font, wordmark, margin + mark_h + gap, center_y, tracking, ink)
    return canvas


def lockup_svg_bytes(ink: tuple, wordmark: str = "spagitty", view: int = 1200) -> bytes:
    """An SVG twin of the PNG lockup: the vector mark inline plus <text>.

    The author's mark is embedded directly (its own rect + strand paths, not a
    re-draw and not a reference to another file), so the SVG is standalone.
    """
    em = 110
    font = load_wordmark_font(em)
    tracking = em * 0.045
    tw = wordmark_width(font, wordmark, tracking)
    mark_h = round(em * 5.0)
    gap = round(em * 1.1)
    margin = round(em * 0.6)
    total_w = margin + mark_h + gap + tw + margin
    scale = view / max(total_w, mark_h + 2 * margin)
    mh = mark_h * scale
    mw = VIEW_W / VIEW_H * mh
    # SVG <text> y is the baseline. Centre the ink on the mark the same way
    # the PNG lockup does, using the font's own bbox.
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    _l, top, _r, bottom = probe.textbbox((0, 0), wordmark, font=font, anchor="ls")
    mark_center = margin * scale + mh / 2
    text_y = mark_center - ((top + bottom) / 2) * scale

    mark_svg = (REPO / "assets" / "brand" / "mark.svg").read_text(encoding="utf-8")
    inner = re.sub(r'<\?xml[^>]*\?>', '', mark_svg)
    inner = re.sub(r'<svg[^>]*>', '', inner, count=1)
    inner = re.sub(r'</svg>\s*$', '', inner).strip()

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view} {round(mh + 2 * margin * scale)}" '
        f'font-family="Inter, system-ui, sans-serif">',
        f'<g transform="translate({margin * scale:.1f} {margin * scale:.1f}) '
        f'scale({mw / VIEW_W:.6f})">{inner}</g>',
    ]
    tx = (margin + mark_h + gap) * scale
    parts.append(
        f'<text x="{tx:.1f}" y="{text_y:.1f}" font-size="{round(em * scale)}" '
        f'fill="{hexc(ink)}" letter-spacing="{round(tracking * scale, 1)}">'
        f'{wordmark}</text>'
    )
    parts.append("</svg>")
    return ("\n".join(parts) + "\n").encode("utf-8")


# --- Hero ---------------------------------------------------------------------

def hero_banner(ss: int = 2) -> Image.Image:
    """README banner: mark + wordmark on one centreline, approved tagline under.

    The short descriptor used to sit where the wordmark should have been
    centred, which is how the name ended up a whole row below the plate.
    """
    w, h = 1600, 400
    canvas_w, canvas_h = w * ss, h * ss
    base = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)

    # Sizes are in supersampled canvas pixels; render_mark returns that many px.
    mark_px = 280 * ss
    mark_x = 72 * ss
    mark_y = round((canvas_h - mark_px) / 2) - 10 * ss
    base.alpha_composite(render_mark(mark_px, ss=ss), (mark_x, mark_y))

    word = "spagitty"
    em = 92 * ss
    font = load_wordmark_font(em)
    tracking = em * 0.045
    gap = round(em * 1.1)
    text_x = mark_x + mark_px + gap
    center_y = mark_y + mark_px / 2
    draw_wordmark(base, font, word, text_x, center_y, tracking, INK_LIGHT)

    # Approved tagline from docs/branding.md — under the wordmark, left-aligned
    # with it, not competing for the mark's centreline.
    tagline = "Untangle the work — yours, and your agents'."
    tag_font = load_wordmark_font(24 * ss)
    _l, top, _r, bottom = draw.textbbox((0, 0), word, font=font, anchor="ls")
    word_bottom = center_y - (top + bottom) / 2 + bottom
    tag_y = word_bottom + 16 * ss
    draw.text((round(text_x), round(tag_y)), tagline, font=tag_font,
              fill=(143, 154, 183, 255), anchor="lt")
    return base.resize((w, h), Image.LANCZOS)


# --- The sweep page ---------------------------------------------------------

def _table(title: str, rows: list) -> str:
    text = [f"<h3>{title}</h3><table>"]
    for name, colour, use in rows:
        text.append(f"<tr><td><code>{name}</code></td>"
                    f'<td><span class="chip" style="background:{hexc(colour)}">'
                    f"<code>{hexc(colour)}</code></span></td><td>{use}</td></tr>")
    text.append("</table>")
    return "".join(text)


def brand_preview_html() -> str:
    html = """<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Spagitty — Brand & Design System</title>
<style>
:root {
  --bg: #11111b;
  --surface-0: #181825;
  --surface-1: #1e1e2e;
  --surface-2: #242438;
  --border: rgba(205, 214, 244, 0.12);
  --border-active: rgba(238, 176, 77, 0.4);
  --text: #cdd6f4;
  --text-muted: #8f9ab7;
  --brand-amber: #eeb04d;
  --brand-ink: #454447;
  --accent: #eeb04d;
  --accent-on: #11111b;
  --success: #a6e3a1;
  --danger: #f38ba8;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --font: 'Inter', system-ui, -apple-system, sans-serif;
}

html[data-theme="light"] {
  --bg: #eff1f5;
  --surface-0: #e6e9ef;
  --surface-1: #dce0e8;
  --surface-2: #ccd0da;
  --border: rgba(69, 68, 71, 0.14);
  --border-active: rgba(151, 99, 23, 0.4);
  --text: #4c4f69;
  --text-muted: #6c6f85;
  --accent: #976317;
  --accent-on: #ffffff;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  transition: background 0.2s ease, color 0.2s ease;
}

/* Header */
header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(24, 24, 37, 0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
html[data-theme="light"] header {
  background: rgba(230, 233, 239, 0.85);
}

.brand-lead {
  display: flex;
  align-items: center;
  gap: 16px;
}
.brand-lead img {
  width: 40px;
  height: 40px;
}
.brand-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.045em;
  margin: 0;
  color: var(--text);
}
.brand-badge {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(238, 176, 77, 0.15);
  color: var(--brand-amber);
  border: 1px solid rgba(238, 176, 77, 0.3);
  border-radius: 999px;
  font-weight: 600;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.theme-toggle {
  background: var(--surface-1);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;
}
.theme-toggle:hover {
  border-color: var(--accent);
  background: var(--surface-2);
}

/* Layout */
.container {
  max-width: 1160px;
  margin: 0 auto;
  padding: 40px 32px 120px;
}

section {
  margin-top: 56px;
}

.section-header {
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
}
.section-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.section-desc {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--text-muted);
}

/* Cards & Grids */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.card {
  background: var(--surface-0);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.card:hover {
  border-color: var(--border-active);
}

/* Hero Banner Container */
.hero-container {
  background: var(--surface-0);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
}
.hero-container img {
  display: block;
  width: 100%;
  height: auto;
}

/* Mark showcase */
.mark-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--surface-1);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  position: relative;
}
.mark-display img {
  max-width: 240px;
  height: auto;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
}
.mark-tag {
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}

/* Lockups */
.lockup-panel {
  border-radius: var(--radius-md);
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  position: relative;
}
.lockup-panel.dark {
  background: #181825;
  border: 1px solid rgba(205, 214, 244, 0.15);
}
.lockup-panel.light {
  background: #eff1f5;
  border: 1px solid rgba(69, 68, 71, 0.15);
}
.lockup-panel img {
  max-width: 100%;
  height: auto;
}

/* Clearspace box */
.clearspace-box {
  position: relative;
  border: 2px dashed rgba(238, 176, 77, 0.4);
  padding: 32px;
  border-radius: 8px;
  background: rgba(238, 176, 77, 0.03);
}
.clearspace-label {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 11px;
  color: var(--brand-amber);
  font-weight: 700;
  letter-spacing: 0.05em;
}

/* Swatches */
.swatch-card {
  background: var(--surface-0);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
}
.swatch-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}
.swatch-preview {
  height: 72px;
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.swatch-title {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.swatch-meta {
  font-family: monospace;
  font-size: 13px;
  color: var(--text-muted);
  display: flex;
  justify-content: space-between;
}
.badge-contrast {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(166, 227, 161, 0.2);
  color: var(--success);
}

/* Platform Mockups */
.mockup-bar {
  border-radius: var(--radius-md);
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
.mockup-bar.macos-dark {
  background: #1e1e2e;
  color: #cdd6f4;
  border: 1px solid rgba(255,255,255,0.1);
}
.mockup-bar.macos-light {
  background: #f5f5f7;
  color: #1d1d1f;
  border: 1px solid rgba(0,0,0,0.1);
}
.mockup-tray {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* App Icons Matrix */
.icon-matrix {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  flex-wrap: wrap;
  background: var(--surface-0);
  padding: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}
.icon-cell {
  text-align: center;
}
.icon-cell img {
  border-radius: 8px;
  background: var(--surface-1);
  border: 1px solid var(--border);
}
.icon-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
  font-weight: 600;
}

/* Do and Don't cards */
.rules-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 768px) {
  .rules-grid { grid-template-columns: 1fr; }
}
.rule-card {
  border-radius: var(--radius-md);
  padding: 24px;
  border: 1px solid var(--border);
}
.rule-card.do {
  background: rgba(166, 227, 161, 0.05);
  border-color: rgba(166, 227, 161, 0.3);
}
.rule-card.dont {
  background: rgba(243, 139, 168, 0.05);
  border-color: rgba(243, 139, 168, 0.3);
}
.rule-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 12px;
  margin-bottom: 12px;
}
.rule-tag.do { background: #2e7d1f; color: #ffffff; }
.rule-tag.dont { background: #c53030; color: #ffffff; }

/* Toast */
#toast {
  position: fixed;
  bottom: 32px;
  right: 32px;
  background: var(--accent);
  color: var(--accent-on);
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
  z-index: 999;
}
#toast.show {
  opacity: 1;
  transform: translateY(0);
}

footer {
  margin-top: 96px;
  border-top: 1px solid var(--border);
  padding-top: 32px;
  font-size: 13px;
  color: var(--text-muted);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}
</style>
</head>
<body>

<header>
  <div class="brand-lead">
    <img src="brand-mark.png" alt="Spagitty mark">
    <h1 class="brand-title">spagitty</h1>
    <span class="brand-badge">Brand Authority</span>
  </div>
  <div class="nav-actions">
    <button class="theme-toggle" onclick="toggleTheme()">
      <span id="theme-icon">☀️</span> <span id="theme-label">Switch Theme</span>
    </button>
  </div>
</header>

<div class="container">

  <!-- Hero Showcase -->
  <div class="hero-container">
    <img src="hero.png" alt="Spagitty README Hero Banner">
  </div>

  <!-- 1. The Mark -->
  <section id="mark">
    <div class="section-header">
      <div>
        <h2 class="section-title">The Mark</h2>
        <p class="section-desc">The author's hand-drawn amber plate and four dark strands. Settled vector truth.</p>
      </div>
    </div>
    <div class="card-grid">
      <div class="mark-display">
        <img src="brand-mark.png" alt="Spagitty bare mark">
        <span class="mark-tag">512 × 512 Raster Master</span>
      </div>
      <div class="card">
        <h3 style="margin-top:0">Anatomy &amp; Metaphor</h3>
        <p>A repository without structured histories is a plate of tangled pasta. Spagitty straightens the pasta bowl into clear, reliable strands of intent.</p>
        <ul style="padding-left:20px; font-size:14px;">
          <li><strong>Amber Plate (<code>#EEB04D</code>):</strong> Rounded base ground plate.</li>
          <li><strong>Four Strands (<code>#454447</code>):</strong> Tangled at top, flowing straight down.</li>
          <li><strong>Strict Flat Design:</strong> No gradients, shadows, or redrawing.</li>
        </ul>
        <button class="theme-toggle" style="margin-top:12px;" onclick="copyCode('assets/brand/mark.svg')">Copy SVG Source Path</button>
      </div>
    </div>
  </section>

  <!-- 2. Lockups & Clearspace -->
  <section id="lockups">
    <div class="section-header">
      <div>
        <h2 class="section-title">Lockups &amp; Clearspace</h2>
        <p class="section-desc">Mark paired with the Inter lowercase wordmark along the optical center.</p>
      </div>
    </div>
    <div class="card-grid">
      <div class="lockup-panel dark">
        <div class="clearspace-box">
          <span class="clearspace-label">1X SAFETY ZONE</span>
          <img src="lockups/lockup-ink-light.png" alt="Lockup for dark surfaces">
        </div>
        <span class="mark-tag">Dark Surface Lockup (<code>#CDD6F4</code> ink)</span>
      </div>
      <div class="lockup-panel light">
        <div class="clearspace-box">
          <span class="clearspace-label">1X SAFETY ZONE</span>
          <img src="lockups/lockup-ink-dark.png" alt="Lockup for light surfaces">
        </div>
        <span class="mark-tag">Light Surface Lockup (<code>#454447</code> ink)</span>
      </div>
    </div>
  </section>

  <!-- 3. Color Tokens -->
  <section id="colors">
    <div class="section-header">
      <div>
        <h2 class="section-title">Color System &amp; Design Tokens</h2>
        <p class="section-desc">Click any swatch to copy its HEX or CSS variable to clipboard.</p>
      </div>
    </div>
    <div class="card-grid">
      <div class="swatch-card" onclick="copyToken('--brand-amber', '#EEB04D')">
        <div class="swatch-preview" style="background:#EEB04D;"></div>
        <div class="swatch-title">Brand Amber <span class="badge-contrast">AAA Pass</span></div>
        <div class="swatch-meta"><span>--brand-amber</span><span>#EEB04D</span></div>
      </div>
      <div class="swatch-card" onclick="copyToken('--brand-ink', '#454447')">
        <div class="swatch-preview" style="background:#454447;"></div>
        <div class="swatch-title">Strand Charcoal <span class="badge-contrast">Core</span></div>
        <div class="swatch-meta"><span>--brand-ink</span><span>#454447</span></div>
      </div>
      <div class="swatch-card" onclick="copyToken('--accent-dark', '#EEB04D')">
        <div class="swatch-preview" style="background:#EEB04D;"></div>
        <div class="swatch-title">Dark Accent <span class="badge-contrast">>7:1 AAA</span></div>
        <div class="swatch-meta"><span>var(--accent)</span><span>#EEB04D</span></div>
      </div>
      <div class="swatch-card" onclick="copyToken('--accent-light', '#976317')">
        <div class="swatch-preview" style="background:#976317;"></div>
        <div class="swatch-title">Light Accent <span class="badge-contrast">4.6:1 AA</span></div>
        <div class="swatch-meta"><span>var(--accent)</span><span>#976317</span></div>
      </div>
    </div>
  </section>

  <!-- 4. System Tray & Menu Bar Simulator -->
  <section id="tray">
    <div class="section-header">
      <div>
        <h2 class="section-title">System Tray &amp; Menu Bar Simulation</h2>
        <p class="section-desc">Monochrome template and high-contrast tray icons on live OS bars.</p>
      </div>
    </div>
    <div class="mockup-bar macos-dark">
      <div style="display:flex; align-items:center; gap:16px;">
        <strong></strong> <span>Spagitty</span> <span>File</span> <span>Edit</span> <span>Repository</span> <span>Branch</span>
      </div>
      <div class="mockup-tray">
        <img src="../../src-tauri/icons/menubar-mono.png" alt="macOS menubar" style="filter:invert(1);">
        <span>100%</span> <span>Mon 20:30</span>
      </div>
    </div>
    <div class="mockup-bar macos-light">
      <div style="display:flex; align-items:center; gap:16px;">
        <strong></strong> <span>Spagitty</span> <span>File</span> <span>Edit</span> <span>Repository</span> <span>Branch</span>
      </div>
      <div class="mockup-tray">
        <img src="../../src-tauri/icons/menubar-mono.png" alt="macOS menubar">
        <span>100%</span> <span>Mon 20:30</span>
      </div>
    </div>
    <div class="card-grid" style="margin-top:16px;">
      <div class="card" style="display:flex; align-items:center; gap:16px;">
        <img src="../../src-tauri/icons/tray-white.png" style="background:#181825; padding:8px; border-radius:6px;" alt="tray white">
        <div><strong>Dark Tray (<code>tray-white.png</code>)</strong><br><small style="color:var(--text-muted)">Windows &amp; Linux dark taskbars (22×22)</small></div>
      </div>
      <div class="card" style="display:flex; align-items:center; gap:16px;">
        <img src="../../src-tauri/icons/tray-black.png" style="background:#eff1f5; padding:8px; border-radius:6px;" alt="tray black">
        <div><strong>Light Tray (<code>tray-black.png</code>)</strong><br><small style="color:var(--text-muted)">Windows &amp; Linux bright taskbars (22×22)</small></div>
      </div>
    </div>
  </section>

  <!-- 5. App Icon Matrix -->
  <section id="icons">
    <div class="section-header">
      <div>
        <h2 class="section-title">Application Icon Matrix</h2>
        <p class="section-desc">Pixel-perfect downscaling from 512px down to 16px favicon.</p>
      </div>
    </div>
    <div class="icon-matrix">
      <div class="icon-cell"><img src="../../src-tauri/icons/16x16.png" width="16" height="16" alt="16x16"><div class="icon-label">16px</div></div>
      <div class="icon-cell"><img src="../../src-tauri/icons/32x32.png" width="32" height="32" alt="32x32"><div class="icon-label">32px</div></div>
      <div class="icon-cell"><img src="favicon/favicon-64.png" width="64" height="64" alt="64x64"><div class="icon-label">64px</div></div>
      <div class="icon-cell"><img src="../../src-tauri/icons/128x128.png" width="96" height="96" alt="128x128"><div class="icon-label">128px</div></div>
      <div class="icon-cell"><img src="../../src-tauri/icons/256x256.png" width="128" height="128" alt="256x256"><div class="icon-label">256px</div></div>
      <div class="icon-cell"><img src="../../src-tauri/icons/512x512.png" width="160" height="160" alt="512x512"><div class="icon-label">512px</div></div>
    </div>
  </section>

  <!-- 6. Do's and Don'ts -->
  <section id="rules">
    <div class="section-header">
      <div>
        <h2 class="section-title">Brand Rules &amp; Agent Directives</h2>
        <p class="section-desc">Strict invariants governing brand implementation across the client and web.</p>
      </div>
    </div>
    <div class="rules-grid">
      <div class="rule-card do">
        <span class="rule-tag do">DO</span>
        <ul style="padding-left:20px; font-size:14px; margin:0;">
          <li>Always use the master vector <code>assets/brand/mark.svg</code>.</li>
          <li>Always use semantic CSS variables (<code>var(--accent)</code>) in UI code.</li>
          <li>Preserve the 1X clearspace perimeter on all four margins.</li>
          <li>Use monochrome template strands for macOS menu bar integrations.</li>
        </ul>
      </div>
      <div class="rule-card dont">
        <span class="rule-tag dont">NEVER</span>
        <ul style="padding-left:20px; font-size:14px; margin:0;">
          <li><strong>NEVER</strong> borrow or display the Git diamond logo or Git orange (<code>#F05133</code>).</li>
          <li><strong>NEVER</strong> apply drop shadows, 3D embossing, or gradients to brand assets.</li>
          <li><strong>NEVER</strong> redraw or approximate the mark with procedural noodles.</li>
          <li><strong>NEVER</strong> place the mark on busy, low-contrast photographic backgrounds.</li>
        </ul>
      </div>
    </div>
  </section>

  <footer>
    <div>
      Spagitty is licensed under <strong>GPL-3.0-or-later</strong>. Inter typeface is <strong>SIL OFL 1.1</strong>.
    </div>
    <div>
      Authoritative reference: <code>docs/branding.md</code>
    </div>
  </footer>

</div>

<div id="toast">Copied to clipboard!</div>

<script>
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  document.getElementById('theme-icon').textContent = next === 'dark' ? '☀️' : '🌙';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function copyToken(token, hex) {
  navigator.clipboard.writeText(hex);
  showToast(`Copied ${token}: ${hex}`);
}

function copyCode(text) {
  navigator.clipboard.writeText(text);
  showToast(`Copied: ${text}`);
}
</script>
</body>
</html>
"""
    return html


def build_all() -> dict:
    out = {}

    marque = render_bare_mark(512)
    out["assets/brand/brand-mark.png"] = png(marque)
    out["assets/brand/lockups/lockup-ink-light.png"] = png(compose_lockup(INK_LIGHT))
    out["assets/brand/lockups/lockup-ink-dark.png"] = png(compose_lockup(INK_DARK))
    out["assets/brand/lockups/lockup.svg"] = lockup_svg_bytes(INK_LIGHT)
    out["assets/brand/favicon/favicon-16.png"] = png(marque.resize((16, 16), Image.LANCZOS))
    out["assets/brand/favicon/favicon-32.png"] = png(marque.resize((32, 32), Image.LANCZOS))
    out["assets/brand/favicon/favicon-64.png"] = png(marque.resize((64, 64), Image.LANCZOS))
    ico = io.BytesIO()
    marque.resize((256, 256), Image.LANCZOS).save(ico, format="ICO",
                                                  sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    out["assets/brand/favicon/favicon.ico"] = ico.getvalue()
    out["assets/brand/hero.png"] = png(hero_banner())
    out["assets/brand/preview.html"] = brand_preview_html().encode("utf-8")

    mono = render_mark(36, strands_only=True, colour=(0, 0, 0, 255))
    out["src-tauri/icons/menubar-mono@2x.png"] = png(mono)
    out["src-tauri/icons/menubar-mono.png"] = png(mono.resize((18, 18), Image.LANCZOS))
    white = render_mark(44, strands_only=True, colour=(255, 255, 255, 255))
    out["src-tauri/icons/tray-white@2x.png"] = png(white)
    out["src-tauri/icons/tray-white.png"] = png(white.resize((22, 22), Image.LANCZOS))
    black = render_mark(44, strands_only=True, colour=(20, 22, 28, 255))
    out["src-tauri/icons/tray-black@2x.png"] = png(black)
    out["src-tauri/icons/tray-black.png"] = png(black.resize((22, 22), Image.LANCZOS))
    return out


def main(argv) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)

    output = build_all()
    if args.check:
        drift = []
        for rel, data in output.items():
            target = REPO / rel
            if not target.exists() or target.read_bytes() != data:
                drift.append(f"{rel}: differs from the committed file")
        if drift:
            print("drift in the brand collateral:")
            for line in drift:
                print(f"  {line}")
            print("run `python3 tools/make-brand.py` and commit the result")
            return 1
        print("brand collateral matches the committed sources")
        return 0

    for rel, data in output.items():
        target = REPO / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        print(f"  {rel}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
