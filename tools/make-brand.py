#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Generate Spagitty's brand collateral from the one source mark.

Every asset below is derived from the same strand geometry that
`tools/make-icons.py` draws — the lockup is not a separate drawing but the same
mark composed with the wordmark, so the identity cannot drift into a second
version of the icon.

    assets/brand/
      brand-mark.png         the bare mark (no ground plate), dark set
      brand-mark-light.png   the bare mark, light set
      lockups/               wordmark lockups for dark and light surfaces (PNG + SVG)
      monogram.png           the single-strand S
      favicon/               favicon.ico + 16/32/64 PNGs
      hero.png               the README banner
      preview.html           the sweep page (open in a browser, per Amendment 4)
      font/Inter.ttf         the wordmark typeface (SIL OFL 1.1), committed so
                             generation is hermetic — no network fetch
    src-tauri/icons/
      menubar-mono.*         macOS menu bar template mark (alpha-only, 18/36)
      tray-black.*           monochrome mark for bright trays (22/44)
      tray-white.*           monochrome mark for dark trays (22/44)

Regenerate with:

    python3 tools/make-brand.py          # writes the collateral
    python3 tools/make-brand.py --check  # verifies the committed files match

Requires Pillow. The wordmark is set in Inter (SIL OFL 1.1); the UI itself runs
on the system font stack, so the brand font and the app font are independent.
"""

from __future__ import annotations

import argparse
import importlib.util
import io
import math
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

REPO = pathlib.Path(__file__).resolve().parent.parent
BRAND = REPO / "assets" / "brand"
ICONS = REPO / "src-tauri" / "icons"
FONT = BRAND / "font" / "Inter.ttf"

# The shared mark source lives in make-icons.py (the hyphen makes it unimportable
# as a module, so load it by path — this is the single source of the geometry).
_SOURCE = importlib.util.spec_from_file_location(
    "make_icons", REPO / "tools" / "make-icons.py")
make_icons = importlib.util.module_from_spec(_SOURCE)
_SOURCE.loader.exec_module(make_icons)

DARK = make_icons.DARK
LIGHT = make_icons.LIGHT
STRANDS = make_icons.STRANDS
WHEAT_WIDTH = make_icons.WHEAT_WIDTH
LANE_WIDTH = make_icons.LANE_WIDTH
NODE_R = make_icons.NODE_R
render_mark = make_icons.render_mark
strand_colour = make_icons.strand_colour
strand_points = make_icons.strand_points
stroke_mark = make_icons.stroke

INK_LIGHT = (214, 222, 244, 255)  # --ink in the dark theme
INK_DARK = (76, 79, 105, 255)  # --ink in the light theme


# --- The bare mark, on transparency ----------------------------------------

def render_bare_mark(px: int, theme: dict, ss: int = 2) -> Image.Image:
    """The three strands and their nodes, no ground plate — for lockups."""
    size = px * ss
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for center, role, phase, node_y, lane in reversed(STRANDS):
        width = WHEAT_WIDTH if role == "wheat" else LANE_WIDTH
        stroke_mark(draw, strand_points(center, phase, node_y),
                    strand_colour(theme, role, lane), width, size)
    for center, role, _, node_y, lane in STRANDS:
        colour = strand_colour(theme, role, lane)
        node(draw, center * size, node_y * size, colour, size)
    return image.resize((px, px), Image.LANCZOS)


def render_mono_mark(px: int, colour, ss: int = 6) -> Image.Image:
    """The strands and their nodes in one colour, on transparency."""
    size = px * ss
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for center, _, phase, node_y, _ in reversed(STRANDS):
        stroke_mark(draw, strand_points(center, phase, node_y), colour,
                    LANE_WIDTH + 0.008, size)
    for center, _, _, node_y, _ in STRANDS:
        dot(draw, center * size, node_y * size, colour, size)
    return image.resize((px, px), Image.LANCZOS)


def node(draw: ImageDraw.ImageDraw, cx: float, cy: float, colour, size: float) -> None:
    """Coloured node with a transparent ring (keeps lanes' ends crisp)."""
    r = NODE_R * size
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour)


def dot(draw: ImageDraw.ImageDraw, cx: float, cy: float, colour, size: float) -> None:
    r = NODE_R * size * 0.9
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour)


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
            values.append(760)
        else:
            values.append(_default)
    try:
        font.set_variation_by_axes(values)
    except Exception:
        pass
    return font


def wordmark_width(font: ImageFont.FreeTypeFont, text: str, tracking: float) -> int:
    return sum(font.getlength(c) for c in text) + tracking * (len(text) - 1)


