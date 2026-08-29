#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Generate Spagitty's application icon set from the author's vector mark.

The source of the identity is the author's own hand-drawn mark,
`assets/brand/mark.svg` — an amber plate (`#EEB04D`) on a 912x953 viewBox with
four dark strands (`#454447`) that tangle at the top and straighten into
commit lanes toward the bottom. That file is copied into the tree verbatim and
is the only geometry this module reads; nothing here re-draws the mark, so the
icon cannot drift from the drawing the author approved.

The mark's plate is 912x953, i.e. almost square. On a square app-icon canvas
the whole plate fits with `xMidYMid meet`, centered horizontally with a thin
frame of transparent padding. The full mark (plate + strands) is the app icon;
the strands alone (no plate) feed the tray/menubar marks in `tools/make-brand.py`.

Rendering is Pillow-only. The strand paths use the SVG default nonzero winding
rule; Pillow's own `ImageDraw.polygon` fills even-odd and would punch holes
where the hand-drawn outlines cross themselves, so a scanline fill that applies
the winding rule directly is used instead. Output is supersampled then
downscaled with LANCZOS, which makes regeneration byte-deterministic — the
`--check` mode recomputes every committed file in memory and diffs the bytes.

Requires Pillow (gate 2 already installs it). Everything this writes lands in
`src-tauri/icons/`.
"""

from __future__ import annotations

import io
import math
import pathlib
import re
import sys

from PIL import Image, ImageDraw

REPO = pathlib.Path(__file__).resolve().parent.parent
ICON_DIR = REPO / "src-tauri" / "icons"
MARK = REPO / "assets" / "brand" / "mark.svg"

# Geometry of the mark's viewBox; drawing constants are read from the SVG, so
# these only describe how the viewBox maps onto a square canvas.
VIEW_W, VIEW_H = 912.0, 953.0
STRAND_COLOUR = (69, 68, 71, 255)  # #454447 from the <g fill>
PLATE_COLOUR = (238, 176, 77, 255)  # #EEB04D (fallback; preferred from the SVG)

# Rasterising parameters. Supersample `ss` then LANCZOS-downscale; each cubic
# is subdivided into `steps` straight segments. These settle the trade between
# fidelity and determinism and are validated against librsvg at native size.
SS = 8
STEPS = 8

SVG_CACHE = {"text": None}


def svg_text() -> str:
    if SVG_CACHE["text"] is None:
        SVG_CACHE["text"] = MARK.read_text(encoding="utf-8")
    return SVG_CACHE["text"]


def parse_svg_paths(svg: str) -> list[list[tuple[str, list[float]]]]:
    """Parse every @d=... attribute into a list of (command, [nums]) streams."""
    out = []
    for d in re.findall(r'd="([^"]+)"', svg):
        tokens = re.findall(r'([A-Za-z])|([-+]?\d*\.?\d+)', d)
        cmds, nums = [], []
        for kind, val in tokens:
            if kind:
                nums = []
                cmds.append((kind, nums))
            else:
                nums.append(float(val))
        out.append(cmds)
    return out


def parse_svg_rect(svg: str) -> dict:
    m = re.search(r'<rect\s([^>]+)/>', svg)
    if not m:
        return {}
    attrs = {}
    for k, v in re.findall(r'(\w[\w-]*)="([^"]*)"', m.group(1)):
        try:
            attrs[k] = float(v)
        except ValueError:
            attrs[k] = v
    return attrs


def _cubic_flatten(points: list[tuple[float, float]], steps: int) -> list:
    out = [points[0]]
    i = 1
    while i + 2 < len(points):
        p0, p1, p2, p3 = points[i - 1], points[i], points[i + 1], points[i + 2]
        for j in range(1, steps + 1):
            t = j / steps
            u = 1 - t
            x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
            y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
            out.append((x, y))
        i += 3
    return out


def flatten_cmds(cmds: list[tuple[str, list[float]]], steps: int) -> list[list[tuple[float, float]]]:
    """Turn an M/C/Z command stream into closed polygons (one per subpath)."""
    polygons = []
    cur: list[tuple[float, float]] = []
    cx, cy, sx, sy = 0.0, 0.0, 0.0, 0.0
    for cmd, nums in cmds:
        if cmd == "M":
            if cur:
                polygons.append(cur)
            cx, cy = nums[0], nums[1]
            sx, sy = cx, cy
            cur = [(cx, cy)]
        elif cmd == "C":
            i = 0
            while i + 5 < len(nums):
                cp1 = (nums[i], nums[i + 1])
                cp2 = (nums[i + 2], nums[i + 3])
                end = (nums[i + 4], nums[i + 5])
                seg = [(cx, cy), cp1, cp2, end]
                cur.extend(_cubic_flatten(seg, steps)[1:])
                cx, cy = end
                i += 6
        elif cmd == "Z":
            if cur and cur[-1] != cur[0]:
                cur.append(cur[0])
            if cur:
                polygons.append(cur)
            cur = []
            cx, cy = sx, sy
    if cur:
        polygons.append(cur)
    return polygons


def fill_polygon_nz(image: Image.Image, poly: list[tuple[float, float]],
                    fill: tuple[int, int, int, int]) -> None:
    """Scanline-fill `poly` with the SVG nonzero winding rule.

    Pillow's `polygon` is even-odd. The author's strands self-cross, and on the
    folds even-odd would cut holes where nonzero keeps the ink solid. This does
    a per-row sweep over the polygon's edges, drawing a span whenever the
    running winding number is nonzero — the same rule librsvg applies.
    """
    n = len(poly)
    if n < 3:
        return
    draw = ImageDraw.Draw(image)
    height = image.height
    buckets: dict[int, list[tuple[float, int]]] = {}
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if y1 == y2:
            continue
        if y2 > y1:
            y_lo, y_hi, wind = y1, y2, 1
        else:
            y_lo, y_hi, wind = y2, y1, -1
        lo, hi = int(y_lo), int(y_hi)
        if hi <= lo or hi < 0 or lo >= height:
            continue
        dx = (x2 - x1) / (y2 - y1)
        for yy in range(max(lo, 0), min(hi, height)):
            x = x1 + (yy + 0.5 - y1) * dx
            buckets.setdefault(yy, []).append((x, wind))
    for yy in range(height):
        hits = buckets.get(yy)
        if not hits:
            continue
        hits.sort(key=lambda t: t[0])
        winding, prev_x = 0, None
        for x, w in hits:
            if winding != 0 and prev_x is not None:
                x0, x1 = int(prev_x), int(x)
                if x1 >= x0:
                    draw.line((x0, yy, x1, yy), fill=fill)
            winding += w
            prev_x = x


def _hex_fill(value) -> tuple[int, int, int, int]:
    if isinstance(value, str) and value.startswith("#") and len(value) == 7:
        return (int(value[1:3], 16), int(value[3:5], 16), int(value[5:7], 16), 255)
    return PLATE_COLOUR


def _render_raw(px: int, strands_only: bool = False, colour: tuple = None,
                ss: int = SS, steps: int = STEPS) -> Image.Image:
    """Render the mark at px*ss, centered by xMidYMid meet on a square canvas."""
    svg = svg_text()
    rect = parse_svg_rect(svg)
    canvas = max(VIEW_W, VIEW_H)
    scale = px * ss / canvas
    xoff = (canvas - VIEW_W) / 2 * scale
    size = px * ss
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    if not strands_only:
        draw = ImageDraw.Draw(image)
        plate = _hex_fill(rect.get("fill")) if rect else PLATE_COLOUR
        x, y = xoff + rect.get("x", 0) * scale, rect.get("y", 0) * scale
        w, h = rect.get("width", 0) * scale, rect.get("height", 0) * scale
        rad = rect.get("rx", 0) * scale
        draw.rounded_rectangle([x, y, x + w, y + h], radius=rad, fill=plate)

    strand_fill = colour if colour is not None else STRAND_COLOUR
    for cmds in parse_svg_paths(svg):
        for poly in flatten_cmds(cmds, steps=steps):
            scaled = [(xoff + px_ * scale, py * scale) for px_, py in poly]
            fill_polygon_nz(image, scaled, strand_fill)
    return image


def render_mark(px: int, strands_only: bool = False, colour: tuple = None,
                ss: int = SS, steps: int = STEPS) -> Image.Image:
    """The mark as an RGBA image of `px` x `px` (full plate unless strands_only)."""
    raw = _render_raw(px, strands_only=strands_only, colour=colour, ss=ss, steps=steps)
    return raw.resize((px, px), Image.LANCZOS) if ss > 1 else raw


def _io(image: Image.Image, fmt: str, **kwargs) -> bytes:
    buf = io.BytesIO()
    image.save(buf, format=fmt, **kwargs)
    return buf.getvalue()


def regeneration() -> dict:
    """Every shipped icon, keyed by relative path, as PNG/ICO/ICNS bytes."""
    master = render_mark(1024)
    images = {
        "16x16.png": master.resize((16, 16), Image.LANCZOS),
        "32x32.png": master.resize((32, 32), Image.LANCZOS),
        "128x128.png": master.resize((128, 128), Image.LANCZOS),
        "128x128@2x.png": master.resize((256, 256), Image.LANCZOS),
        "256x256.png": master.resize((256, 256), Image.LANCZOS),
        "512x512.png": master.resize((512, 512), Image.LANCZOS),
        "icon.png": master.resize((512, 512), Image.LANCZOS),
    }
    out = {name: _io(img, "PNG") for name, img in images.items()}
    out["icon.ico"] = _io(images["256x256.png"], "ICO",
                          sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    try:
        out["icon.icns"] = _io(master, "ICNS")
    except Exception:  # pragma: no cover - platform/format availability
        out["icon.icns"] = None
    return out


def write_set(outdir: pathlib.Path, print_lines: bool = False) -> None:
    for name, data in regeneration().items():
        if data is None:
            if print_lines:
                print(f"  {name} skipped (this Pillow cannot write ICNS)")
            continue
        (outdir / name).write_bytes(data)
        if print_lines:
            print(f"  {name}")


def check_set(outdir: pathlib.Path) -> list:
    drift = []
    for name, data in regeneration().items():
        target = outdir / name
        if data is None:
            if not target.exists():
                drift.append(f"{name}: missing")
            continue
        if not target.exists() or target.read_bytes() != data:
            drift.append(f"{name}: differs from the committed icon")
    return drift


def main(argv) -> int:
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="verify the committed set matches")
    args = parser.parse_args(argv)

    if args.check:
        drift = check_set(ICON_DIR)
        svg = svg_text()
        if (ICON_DIR / "mark.svg").read_text(encoding="utf-8") != svg:
            drift.append("mark.svg: differs from the committed vector source")
        if drift:
            print("drift in the icon set:")
            for line in drift:
                print(f"  {line}")
            print("run `python3 tools/make-icons.py` and commit the result")
            return 1
        print("icon set matches the committed sources")
        return 0

    ICON_DIR.mkdir(parents=True, exist_ok=True)
    write_set(ICON_DIR, print_lines=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
