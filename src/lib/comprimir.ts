// Compresión de fotos en el navegador antes de subir: 1280px de lado largo,
// JPEG calidad 0.8. Ahorra datos del vecino y espacio de almacenamiento.

const LADO_MAXIMO = 1280
const CALIDAD = 0.8

export async function comprimirImagen(archivo: File): Promise<Blob> {
  const bitmap = await cargarBitmap(archivo)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No pudimos procesar la foto en este navegador.')
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, ancho, alto)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', CALIDAD),
  )
  if (!blob) throw new Error('No pudimos comprimir la foto. Probá con otra.')
  return blob
}

async function cargarBitmap(archivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(archivo)
    } catch {
      /* seguimos con <img> */
    }
  }
  const url = URL.createObjectURL(archivo)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}