def draw_wordmark(image: Image.Image, font: ImageFont.FreeTypeFont, text: str,
                  start_x: float, baseline_y: float, tracking: float, fill) -> float:
    draw = ImageDraw.Draw(image)
    x = start_x
    for c in text:
        draw.text((round(x), round(baseline_y)), c, font=font, fill=fill)
        x += font.getlength(c) + tracking
    return x


# --- Lockup ----------------------------------------------------------------

def compose_lockup(theme: dict, ink: tuple, wordmark: str = "spagitty") -> Image.Image:
    em = 110
    font = load_wordmark_font(em)
    tracking = em * 0.045
    tw = wordmark_width(font, wordmark, tracking)
    mark_h = round(em * 5.2)
    gap = round(em * 1.1)
    pad = round(em * 0.6)
    margin = round(em * 0.4)
    width = round(margin + mark_h + gap + tw + pad)
    height = round(mark_h + 2 * margin)
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    mark = render_bare_mark(mark_h, theme)
    canvas.alpha_composite(mark, (margin, margin))
    baseline = margin + mark_h // 2 + em * 0.36
    draw_wordmark(canvas, font, wordmark, margin + mark_h + gap, baseline, tracking, ink)
    return canvas


def lockup_svg_bytes(theme: dict, ink: tuple, view: int = 1200) -> bytes:
    """An SVG twin of the PNG lockup — same strand maths, plus <text>."""
    em = 110
    font = load_wordmark_font(em)
    tracking = em * 0.045
    tw = wordmark_width(font, "spagitty", tracking)
    mark_h = round(em * 5.2)
    gap = round(em * 1.1)
    margin = round(em * 0.4)
    scale = mark_h / view * 1.3
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" '
        'font-family="Inter, system-ui, sans-serif">'
    ]
    for center, role, phase, node_y, lane in reversed(STRANDS):
        colour = strand_colour(theme, role, lane)
        width = WHEAT_WIDTH if role == "wheat" else LANE_WIDTH
        pts = []
        for x, y in strand_points(center, phase, node_y, steps=80):
            pts.append(f"{x * view:.2f} {y * view * 0.9:.2f}")
        parts.append(
            f'<path d="M {" L ".join(pts)}" '
            f'stroke="rgb{colour[:3]}" stroke-width="{width * view:.2f}" '
            f'stroke-linecap="round" fill="none"/>'
        )
    for center, role, _, node_y, lane in STRANDS:
        colour = strand_colour(theme, role, lane)
        parts.append(
            f'<circle cx="{center * view:.2f}" cy="{node_y * view * 0.9:.2f}" '
            f'r="{NODE_R * view:.2f}" fill="rgb{colour[:3]}"/>'
        )
    parts.append(
        f'<text x="{view / 2:.0f}" y="205" font-size="150" fill="rgb{ink[:3]}" '
        f'letter-spacing="6">spagitty</text>'
    )
    parts.append("</svg>")
    return ("\n".join(parts) + "\n").encode("utf-8")


# --- Monogram ---------------------------------------------------------------

def monogram(px: int, colour, ss: int = 4) -> Image.Image:
    """The single-strand S: one full undulation, capped with a commit node."""
    size = px * ss
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    points = [
        (0.5 + 0.30 * math.sin(math.pi * (1 - 2 * t)), 0.10 + 0.80 * t)
        for t in [i / 200 for i in range(201)]
    ]
    stroke_mark(draw, points, colour, 0.16, size)
    dot(draw, 0.5 * size, 0.90 * size, colour, size)
    return image.resize((px, px), Image.LANCZOS)


# --- Hero -------------------------------------------------------------------

def hero_banner(ss: int = 2) -> Image.Image:
    w, h = 1600, 400
    base = Image.new("RGBA", (w * ss, h * ss), DARK["ground"])
    draw = ImageDraw.Draw(base)
    mark = render_mark(300, DARK, ss=ss)
    base.alpha_composite(mark, (70 * ss, 50 * ss))
    font = load_wordmark_font(88 * ss)
    tracking = 88 * ss * 0.045
    draw_wordmark(base, font, "spagitty", 470 * ss, 150 * ss + 88 * ss * 0.36,
                  tracking, INK_LIGHT)
    tagline = load_wordmark_font(30 * ss)
    draw.text((round(470 * ss), round(285 * ss)), "a desktop Git client",
              font=tagline, fill=DARK_FAINT)
    for i, lane_colour in enumerate(DARK["lanes"]):
        cx = (1380 + i * 60) * ss
        cw = 14 * ss
        draw.rounded_rectangle([cx, 100 * ss, cx + cw, 320 * ss],
                               radius=7 * ss, fill=(*lane_colour[:3], 55))
    return base.resize((w, h), Image.LANCZOS)


DARK_FAINT = (143, 154, 183, 255)


