#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Generate Spagitty's application icon set.

The icon is an original mark and reads two ways at once, which is the whole
joke in the name: three strands that start tangled at the top and straighten
into parallel commit lanes at the bottom, with a commit node on each. Spaghetti
above, a commit graph below.

The strands are sine waves whose amplitude decays downward, drawn in the lane
palette plus one wheat tone for the pasta. Nothing here borrows the Git
project's mark or its orange — Spagitty must never ship anything that could
read as the Git project's logo.

This script is the icon's source form. Regenerate with:

    python3 tools/make-icons.py

Requires Pillow. Everything it writes lands in src-tauri/icons/.
"""

from __future__ import annotations

import math
import pathlib

from PIL import Image, ImageDraw

# Supersampling factor. PIL has no antialiased drawing, so everything is drawn
# large and scaled down with a good filter.
SS = 8
BASE = 128
SIZE = BASE * SS

GROUND = (32, 36, 43, 255)  # --panel, dark
WHEAT = (226, 183, 96, 255)  # the pasta strand
LANE_A = (42, 120, 214, 255)  # --lane-1
LANE_B = (122, 92, 196, 255)  # --lane-2

# Fractions of the canvas, so the geometry is resolution independent.
CORNER = 0.22
STROKE = 0.074
NODE_R = 0.088
# The strands begin above the frame and are clipped by it, so the tangle
# reads as continuing off the icon rather than as three stubby hooks.
TOP = -0.18

# Where each strand ends up once it has straightened out, the colour it is
# drawn in, its phase at the top, and the height of the node that caps it.
STRANDS = (
    (0.27, WHEAT, 0.0, 0.74),
    (0.50, LANE_A, 2.3, 0.83),
    (0.73, LANE_B, 4.5, 0.69),
)

# How far a strand can swing at the very top, how fast that swing dies out as
# it descends, and how many times it changes direction on the way. The decay
# exponent is what makes the tangle resolve into lanes rather than taper evenly.
SWING = 0.155
DECAY = 1.9
TURNS = 2.45


def strand(center: float, phase: float, bottom: float, steps: int = 400):
    """One strand, from the tangle at the top down to the node that caps it."""
    points = []
    for i in range(steps + 1):
        t = i / steps
        amplitude = SWING * (1 - t) ** DECAY
        x = center + amplitude * math.sin(2 * math.pi * TURNS * t + phase)
        y = TOP + (bottom - TOP) * t
        points.append((x * SIZE, y * SIZE))
    return points


def stroke(draw: ImageDraw.ImageDraw, points, colour, width: float) -> None:
    """Draw a path by stamping discs along it.

    `ImageDraw.line` with a thick width and `joint="curve"` leaves seams where
    the segments meet — visible as hatching once the image is scaled down.
    Stamping a disc per point costs more draws and gives a clean round stroke
    with round ends, which is what a noodle wants.
    """
    r = width / 2
    for x, y in points:
        draw.ellipse([x - r, y - r, x + r, y + r], fill=colour)


def draw_icon() -> Image.Image:
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    def px(value: float) -> float:
        return value * SIZE

    draw.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=px(CORNER), fill=GROUND)

    # The strands run off the top of the frame, so they are drawn on their own
    # layer and clipped to the same rounded rectangle as the ground.
    strands = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    pen = ImageDraw.Draw(strands)
    width = px(STROKE)

    # Back to front, so the wheat strand crosses over the lanes it tangles with
    # rather than being buried by them.
    for center, colour, phase, node_y in reversed(STRANDS):
        stroke(pen, strand(center, phase, node_y), colour, width)

    # One node per strand, capping it where the lane has straightened out.
    for center, colour, _, node_y in STRANDS:
        r = px(NODE_R)
        pen.ellipse(
            [px(center) - r, px(node_y) - r, px(center) + r, px(node_y) + r],
            fill=colour,
            outline=GROUND,
            width=int(px(0.020)),
        )

    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, SIZE - 1, SIZE - 1], radius=px(CORNER), fill=255
    )
    image.paste(strands, (0, 0), Image.composite(strands.getchannel("A"), mask, mask))

    return image.resize((BASE, BASE), Image.LANCZOS)


def main() -> None:
    out = pathlib.Path(__file__).resolve().parent.parent / "src-tauri" / "icons"
    out.mkdir(parents=True, exist_ok=True)

    master = draw_icon()
    hi = master.resize((1024, 1024), Image.LANCZOS)

    def save(name: str, size: int) -> None:
        hi.resize((size, size), Image.LANCZOS).save(out / name)
        print(f"  {name} ({size}x{size})")

    print(f"writing to {out}")
    save("32x32.png", 32)
    save("128x128.png", 128)
    save("128x128@2x.png", 256)
    save("icon.png", 512)

    hi.resize((256, 256), Image.LANCZOS).save(
        out / "icon.ico",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print("  icon.ico")

    try:
        hi.save(out / "icon.icns")
        print("  icon.icns")
    except Exception as error:  # pragma: no cover - platform dependent
        print(f"  icon.icns skipped: {error}")


if __name__ == "__main__":
    main()
