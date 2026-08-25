// Envoltorio de las páginas legales. Medida angosta, tipografía del sistema y
// nada de decoración: son documentos para leer, no pantallas de producto.
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function PaginaLegal({
  titulo,
  actualizado,
  children,
}: {
  titulo: string;
  actualizado: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="mx-auto w-full max-w-[680px] px-4 pt-8 lg:px-8">
        <h1 className="text-title font-semibold tracking-[-0.01em] text-foreground">{titulo}</h1>
        <p className="mt-2 text-small text-faint">Última actualización: {actualizado}</p>

        <div className="mt-8 space-y-6 text-suave leading-[1.6] text-muted-foreground">
          {children}
        </div>

        <div className="mt-12 border-t border-border pt-6 text-small text-muted-foreground">
          <Link to="/" className="underline hover:text-foreground">
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}

export function Apartado({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-body font-semibold text-foreground">{titulo}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Lista({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}
