"""Force re-strip backgrounds on every media image. Check each file."""

from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter
from rembg import new_session, remove

MEDIA = Path(__file__).resolve().parent / 'media'
ASSETS = Path(
    r'C:\Users\nvnsa\.cursor\projects\c-Users-nvnsa-Downloads-foodporium-2026\assets'
)
EXTS = {'.png', '.jpg', '.jpeg', '.webp'}


def flatten_white(im: Image.Image) -> Image.Image:
    """Composite any existing alpha onto pure white so rembg sees a solid plate."""
    rgba = im.convert('RGBA')
    bg = Image.new('RGBA', rgba.size, (255, 255, 255, 255))
    return Image.alpha_composite(bg, rgba).convert('RGB')


def clear_edge_plate(im: Image.Image) -> Image.Image:
    """Flood-clear near-white/gray opaque leftovers connected to image edges."""
    rgba = im.convert('RGBA')
    w, h = rgba.size
    px = rgba.load()
    visited = [[False] * w for _ in range(h)]
    stack: list[tuple[int, int]] = []

    def is_plate(r: int, g: int, b: int, a: int) -> bool:
        if a < 8:
            return True
        # near-white / light gray studio plate
        if r > 200 and g > 200 and b > 200 and abs(r - g) < 25 and abs(g - b) < 25:
            return True
        # near-black leftover studio (common on pizza gens)
        if r < 28 and g < 28 and b < 28:
            return True
        return False

    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))

    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, a = px[x, y]
        if not is_plate(r, g, b, a):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    # Harden remaining alpha (no expand — expand brought plate back)
    r, g, b, a = rgba.split()
    a = a.point(lambda v: 0 if v < 100 else 255)
    return Image.merge('RGBA', (r, g, b, a))


def square_pad(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    pad = 16
    l, t, r, b = bbox
    im = im.crop(
        (max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad))
    )
    side = max(im.size)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    if side > 900:
        canvas = canvas.resize((900, 900), Image.Resampling.LANCZOS)
    return canvas


def source_for(path: Path) -> Path:
    """Prefer original AI jpg from assets when available."""
    for cand in (
        ASSETS / f'{path.stem}.jpg',
        ASSETS / f'{path.stem}.png',
        path,
    ):
        if cand.exists():
            return cand
    return path


def process(path: Path, session) -> Path:
    src = source_for(path)
    flat = flatten_white(Image.open(src))
    buf = BytesIO()
    flat.save(buf, format='PNG')
    cut = remove(buf.getvalue(), session=session)
    im = clear_edge_plate(Image.open(BytesIO(cut)).convert('RGBA'))
    im = square_pad(im)
    out = path if path.suffix.lower() == '.png' else path.with_suffix('.png')
    im.save(out, 'PNG', optimize=True)
    return out


def main() -> None:
    files = sorted(
        p
        for p in MEDIA.rglob('*')
        if p.is_file() and p.suffix.lower() in EXTS
    )
    # Prefer png outputs; skip jpg if matching png will be rewritten from assets/src
    targets = []
    seen = set()
    for p in files:
        key = (p.parent, p.stem.lower())
        if key in seen:
            continue
        # Prefer processing the png path if both exist
        png = p.with_suffix('.png')
        target = png if png.exists() or p.suffix.lower() == '.png' else p
        key2 = (target.parent, target.stem.lower())
        if key2 in seen:
            continue
        seen.add(key2)
        targets.append(target)

    print(f'Will force-strip {len(targets)} images', flush=True)
    session = new_session('u2net')
    print('u2net ready', flush=True)

    for i, path in enumerate(targets, 1):
        print(f'[{i}/{len(targets)}] {path.relative_to(MEDIA)}', flush=True)
        out = process(path, session)
        # quick quality check
        im = Image.open(out).convert('RGBA')
        hist = im.getchannel('A').histogram()
        tp = 100 * hist[0] / (im.size[0] * im.size[1])
        c = [im.getpixel((0, 0))[3], im.getpixel((im.width - 1, im.height - 1))[3]]
        print(f'  -> trans={tp:.1f}% cornerA={c}', flush=True)

    print('Done.', flush=True)


if __name__ == '__main__':
    main()
