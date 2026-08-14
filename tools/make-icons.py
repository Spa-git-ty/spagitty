#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Generate GitLord's application icon set.

The icon is an original mark: a commit lane with a branch elbow and three
nodes, drawn with the same geometry language as the Graph screen. It uses the
lane palette, not Git's orange, and none of the Git logo's shapes — GitLord must
never ship anything that could read as the Git project's mark.

This script is the icon's source form. Regenerate with:

    python3 tools/make-icons.py

Requires Pillow. Everything it writes lands in src-tauri/icons/.
"""

from __future__ import annotations

import pathlib

from PIL import Image, ImageDraw

# Supersampling factor. PIL has no antialiased drawing, so everything is drawn
# large and scaled down with a good filter.
SS = 8
BASE = 128
SIZE = BASE * SS

GROUND = (32, 36, 43, 255)  # --panel, dark
LANE_A = (42, 120, 214, 255)  # --lane-1
LANE_B = (122, 92, 196, 255)  # --lane-2
INK = (233, 232, 228, 255)  # --ink, dark

# Fractions of the canvas, so the geometry is resolution independent.
CORNER = 0.22
STROKE = 0.075
NODE_R = 0.105
LANE_X = 0.37
BRANCH_X = 0.67


def bezier(p0, p1, p2, p3, steps=160):
    """Cubic bezier as a point list — the same elbow shape the lanes use."""
    points = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        points.append((x, y))
    return points


def draw_icon() -> Image.Image:
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    def px(value: float) -> float:
        return value * SIZE

    draw.rounded_rectangle(
        [0, 0, SIZE - 1, SIZE - 1], radius=px(CORNER), fill=GROUND
    )

    width = int(px(STROKE))

    # The main lane, running the full height.
    draw.line(
        [(px(LANE_X), px(0.17)), (px(LANE_X), px(0.83))],
        fill=LANE_A,
        width=width,
    )

    # A branch elbow leaving the lane and running down in its own lane.
    elbow = bezier(
        (px(LANE_X), px(0.32)),
        (px(LANE_X), px(0.47)),
        (px(BRANCH_X), px(0.40)),
        (px(BRANCH_X), px(0.55)),
    )
    draw.line(elbow, fill=LANE_B, width=width, joint="curve")
    draw.line(
        [(px(BRANCH_X), px(0.55)), (px(BRANCH_X), px(0.72))],
        fill=LANE_B,
        width=width,
    )

    def node(cx: float, cy: float, color) -> None:
        r = px(NODE_R)
        draw.ellipse(
            [px(cx) - r, px(cy) - r, px(cx) + r, px(cy) + r],
            fill=color,
            outline=GROUND,
            width=int(px(0.022)),
        )

    node(LANE_X, 0.20, LANE_A)
    node(LANE_X, 0.50, LANE_A)
    node(LANE_X, 0.80, LANE_A)
    node(BRANCH_X, 0.70, LANE_B)

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