# --- The sweep page ---------------------------------------------------------
#
# A self-contained page that shows every asset against the real tokens, for the
# author's window-side sweep (Amendment 4) and for anyone browsing the brand.
# It is generated here, from the same constants, so the page and the artwork
# cannot disagree; opening assets/brand/preview.html in a browser is the sweep.

def hexc(colour: tuple) -> str:
    return "#{:02x}{:02x}{:02x}".format(*(c for c in colour[:3]))


def _table(theme: dict, ink: tuple, title: str) -> str:
    rows = [
        ("--panel", theme["ground"], "ground plate, app panels"),
        ("--lane-1", theme["lanes"][0], "first commit lane"),
        ("--lane-2", theme["lanes"][1], "second commit lane"),
        ("wheat", theme["wheat"], "the pasta strand"),
        ("--ink", ink, "wordmark colour"),
    ]
    text = [f"<h3>{title}</h3><table>"]
    for name, colour, use in rows:
        text.append(f"<tr><td><code>{name}</code></td>"
                    f'<td><span class="chip" style="background:{hexc(colour)}">'
                    f"<code>{hexc(colour)}</code></span></td><td>{use}</td></tr>")
    text.append("</table>")
    return "".join(text)


def brand_preview_html() -> str:
    css = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
    css += "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
    css += "<title>Spagitty — brand</title><style>"
    css += """
body{font-family:system-ui,sans-serif;margin:0;background:#181825;color:#cdd6f4;
line-height:1.5}
header{padding:48px 64px;display:flex;align-items:center;gap:32px;border-bottom:1px
solid rgba(205,214,244,.15)}
header h1{margin:0;font-size:28px;font-weight:760;letter-spacing:1.5px}
header p{margin:4px 0 0;color:#8f9ab7}
.wrap{max-width:1080px;margin:0 auto;padding:32px 64px 96px}
section{margin-top:48px}
h2{font-size:20px;border-bottom:1px solid rgba(205,214,244,.15);padding-bottom:8px}
h3{font-size:15px;margin:0 0 8px;color:#8f9ab7;font-weight:600}
.gallery{display:flex;align-items:flex-end;gap:24px;flex-wrap:wrap}
.tile{text-align:center}
.tile img{background:#181825;border:1px solid rgba(205,214,244,.12);border-radius:12px}
.tile small{display:block;color:#8f9ab7;margin-top:8px}
.plate-dark{background:#181825;padding:24px;border-radius:12px}
.plate-light{background:#e6e9ef;padding:24px;border-radius:12px}
.pair{display:flex;gap:32px;flex-wrap:wrap}
.pair>div{flex:1;min-width:280px}
table{border-collapse:collapse;width:100%;max-width:560px}
td{padding:8px 12px;border-bottom:1px solid rgba(205,214,244,.1);font-size:14px}
td code{color:#cdd6f4}
.chip{display:inline-flex;align-items:center;gap:8px;padding:2px 8px;border-radius:6px}
.hero-demo{overflow:hidden;border-radius:12px;border:1px solid rgba(205,214,244,.12)}
.hero-demo img{display:block;width:100%}
mark.donot{background:#f38ba8;color:#17060a;padding:0 4px;border-radius:3px}
mark.do{background:#2e7d1f;color:#f5fff5}
footer{margin:64px 0 0;color:#8f9ab7;font-size:13px}
.badges img{width:auto}
"""
    css += "</style></head><body>"
    body = [
        "<header>",
        '<img src="brand-mark.png" width="64" height="64" alt="Spagitty mark">',
        "<div><h1>spagitty</h1><p>the identity, at a glance — generated by "
        "<code>tools/make-brand.py</code></p></div></header>",
        '<div class="wrap">',
        "<section><h2>The mark</h2><div class='gallery'>",
        '<div class="tile plate-dark"><img src="brand-mark.png" width="256" '
        'alt="bare mark, dark set"><small>bare mark · dark</small></div>',
        '<div class="tile plate-light"><img src="brand-mark-light.png" '
        'width="256" alt="bare mark, light set"><small>bare mark · light</small></div>',
        '<div class="tile"><img src="monogram.png" width="196" alt="monogram">'
        "<small>the single-strand S</small></div>",
        '<div class="tile"><img src="../../src-tauri/icons/32x32.png" '
        'alt="app icon, 32"><small>app icon · 32</small></div>',
        '<div class="tile"><img src="../../src-tauri/icons/128x128.png" '
        'alt="app icon, 128"><small>app icon · 128</small></div>',
        '<div class="tile"><img src="../../src-tauri/icons/mark.svg" width="196" '
        'alt="vector source"><small>vector source</small></div>',
        "</div></section>",
        "<section><h2>Lockups</h2><div class=\"pair\">",
        '<div class="plate-dark"><img src="lockups/lockup-ink-light.png" '
        'style="max-width:100%" alt="lockup for dark surfaces"><small>for dark '
        "surfaces</small></div>",
        '<div class="plate-light"><img src="lockups/lockup-ink-dark.png" '
        'style="max-width:100%" alt="lockup for light surfaces"><small>for light '
        "surfaces</small></div>",
        "</div></section>",
        "<section><h2>Favicon</h2><div class=\"gallery\">",
        '<div class="tile"><img src="favicon/favicon-16.png" width="48" '
        'alt="favicon 16"><small>16</small></div>',
        '<div class="tile"><img src="favicon/favicon-32.png" width="48" '
        'alt="favicon 32"><small>32</small></div>',
        '<div class="tile"><img src="favicon/favicon-64.png" width="48" '
        'alt="favicon 64"><small>64</small></div>',
        "</div></section>",
        "<section><h2>Tray &amp; menubar</h2><div class=\"pair\">",
        '<div class="plate-dark"><img src="../../src-tauri/icons/tray-white.png" '
        'alt="tray white"><small>tray-white · dark tray</small></div>',
        '<div class="plate-light"><img src="../../src-tauri/icons/tray-black.png" '
        'alt="tray black"><small>tray-black · bright tray</small></div>',
        '<div><img src="../../src-tauri/icons/menubar-mono.png" alt="menubar mono">'
        "<small>menubar-mono · macOS template</small></div>",
        "</div></section>",
        '<section><h2>Hero — the README banner</h2>',
        '<div class="hero-demo"><img src="hero.png" alt="README hero"></div></section>',
        "<section><h2>Palette</h2>",
        _table(DARK, INK_LIGHT, "Dark (default)"),
        _table(LIGHT, INK_DARK, "Light"),
        "</section>",
        "<section><h2>Rules</h2>",
        "<output><h3>Always</h3><p><mark class=\"do\">DO</mark> use the "
        "generated art; keep the strands flat; put the mark on a panel or "
        "neutral ground.</p>"
        "<h3>Never</h3><p><mark class=\"donot\">NEVER</mark> the Git project's "
        "mark, logo, or orange; no shadows or gradients; no redrawing.</p>"
        "</output></section>",
        "<footer>Spagitty is GPL-3.0-or-later. The wordmark face, Inter, is SIL "
        "Open Font License 1.1 (<code>font/OFL.txt</code>). Full reference: "
        "<code>docs/branding.md</code>.</footer>",
        "</div></body></html>",
    ]
    return css + "".join(body) + "\n"

