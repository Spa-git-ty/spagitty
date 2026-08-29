#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Generate Spagitty's application icon set.

The icon is an original mark and reads two ways at once, which is the whole
joke in the name: three strands that start tangled at the top and straighten
into parallel commit lanes at the bottom, with a commit node on each. Spaghetti
above, a commit graph below.

The strands are sine waves whose amplitude decays downward, drawn in the app's
own lane palette plus one wheat tone for the pasta. Nothing here borrows the
Git project's mark or its orange — Spagitty must never ship anything that could
read as the Git project's logo.

This file is the mark's source form. Everything else that shows the brand —
the wordmark lockup, monogram, hero, tray icons — is generated from the same
mark by `tools/make-brand.py`, which imports this module rather than
redrawing it. Regenerate with:

    python3 tools/make-icons.py          # writes src-tauri/icons/
    python3 tools/make-icons.py --check  # verifies the committed set matches

Requires Pillow. Everything it writes lands in src-tauri/icons/. The palettes
are the real `--panel` / `--lane-*` tokens from src/app.css, so the icon always
sits in the same colour family as the app it launches.
"""

from __future__ import annotations

import math
import pathlib
import sys
import tempfile

from PIL import Image, ImageDraw

# --- Palettes ---------------------------------------------------------------
#
# The app's tokens, read from src/app.css on the branch that first introduced
# them. `lane-3..5` exist in the UI; the brand mark uses the first two + the
# wheat accent that has lived in the icon since the original drawing.

DARK = {
    "ground": (24, 24, 37, 255),  # --panel (#181825)
    "lanes": ((137, 180, 250, 255), (203, 166, 247, 255)),  # --lane-1, --lane-2
    "wheat": (226, 183, 96, 255),  # the pasta strand
}
LIGHT = {
    "ground": (230, 233, 239, 255),  # --panel (#e6e9ef)
    "lanes": ((30, 102, 245, 255), (136, 57, 239, 255)),  # --lane-1, --lane-2
    "wheat": (206, 138, 46, 255),  # a wheat darkened enough to sit on the light panel
}

# --- Geometry ---------------------------------------------------------------
#
# Fractions of the canvas, so everything is resolution independent.

CORNER = 0.22
WHEAT_WIDTH = 0.080  # the pasta is the thickest strand
LANE_WIDTH = 0.066
NODE_R = 0.088
NODE_RING = 0.028
# The strands begin above the frame and are clipped by it, so the tangle reads
# as continuing off the icon rather than as three stubby hooks.
TOP = -0.18

# Where each strand ends up once it has straightened out, its role, its phase
# at the top, the height of the node that caps it, and which lane colour it is
# (both lanes take distinct colours from the palette). The wheat is first so it
# is drawn last (front to back), crossing over the lanes it tangles with.
STRANDS = (
    (0.27, "wheat", 0.0, 0.74, None),
    (0.50, "lanes", 2.3, 0.83, 0),
    (0.73, "lanes", 4.5, 0.69, 1),
)


def strand_colour(theme: dict, role: str, lane: int | None) -> tuple:
    return theme["wheat"] if role == "wheat" else theme["lanes"][lane]

# How far a strand can swing at the very top, how fast that swing dies out as it
# descends, and how many times it changes direction on the way.
SWING = 0.155
DECAY = 1.9
TURNS = 2.45


def strand_points(center: float, phase: float, bottom: float, steps: int = 400):
    """One strand, from the tangle at the top down to the node that caps it."""
    points = []
    for i in range(steps + 1):
        t = i / steps
        amplitude = SWING * (1 - t) ** DECAY
        x = center + amplitude * math.sin(2 * math.pi * TURNS * t + phase)
        y = TOP + (bottom - TOP) * t
        points.append((x, y))
    return points


def stroke(draw: ImageDraw.ImageDraw, points, colour, width: float, size: float) -> None:
    """Draw a path by stamping discs along it.

    `ImageDraw.line` with a thick width and `joint="curve"` leaves seams where
    the segments meet — visible as hatching once the image is scaled down.
    Stamping a disc per point costs more draws and gives a clean round stroke
    with round ends, which is what a noodle wants.
    """
    r = width / 2 * size
    for x, y in points:
        draw.ellipse([x * size - r, y * size - r, x * size + r, y * size + r], fill=colour)


def node(draw: ImageDraw.ImageDraw, cx: float, cy: float, colour, ground, size: float) -> None:
    """A commit node: the strand colour with a ground ring that reads at any size."""
    r = NODE_R * size
    ring = NODE_RING * size
    draw.ellipse([cx - r - ring, cy - r - ring, cx + r + ring, cy + r + ring], fill=ground)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour)


def render_mark(px: int, theme: dict, ss: int = 8) -> Image.Image:
    """The mark on its rounded ground, as an RGBA image of `px` (square)."""
    size = px * ss
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    ground = theme["ground"]

    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=CORNER * size, fill=ground)

    # The strands run off the top of the frame, so they are drawn on their own
    # layer and clipped to the same rounded rectangle as the ground.
    strands = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pen = ImageDraw.Draw(strands)

    for center, role, phase, node_y, lane in reversed(STRANDS):
        width = WHEAT_WIDTH if role == "wheat" else LANE_WIDTH
        colour = strand_colour(theme, role, lane)
        stroke(pen, strand_points(center, phase, node_y), colour, width, size)

    for center, role, phase, node_y, lane in STRANDS:
        colour = strand_colour(theme, role, lane)
        node(pen, center * size, node_y * size, colour, ground, size)

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=CORNER * size, fill=255
    )
    image.paste(strands, (0, 0), Image.composite(strands.getchannel("A"), mask, mask))

    return image.resize((px, px), Image.LANCZOS)


# --- Vector source ----------------------------------------------------------

def _simplify(points, tolerance: float) -> list:
    """Douglas–Peucker over the normalized strand points, for the SVG path."""
    points = list(points)

    def distance(p, a, b):
        (ax, ay), (bx, by) = a, b
        dx, dy = bx - ax, by - ay
        length = math.hypot(dx, dy)
        if length == 0:
            return math.hypot(p[0] - ax, p[1] - ay)
        t = max(0.0, min(1.0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (length * length)))
        proj = (ax + t * dx, ay + t * dy)
        return math.hypot(p[0] - proj[0], p[1] - proj[1])

    def keep(pts):
        if len(pts) < 3:
            return pts
        start, end = pts[0], pts[-1]
        index = max(range(1, len(pts) - 1), key=lambda i: distance(pts[i], start, end))
        if distance(pts[index], start, end) > tolerance:
            return keep(pts[: index + 1])[:-1] + keep(pts[index:])
        return [start, end]

    return keep(points)


def write_mark_svg(path: pathlib.Path, theme: dict, view: int = 512) -> None:
    """Emit the mark as a standalone SVG, the same maths as the raster."""
    tol = 1.5 / view
    width = {"wheat": WHEAT_WIDTH, "lanes": LANE_WIDTH}
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view} {view}">']
    r = CORNER * view
    parts.append(
        f'<rect width="{view}" height="{view}" rx="{r}" fill="rgb{tuple(theme["ground"][:3])}"/>'
    )
    for center, role, phase, node_y, lane in reversed(STRANDS):
        pts = _simplify(strand_points(center, phase, node_y), tol)
        colour = strand_colour(theme, role, lane)
        d = "M " + " L ".join(f"{x * view:.2f} {y * view:.2f}" for x, y in pts)
        parts.append(
            f'<path d="{d}" stroke="rgb{colour[:3]}" stroke-width="{width[role] * view:.2f}" '
            f'stroke-linecap="round" fill="none"/>'
        )
    for center, role, _, node_y, lane in STRANDS:
        colour = strand_colour(theme, role, lane)
        x, y = center * view, node_y * view
        rr = NODE_RING * view
        parts.append(
            f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{NODE_R * view + rr:.2f}" '
            f'fill="rgb{theme["ground"][:3]}"/>'
        )
        parts.append(
            f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{NODE_R * view:.2f}" fill="rgb{colour[:3]}"/>'
        )
    parts.append("</svg>")
    text = "\n".join(parts) + "\n"
    if path is None:
        return text
    path.write_text(text, encoding="utf-8")


# --- The shipped set --------------------------------------------------------

ICON_DIR = pathlib.Path(__file__).resolve().parent.parent / "src-tauri" / "icons"


def regeneration(theme: dict) -> dict:
    """Render every shipped icon, keyed by relative path, as PNG/ICO/ICNS bytes."""
    master = render_mark(1024, theme)
    images = {
        "16x16.png": master.resize((16, 16), Image.LANCZOS),
        "32x32.png": master.resize((32, 32), Image.LANCZOS),
        "128x128.png": master.resize((128, 128), Image.LANCZOS),
        "128x128@2x.png": master.resize((256, 256), Image.LANCZOS),
        "256x256.png": master.resize((256, 256), Image.LANCZOS),
        "512x512.png": master.resize((512, 512), Image.LANCZOS),
        "icon.png": master.resize((512, 512), Image.LANCZOS),
    }
    out = {}
    for name, img in images.items():
        buffer = io_bytes(img, format="PNG")
        out[name] = buffer
    ico = io_bytes(images["256x256.png"], format="ICO",
                   sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    out["icon.ico"] = ico
    try:
        out["icon.icns"] = io_bytes(master, format="ICNS")
    except Exception:  # pragma: no cover - platform/format availability
        out["icon.icns"] = None
    return out


def io_bytes(image: Image.Image, format: str, sizes=None) -> bytes:
    import io
    buffer = io.BytesIO()
    kwargs = {"sizes": sizes} if sizes else {}
    image.save(buffer, format=format, **kwargs)
    return buffer.getvalue()


def write_set(outdir: pathlib.Path, theme: dict, print_lines: bool = False) -> None:
    for name, data in regeneration(theme).items():
        if data is None:
            if print_lines:
                print(f"  {name} skipped (this Pillow cannot write ICNS)")
            continue
        (outdir / name).write_bytes(data)
        if print_lines:
            print(f"  {name}")


def check_set(outdir: pathlib.Path, theme: dict) -> bool:
    drift = []
    for name, data in regeneration(theme).items():
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
    parser.add_argument("--check", action="store_true", help="verify the committed set matches")
    parser.add_argument("--write-svg", action="store_true", help="also write the mark SVG sources")
    args = parser.parse_args(argv)

    if args.check:
        drift = check_set(ICON_DIR, DARK)
        svg = write_mark_svg(None, DARK)
        target = ICON_DIR / "mark.svg"
        if not target.exists() or target.read_text() != svg:
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
    write_set(ICON_DIR, DARK, print_lines=True)

    if args.write_svg:
        write_mark_svg(ICON_DIR / "mark.svg", DARK)
        print("  mark.svg")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))