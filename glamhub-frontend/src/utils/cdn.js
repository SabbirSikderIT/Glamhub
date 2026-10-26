// Cloudinary delivers a resized, auto-format, auto-quality version when transformation parameters are added to the URL.
// Non-Cloudinary URLs (for example images stored on local disk) are returned unchanged.
export function optimize(url, width = 640) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`)
}