def png(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def build_all() -> dict:
    out = {}

    marque = render_bare_mark(512, DARK)
    marque_light = render_bare_mark(512, LIGHT)
    out["assets/brand/brand-mark.png"] = png(marque)
    out["assets/brand/brand-mark-light.png"] = png(marque_light)
    out["assets/brand/lockups/lockup-ink-light.png"] = png(
        compose_lockup(DARK, INK_LIGHT))
    out["assets/brand/lockups/lockup-ink-dark.png"] = png(
        compose_lockup(LIGHT, INK_DARK))
    out["assets/brand/lockups/lockup.svg"] = lockup_svg_bytes(DARK, INK_LIGHT)
    out["assets/brand/monogram.png"] = png(monogram(512, DARK["wheat"]))
    out["assets/brand/favicon/favicon-16.png"] = png(marque.resize((16, 16), Image.LANCZOS))
    out["assets/brand/favicon/favicon-32.png"] = png(marque.resize((32, 32), Image.LANCZOS))
    out["assets/brand/favicon/favicon-64.png"] = png(marque.resize((64, 64), Image.LANCZOS))
    ico = io.BytesIO()
    marque.resize((256, 256), Image.LANCZOS).save(ico, format="ICO",
                                                  sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    out["assets/brand/favicon/favicon.ico"] = ico.getvalue()
    out["assets/brand/hero.png"] = png(hero_banner())
    out["assets/brand/preview.html"] = brand_preview_html().encode("utf-8")

    mono = render_mono_mark(36, (0, 0, 0, 255))
    out["src-tauri/icons/menubar-mono@2x.png"] = png(mono)
    out["src-tauri/icons/menubar-mono.png"] = png(mono.resize((18, 18), Image.LANCZOS))
    white = render_mono_mark(44, (255, 255, 255, 255))
    out["src-tauri/icons/tray-white@2x.png"] = png(white)
    out["src-tauri/icons/tray-white.png"] = png(white.resize((22, 22), Image.LANCZOS))
    black = render_mono_mark(44, (20, 22, 28, 255))
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