#!/usr/bin/env python3
"""
Measure the anchor points of a ring or bracelet product photo.

The 2D VTO endpoints accept a `<item>_anchor_point` parameter described as
"the 2 farthest points along the inner edge". Leave it out and the engine
guesses the scale, which is how a bangle ends up pasted flat across a forearm,
overhanging the arm on both sides.

"Farthest" means the farthest *pair*, i.e. the major axis of the inner opening
as it appears in perspective — not the leftmost and rightmost pixels. For a
bangle photographed at an angle those are different points, and using the
horizontal extremes scales the product roughly 2x too large.

    python3 scripts/measure-anchor.py public/references/bracelet-gold-cuff.jpg

Assumes the product sits on a plain near-white background. Filigree openwork
creates hundreds of small enclosed regions, so only the largest is treated as
the real opening.
"""

import collections
import math
import sys
from pathlib import Path

from PIL import Image

WHITE = 235


def enclosed_regions(px, w: int, h: int) -> list[list[tuple[int, int]]]:
    """White regions not reachable from the border — i.e. holes in the product."""
    seen = [[False] * w for _ in range(h)]
    queue: collections.deque[tuple[int, int]] = collections.deque()

    def seed(x: int, y: int) -> None:
        if px[x, y] >= WHITE and not seen[y][x]:
            seen[y][x] = True
            queue.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while queue:
        x, y = queue.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny] >= WHITE:
                seen[ny][nx] = True
                queue.append((nx, ny))

    regions = []
    for sy in range(h):
        for sx in range(w):
            if px[sx, sy] >= WHITE and not seen[sy][sx]:
                comp = []
                seen[sy][sx] = True
                dq = collections.deque([(sx, sy)])
                while dq:
                    x, y = dq.popleft()
                    comp.append((x, y))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny] >= WHITE:
                            seen[ny][nx] = True
                            dq.append((nx, ny))
                regions.append(comp)
    return regions


def convex_hull(points: list[tuple[int, int]]) -> list[tuple[int, int]]:
    pts = sorted(set(points))

    def half(seq):
        out: list[tuple[int, int]] = []
        for p in seq:
            while len(out) >= 2:
                (ax, ay), (bx, by) = out[-2], out[-1]
                if (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax) <= 0:
                    out.pop()
                else:
                    break
            out.append(p)
        return out

    return half(pts)[:-1] + half(pts[::-1])[:-1]


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2

    path = Path(sys.argv[1])
    with Image.open(path) as im:
        grey = im.convert("L")
        w, h = grey.size
        px = grey.load()

        regions = enclosed_regions(px, w, h)
        if not regions:
            print("No enclosed opening found. Is the product a closed ring on white?")
            return 1

        regions.sort(key=len, reverse=True)
        opening = regions[0]
        inside = set(opening)
        edge = [
            p for p in opening
            if any((p[0] + dx, p[1] + dy) not in inside for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        ]

        hull = convex_hull(edge)
        best = (0.0, None, None)
        for i in range(len(hull)):
            for j in range(i + 1, len(hull)):
                d = math.dist(hull[i], hull[j])
                if d > best[0]:
                    best = (d, hull[i], hull[j])

    dist, a, b = best
    print(f"{path.name}  {w}x{h}")
    print(f"  {len(regions)} enclosed regions; opening is {len(opening)} px")
    print(f"  farthest pair on the inner edge: {a} <-> {b}  ({dist:.0f} px apart)")
    print()
    print(f"  anchor_point = [[{a[0]}, {a[1]}], [{b[0]}, {b[1]}]]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
