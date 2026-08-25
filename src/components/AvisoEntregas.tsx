// Aviso de entregas sin confirmar, dentro de Mis publicaciones.
//
// Antes era una franja pegada arriba de todo, encima de la marca, en todas las
// pantallas. Un aviso que se pone por encima del encabezado compite con la
// identidad del sitio y aparece donde la persona no puede hacer nada al
// respecto. Acá está en el único lugar donde sirve, que es donde se resuelve.
//
// Y no se calcula aparte: sale de los mismos artículos que la pantalla ya
// cargó. Por eso desaparece solo en cuanto la entrega se confirma — no hay dos
// fuentes que puedan quedar diciendo cosas distintas.
import { Link } from "@tanstack/react-router";
import { PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AvisoEntregas({ reservados }: { reservados: { id: string; titulo: string }[] }) {
  if (reservados.length === 0) return null;

  const uno = reservados.length === 1;
  const primero = reservados[0]!;

  return (
    <div className="mt-4 flex gap-3 rounded-xl border border-[#E8D9BE] bg-aviso p-4 text-aviso-foreground">
      <PackageCheck className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.8} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">
          {uno ? "Tenés una entrega sin confirmar" : `Tenés ${reservados.length} entregas sin confirmar`}
        </p>
        <p className="mt-1 text-chip leading-relaxed">
          {uno
            ? `Cuando le entregues «${primero.titulo}», decinos a quién se lo diste. Así se cierra el ciclo y los dos suben de nivel.`
            : "Cuando entregues cada cosa, decinos a quién se la diste. Así se cierra el ciclo y los dos suben de nivel."}
        </p>
        {uno ? (
          <Button asChild size="sm" variant="outline" className="mt-3 bg-white">
            <Link
              to="/mis-publicaciones/$id"
              params={{ id: primero.id }}
              search={{ confirmar: true }}
            >
              Confirmar la entrega
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
