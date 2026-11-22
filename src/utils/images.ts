/** Filenames with real transparent alpha (detected from media). */
const CUTOUT_FILES = new Set([
  'aaloo.png',
  'allo-tikki-burger-removebg-preview.png',
  'capsicum__1_-removebg-preview.png',
  'cheese_sandwich-removebg-preview.png',
  'cheese_sandwich-removebg-preview_svlsioq.png',
  'co.png',
  'co_vtikc12.png',
  'corn_1_1-removebg-preview.png',
  'firangi-aloo-tikki-burger_1.png',
  'fried_momo-removebg-preview.png',
  'tandoori-paneer.4ef45717e972cf45b43c010e3cde5a22.1-removebg-preview.png',
  'tandoori-paneer.4ef45717e972cf45b43c010e3cde5a22.1-removebg-preview_r0ufwbf.png',
  'transparent-hamburger-image-of-a-meaty-burger-with-toppings6586d914c01ad3.1473781_zwmq1jt.png',
  // category cutouts
  'transparent-french-fries-64f41b6aa8dde8.2529645416937194026917.png',
  'screenshot_2024-02-08_205849-removebg-preview.png',
  '1195-2021-07-29-removebg-preview.png',
  'klipartz.com.png',
  'pikpng.com_sandwich-png_511279.png',
  'pngwing.com_2.png',
  'burger_wkmodst.png',
])

function basename(url: string) {
  const path = url.split('?')[0]
  const parts = path.split('/')
  return (parts[parts.length - 1] || '').toLowerCase()
}

/** True when the asset has a transparent (no photo) background. */
export function hasNoBackground(url: string | null | undefined) {
  if (!url) return false
  return CUTOUT_FILES.has(basename(url))
}

export function onlyCutouts<T extends { image_url: string }>(items: T[]) {
  return items.filter((item) => hasNoBackground(item.image_url))
}
