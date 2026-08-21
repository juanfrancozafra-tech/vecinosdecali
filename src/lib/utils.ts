import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Nombres de la escala tipográfica del proyecto, definida en styles.css.
 *
 * Hay que declararlos acá o tailwind-merge no sabe que `text-chip` es un
 * tamaño y no un color. Al no reconocerlos los mete en el mismo grupo que
 * `text-white` y descarta el que venga primero — en silencio, sin error y sin
 * aviso: la clase desaparece del HTML y el texto hereda 17 px.
 *
 * Pasó de verdad. Los chips del catálogo y las etiquetas de la navegación
 * inferior salían a 17 px porque el `cn()` que les ponía el color se estaba
 * comiendo el tamaño. Es difícil de ver leyendo el código, porque el código
 * se ve bien.
 */
const TAMANOS = [
  "display",
  "title",
  "screen",
  "lead",
  "topbar",
  "body",
  "request",
  "secondary",
  "tarjeta",
  "chip",
  "small",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TAMANOS] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
