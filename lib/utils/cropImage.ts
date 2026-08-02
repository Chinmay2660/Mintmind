export const CROP_VIEW_SIZE = 280
export const CROP_OUTPUT_SIZE = 256

export function getCoverScale(imgW: number, imgH: number, cropSize: number): number {
  return Math.max(cropSize / imgW, cropSize / imgH)
}

export function cropImageToDataUrl(
  image: HTMLImageElement,
  cropSize: number,
  outputSize: number,
  zoom: number,
  position: { x: number; y: number },
  quality = 0.85
): string {
  const scale = getCoverScale(image.naturalWidth, image.naturalHeight, cropSize) * zoom
  const scaledW = image.naturalWidth * scale
  const scaledH = image.naturalHeight * scale
  const drawX = cropSize / 2 - scaledW / 2 + position.x
  const drawY = cropSize / 2 - scaledH / 2 + position.y

  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  ctx.beginPath()
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  const ratio = outputSize / cropSize
  ctx.drawImage(image, drawX * ratio, drawY * ratio, scaledW * ratio, scaledH * ratio)

  return canvas.toDataURL('image/jpeg', quality)
}

// ponytail: self-check — cover scale for a 2:1 image should be cropSize/width
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  const scale = getCoverScale(1000, 500, CROP_VIEW_SIZE)
  if (scale !== CROP_VIEW_SIZE / 1000) {
    console.warn('cropImage: unexpected cover scale', scale)
  }
}
