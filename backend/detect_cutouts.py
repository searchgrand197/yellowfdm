from pathlib import Path

from PIL import Image

root = Path('media/images')
cutouts = []
with_bg = []

for p in sorted(root.iterdir()):
    if p.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'}:
        continue
    try:
        im = Image.open(p)
        has_alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
        transparent = False
        if has_alpha:
            if im.mode != 'RGBA':
                im = im.convert('RGBA')
            hist = im.getchannel('A').histogram()
            low = sum(hist[:16])
            transparent = low > (im.size[0] * im.size[1] * 0.02)
        label = 'CUT' if transparent else 'BG'
        print(f'{label:3} {im.mode:4} {p.name}')
        (cutouts if transparent else with_bg).append(p.name)
    except Exception as e:
        print('ERR', p.name, e)

print('\nCUTOUTS:', len(cutouts))
for name in cutouts:
    print(' ', name)
print('\nWITH_BG:', len(with_bg))
