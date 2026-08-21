// Navegación inferior de quien recibe. Dos destinos y nada más.
//
// Quien da no la tiene: su flujo empieza en una notificación o en "publicar",
// no en navegar. Quien recibe sí, porque su trabajo es buscar y después
// esperar, y esas son exactamente las dos pantallas.
//
// Va abajo porque esta app se usa con una sola mano, de pie, en la calle.
import { Link, useRouterState } from "@tanstack/react-router";
import { Search, ShoppingBag } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { usePendientes } from "@/lib/pendientes";
import { cn } from "@/lib/utils";

export function NavegacionRecibo() {
  const { usuario, perfil } = useAuth();
  const { aceptadas } = usePendientes();
  const ruta = useRouterState({ select: (s) => s.location.pathname });

  if (!usuario || perfil?.rol_principal !== "recibo") return null;

  const enCatalogo = ruta === "/articulos" || ruta === "/articulos/";
  const enSolicitudes = ruta.startsWith("/mis-solicitudes");
  const enVecino = ruta.startsWith("/vecino");

  // Solo donde navegar tiene sentido. En el detalle del artículo no aparece:
  // ahí manda la barra de acción, y dos barras apiladas abajo dejarían el
  // botón de solicitar fuera del alcance del pulgar.
  if (!enCatalogo && !enSolicitudes && !enVecino) return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-[420px] border-t border-border bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Destino to="/articulos" etiqueta="Buscar" icono={Search} activo={enCatalogo} />
      <Destino
        to="/mis-solicitudes"
        etiqueta="Mis solicitudes"
        icono={ShoppingBag}
        activo={enSolicitudes}
        contador={aceptadas}
      />
    </nav>
  );
}

function Destino({
  to,
  etiqueta,
  icono: Icono,
  activo,
  contador = 0,
}: {
  to: string;
  etiqueta: string;
  icono: React.ComponentType<{ className?: string }>;
  activo: boolean;
  contador?: number;
}) {
  return (
    <Link
      to={to}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-[3px] px-1 pb-2 pt-2.5 text-small font-medium",
        activo ? "text-violet" : "text-faint",
      )}
    >
      <Icono className="size-[22px]" />
      <span>{etiqueta}</span>
      {contador > 0 ? (
        // Único sitio por debajo de 14 px en toda la app. Un contador no es
        // texto que haya que leer: es una señal, y lleva su propia etiqueta
        // accesible al lado.
        <span
          aria-label={`${contador} sin ver`}
          className="absolute left-[calc(50%+7px)] top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-violet px-1 text-[0.75rem] font-semibold leading-none text-white"
        >
          {contador}
        </span>
      ) : null}
    </Link>
  );
}
