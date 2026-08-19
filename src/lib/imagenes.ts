// Transformación de imágenes de Supabase Storage (bucket público `articulos`).
// Convierte una URL pública en una URL renderizada al ancho pedido.

export function fotoTransformada(url: string | null, ancho = 400): string | null {
  if (!url) return null
  try {
    if (url.includes('/storage/v1/render/image/')) {
      const u = new URL(url)
      u.searchParams.set('width', String(ancho))
      u.searchParams.set('quality', '75')
      return u.toString()
    }
    if (url.includes('/storage/v1/object/public/')) {
      const u = new URL(url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/'))
      u.searchParams.set('width', String(ancho))
      u.searchParams.set('quality', '75')
      u.searchParams.set('resize', 'cover')
      return u.toString()
    }
    return url
  } catch {
    return url
  }
}
