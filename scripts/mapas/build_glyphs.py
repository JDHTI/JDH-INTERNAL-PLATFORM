"""Builds the SDF glyphs MapLibre needs to label the map in Centrale Sans.

MapLibre does not read font files: it asks for `{fontstack}/{range}.pbf`, one
protobuf per block of 256 code points, each glyph a 24px signed distance field.
This writes them from the woff2 in public/fonts into public/mapas/fonts, next
to colombia.pmtiles (both outside git; see docs/mapa-comercial.md).

    pip install fonttools brotli freetype-py numpy scipy
    python scripts/mapas/build_glyphs.py

The numbers below (24px, 3px buffer, radius 8, cutoff 0.25) are the ones
MapLibre's shader assumes; they are the format, not a preference.
"""

from __future__ import annotations

import io
import math
import sys
from pathlib import Path

import freetype
import numpy as np
from fontTools.ttLib import TTFont
from scipy.ndimage import distance_transform_edt

ROOT = Path(__file__).resolve().parents[2]
FONTS = ROOT / "public" / "fonts"
OUTPUT = ROOT / "public" / "mapas" / "fonts"

# Font stack name (what the style's `text-font` says) -> source file.
STACKS = {
    "Centrale Sans Regular": "centrale-sans-regular.woff2",
    "Centrale Sans Italic": "centrale-sans-regular-italic.woff2",
    "Centrale Sans Medium": "centrale-sans-medium.woff2",
    "Centrale Sans Bold": "centrale-sans-bold.woff2",
}

SIZE = 24
BUFFER = 3
RADIUS = 8
CUTOFF = 0.25
# The outline is rasterised this many times larger and the distance measured on
# that grid: 1/8 px of error, below what an 8-bit field can hold.
SCALE = 8


def varint(value: int) -> bytes:
    out = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        if value:
            out.append(byte | 0x80)
        else:
            out.append(byte)
            return bytes(out)


def field_varint(number: int, value: int) -> bytes:
    return varint(number << 3) + varint(value)


def field_sint(number: int, value: int) -> bytes:
    return field_varint(number, (value << 1) ^ (value >> 31))


def field_bytes(number: int, value: bytes) -> bytes:
    return varint((number << 3) | 2) + varint(len(value)) + value


def as_truetype(path: Path) -> io.BytesIO:
    """FreeType builds rarely read woff2, so the font is unwrapped in memory."""
    font = TTFont(path)
    font.flavor = None
    buffer = io.BytesIO()
    font.save(buffer)
    buffer.seek(0)
    return buffer


def render(face: freetype.Face, large: freetype.Face, codepoint: int, ascender: int) -> bytes:
    face.load_char(codepoint, freetype.FT_LOAD_NO_HINTING | freetype.FT_LOAD_NO_BITMAP)
    advance = round(face.glyph.metrics.horiAdvance / 64)

    large.load_char(codepoint, freetype.FT_LOAD_NO_HINTING | freetype.FT_LOAD_RENDER)
    bitmap = large.glyph.bitmap
    if bitmap.width == 0 or bitmap.rows == 0:
        # A space: no outline, only an advance.
        empty = bytes((2 * BUFFER) * (2 * BUFFER))
        return b"".join(
            [
                field_varint(1, codepoint),
                field_bytes(2, empty),
                field_varint(3, 0),
                field_varint(4, 0),
                field_sint(5, 0),
                field_sint(6, -ascender),
                field_varint(7, advance),
            ]
        )

    pixels = np.array(bitmap.buffer, dtype=np.uint8).reshape(bitmap.rows, bitmap.pitch)[:, : bitmap.width]
    ink_left = large.glyph.bitmap_left
    ink_top = large.glyph.bitmap_top

    # The glyph's box in 24px units, snapped outwards to whole pixels.
    left = math.floor(ink_left / SCALE)
    right = math.ceil((ink_left + bitmap.width) / SCALE)
    top = math.ceil(ink_top / SCALE)
    bottom = math.floor((ink_top - bitmap.rows) / SCALE)
    width = right - left
    height = top - bottom

    cells_x = (width + 2 * BUFFER) * SCALE
    cells_y = (height + 2 * BUFFER) * SCALE
    inside = np.zeros((cells_y, cells_x), dtype=bool)
    x0 = ink_left - (left - BUFFER) * SCALE
    y0 = (top + BUFFER) * SCALE - ink_top
    inside[y0 : y0 + bitmap.rows, x0 : x0 + bitmap.width] = pixels >= 128

    # Distance to the outline in 24px units: positive outside, negative inside.
    distance = (distance_transform_edt(~inside) - distance_transform_edt(inside)) / SCALE
    centres = distance[SCALE // 2 :: SCALE, SCALE // 2 :: SCALE]
    field = 255 - np.clip(centres * (256 / RADIUS) + CUTOFF * 256, 0, 255)

    return b"".join(
        [
            field_varint(1, codepoint),
            field_bytes(2, field.astype(np.uint8).tobytes()),
            field_varint(3, width),
            field_varint(4, height),
            field_sint(5, left),
            field_sint(6, top - ascender),
            field_varint(7, advance),
        ]
    )


def build(stack: str, source: Path) -> int:
    data = as_truetype(source).getvalue()
    face = freetype.Face(io.BytesIO(data))
    face.set_char_size(SIZE * 64)
    # MapLibre places a line of text assuming the proportions of the fonts its
    # glyphs usually come from (Noto Sans, Open Sans): capitals top out 9px
    # under the ascender at 24px. Centrale Sans declares a short ascender (0.75
    # em), and with it every label drew 8px high, off-centre in its chip.
    face.load_char("H", freetype.FT_LOAD_NO_HINTING | freetype.FT_LOAD_NO_BITMAP)
    ascender = round(face.glyph.metrics.horiBearingY / 64) + 9
    large = freetype.Face(io.BytesIO(data))
    large.set_char_size(SIZE * SCALE * 64)

    codepoints = sorted(code for code, _ in face.get_chars() if 0 < code <= 0xFFFF)
    by_range: dict[int, list[bytes]] = {}
    for codepoint in codepoints:
        by_range.setdefault(codepoint // 256, []).append(render(face, large, codepoint, ascender))

    target = OUTPUT / stack
    target.mkdir(parents=True, exist_ok=True)
    # Every range gets a file, glyphs or not: MapLibre reports a missing range
    # as a failed request on each label that needs it.
    for index in range(256):
        name = f"{index * 256}-{index * 256 + 255}"
        fontstack = field_bytes(1, stack.encode()) + field_bytes(2, name.encode())
        fontstack += b"".join(field_bytes(3, glyph) for glyph in by_range.get(index, []))
        (target / f"{name}.pbf").write_bytes(field_bytes(1, fontstack))
    return len(codepoints)


def main() -> int:
    for stack, filename in STACKS.items():
        source = FONTS / filename
        if not source.exists():
            print(f"Falta {source}", file=sys.stderr)
            return 1
        print(f"{stack}: {build(stack, source)} glifos")
    print(f"Escritos en {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
