/**
 * Dirección pública del sitio, para armar URLs absolutas.
 *
 * Hace falta por dos razones distintas.
 *
 * Las etiquetas `og:` las lee el servidor de WhatsApp o de Facebook, no el
 * navegador del vecino. Una ruta relativa como "/og-image.jpg" no le dice nada
 * a ese servidor, así que la vista previa del enlace sale sin imagen.
 *
 * Y el enlace que se comparte de un artículo se armaba desde el origen actual,
 * así que desde el preview mandaba una dirección del preview.
 *
 * Las dos se resuelven con `VITE_SITIO_URL`. Mientras no esté definida, en el
 * navegador se usa el origen actual —correcto para todo lo del lado del
 * cliente— y en el servidor queda vacía, que es justo el caso que hay que
 * cerrar antes de abrir al público.
 */
export function sitioUrl(): string {
  const configurada = import.meta.env["VITE_SITIO_URL"];
  if (typeof configurada === "string" && configurada.trim()) {
    return configurada.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Convierte "/algo" en "https://dominio/algo". Devuelve la ruta tal cual si
 *  todavía no se sabe cuál es el dominio. */
export function urlAbsoluta(ruta: string): string {
  const base = sitioUrl();
  const limpia = ruta.startsWith("/") ? ruta : `/${ruta}`;
  return base ? `${base}${limpia}` : limpia;
}
