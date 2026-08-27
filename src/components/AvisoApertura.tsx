// Franja de aviso mientras el lado que recibe está cerrado.
//
// Va encima de la franja de marca, no debajo: es una condición temporal de todo
// el sitio, no una acción de la pantalla. Y solo en la portada y el catálogo,
// que son las dos pantallas por donde llega la gente de afuera; repetirla en
// cada pantalla le come alto a un teléfono sin decir nada nuevo.
//
// Desaparece sola el 1 de septiembre.
import { useRouterState } from "@tanstack/react-router";

import { FECHA_APERTURA, recibirAbierto } from "@/lib/apertura";

export function AvisoApertura() {
  const ruta = useRouterState({ select: (s) => s.location.pathname });

  if (recibirAbierto()) return null;
  const enPortadaOCatalogo = ruta === "/" || ruta === "/articulos";
  if (!enPortadaOCatalogo) return null;

  return (
    <div className="bg-aviso text-aviso-foreground">
      <p className="mx-auto w-full max-w-[640px] px-4 py-2.5 text-center text-chip leading-relaxed sm:max-w-[760px] lg:max-w-[1040px] lg:px-8">
        Estamos reuniendo cosas para regalar. <strong className="font-semibold">
        Desde el {FECHA_APERTURA}</strong> se van a poder solicitar.
      </p>
    </div>
  );
}
