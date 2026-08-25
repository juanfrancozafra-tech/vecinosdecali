import { useId } from "react";

/**
 * Marca de Vecinos de Cali — «Encuentro».
 *
 * Dos formas idénticas, del mismo tamaño, que se solapan. Lo que comparten
 * queda en el medio y es más oscuro que cualquiera de las dos.
 *
 * Las tres decisiones del dibujo son las mismas del hero, dichas en geometría:
 * son iguales en tamaño —nadie mira hacia abajo a nadie—, están a la misma
 * altura, y lo que comparten está en el centro exacto, no más cerca de una que
 * de la otra.
 *
 * No es una casa a propósito. 05-landing-page.md descarta esa imagen: dibujar
 * una casa cuando la gente que llega perdió la suya es un error de fondo.
 *
 * `sobreViolet` es la versión para fondos oscuros: el violeta-600 sobre
 * violeta-600 desaparece.
 */
export function Logo({
  className = "h-[26px] w-[26px]",
  sobreViolet = false,
}: {
  className?: string;
  sobreViolet?: boolean;
}) {
  // El clipPath necesita un id único: si el logo aparece dos veces en la misma
  // página, los ids repetidos hacen que la segunda copia se recorte con la
  // primera.
  const id = useId();

  const izquierda = sobreViolet ? "#CECBF6" : "#7F77DD";
  const derecha = sobreViolet ? "#FFFFFF" : "#534AB7";
  const encuentro = sobreViolet ? "#8E86E8" : "#26215C";

  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <rect x="4" y="24" width="52" height="52" rx="15" />
        </clipPath>
      </defs>
      <rect x="4" y="24" width="52" height="52" rx="15" fill={izquierda} />
      <rect x="44" y="24" width="52" height="52" rx="15" fill={derecha} />
      <g clipPath={`url(#${id})`}>
        <rect x="44" y="24" width="52" height="52" rx="15" fill={encuentro} />
      </g>
    </svg>
  );
}
