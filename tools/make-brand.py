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


def draw_wordmark(image: Image.Image, font: ImageFont.FreeTypeFont, text: str,
                  start_x: float, baseline_y: float, tracking: float, fill) -> float:
    draw = ImageDraw.Draw(image)
    x = start_x
    for c in text:
        draw.text((round(x), round(baseline_y)), c, font=font, fill=fill)
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
    baseline = margin + mark_h // 2 + em * 0.36
    draw_wordmark(canvas, font, wordmark, margin + mark_h + gap, baseline, tracking, ink)
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
        f'<text x="{tx:.1f}" y="{round(mh / 2)}" font-size="{round(mh * 0.34)}" '
        f'fill="{hexc(ink)}" letter-spacing="{round(tracking * scale, 1)}">'
        f'{wordmark}</text>'
    )
    parts.append("</svg>")
    return ("\n".join(parts) + "\n").encode("utf-8")


# --- Hero ---------------------------------------------------------------------

def hero_banner(ss: int = 2) -> Image.Image:
    w, h = 1600, 400
    base = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    mark = render_mark(300, ss=ss)
    base.alpha_composite(mark, (70 * ss, 50 * ss))
    font = load_wordmark_font(88 * ss)
    tracking = 88 * ss * 0.045
    draw_wordmark(base, font, "spagitty", 470 * ss, 150 * ss + 88 * ss * 0.36,
                  tracking, INK_LIGHT)
    tagline = load_wordmark_font(30 * ss)
    draw.text((round(470 * ss), round(285 * ss)), "a desktop Git client",
              font=tagline, fill=(143, 154, 183, 255))
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
    friendly = (238, 176, 77)           # #EEB04D dark accent
    accent_light = (151, 99, 23)        # #976317 light accent
    css = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
    css += "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
    css += "<title>Spagitty — brand</title><style>"
    css += """
body{font-family:system-ui,sans-serif;margin:0;background:#181825;color:#cdd6f4;
line-height:1.5}
header{padding:48px 64px;display:flex;align-items:center;gap:32px;border-bottom:1px
solid rgba(205,214,244,.15)}
header h1{margin:0;font-size:28px;font-weight:660;letter-spacing:1.5px}
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
.plate-light{background:#eff1f5;padding:24px;border-radius:12px}
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
        'alt="the author mark"><small>the mark · amber plate</small></div>',
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
        "<section><h2>Accent palette</h2>",
        _table("Dark (default)", [
            ("--accent", friendly, "links, active UI, on dark surfaces"),
            ("--warn", (243, 139, 168, 255), "--warn sits ~1.0–1.5:1 vs accent (accepted)"),
        ]),
        _table("Light", [
            ("--accent", accent_light, "links, active UI, on light surfaces"),
            ("--warn", (243, 139, 168, 255), "--warn ~1.09–1.35:1 vs accent (accepted)"),
        ]),
        "</section>",
        "<section><h2>Rules</h2>",
        "<output><h3>Always</h3><p><mark class=\"do\">DO</mark> use the "
        "generated art; keep the mark's amber plate and dark strands; put the "
        "mark on a panel or neutral ground.</p>"
        "<h3>Never</h3><p><mark class=\"donot\">NEVER</mark> the Git project's "
        "mark, logo, or orange; no shadows or gradients; no redrawing.</p>"
        "</output></section>",
        "<footer>Spagitty is GPL-3.0-or-later. The wordmark face, Inter, is SIL "
        "Open Font License 1.1 (<code>font/OFL.txt</code>). Full reference: "
        "<code>docs/branding.md</code>.</footer>",
        "</div></body></html>",
    ]
    return css + "".join(body) + "\n"


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
