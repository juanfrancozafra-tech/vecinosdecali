/**
 * Dirección pública del sitio, para armar URLs absolutas.
 *
 * Hace falta por dos razones distintas, y cada una tiene su fuente.
 *
 * Las etiquetas `og:` las lee el servidor de WhatsApp o de Facebook, no el
 * navegador del vecino. Una ruta relativa como "/og-image.jpg" no le dice nada
 * a ese servidor, así que la vista previa del enlace sale sin imagen. Eso se
 * arma durante el renderizado del lado del servidor, donde no hay ninguna
 * dirección a la mano: ahí manda `VITE_SITIO_URL`.
 *
 * En el navegador es al revés. La dirección desde la que se está sirviendo la
 * página es la única que con seguridad le funciona a quien reciba el enlace, y
 * —esto es lo que importa— no puede quedar desactualizada.
 *
 * Antes el navegador también leía `VITE_SITIO_URL`, y salió caro: al mudar el
 * sitio a su dominio propio la variable quedó apuntando a la dirección vieja, y
 * cada enlace compartido desde la app llevó a la anterior. Sin error, sin
 * síntoma, sin forma de notarlo desde adentro. Del lado del cliente esa clase
 * de falla ya no puede repetirse: si la página se sirve desde el dominio bueno,
 * el enlace sale con el dominio bueno.
 *
 * Se le quita el "www." para que circule una sola dirección y no dos.
 */
export function sitioUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace("://www.", "://");
  }
  const configurada = import.meta.env["VITE_SITIO_URL"];
  if (typeof configurada === "string" && configurada.trim()) {
    return configurada.trim().replace(/\/+$/, "").replace("://www.", "://");
  }
  return "";
}

/** Convierte "/algo" en "https://dominio/algo". Devuelve la ruta tal cual si
 *  todavía no se sabe cuál es el dominio. */
export function urlAbsoluta(ruta: string): string {
  const base = sitioUrl();
  const limpia = ruta.startsWith("/") ? ruta : `/${ruta}`;
  return base ? `${base}${limpia}` : limpia;
}
