import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, mensajeDeError } from "@/lib/db";
import { tomarRutaOrigen, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/entrar")({
  ssr: false,
  component: Entrar,
  head: () => ({
    meta: [
      { title: "Entrar — Vecinos de Cali" },
      {
        name: "description",
        content: "Entrá a Vecinos de Cali con Google o con un enlace a tu correo.",
      },
      { property: "og:title", content: "Entrar — Vecinos de Cali" },
      {
        property: "og:description",
        content: "Entrá a Vecinos de Cali con Google o con un enlace a tu correo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Entrar() {
  const { usuario, perfil, perfilCompleto, cargando } = useAuth();
  const navigate = useNavigate();
  // `tomarRutaOrigen` consume el valor al leerlo. Si el efecto corre dos veces
  // —React lo hace en desarrollo— la segunda lectura devuelve null y manda a la
  // casa del rol en vez de al artículo del que la persona venía. Se lee una
  // sola vez y se recuerda.
  const destinoRef = useRef<string | null | undefined>(undefined);
  const [correo, setCorreo] = useState("");
  const [modoCorreo, setModoCorreo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (cargando || !usuario) return;
    if (!perfilCompleto) {
      navigate({ to: "/completar-perfil", replace: true });
      return;
    }
    if (destinoRef.current === undefined) destinoRef.current = tomarRutaOrigen();
    const destino = destinoRef.current;
    if (destino) {
      navigate({ to: destino, replace: true });
      return;
    }
    const casa = perfil?.rol_principal === "doy" ? "/mis-publicaciones" : "/articulos";
    navigate({ to: casa, replace: true });
  }, [cargando, usuario, perfil?.rol_principal, perfilCompleto, navigate]);

  async function entrarConGoogle() {
    setEnviando(true);
    const { error } = await db.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/entrar` },
    });
    if (error) {
      setEnviando(false);
      toast.error(mensajeDeError(error));
    }
  }

  async function enviarEnlace(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const { error } = await db.auth.signInWithOtp({
      email: correo.trim(),
      options: { emailRedirectTo: `${window.location.origin}/entrar` },
    });
    setEnviando(false);
    if (error) {
      toast.error(mensajeDeError(error));
      return;
    }
    setEnviado(true);
  }

  return (
    <main className="flex min-h-screen flex-col justify-center bg-background px-5 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Entrá a Vecinos de Cali
        </h1>
        <p className="mt-2 text-body leading-relaxed text-muted-foreground">
          Lo que a vos te sobra, a un vecino le cambia el día.
        </p>

        {enviado ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-5">
            <p className="text-body font-medium text-foreground">Revisá tu correo</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Te mandamos un enlace a <span className="font-medium">{correo}</span>. Abrilo desde
              este mismo celular o computador y ya quedás dentro.
            </p>
            <button
              type="button"
              onClick={() => setEnviado(false)}
              className="mt-4 text-sm text-primary underline"
            >
              Usar otro correo
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-xl text-body"
              disabled={enviando}
              onClick={entrarConGoogle}
            >
              Entrar con Google
            </Button>

            {modoCorreo ? (
              <form
                onSubmit={enviarEnlace}
                className="space-y-3 rounded-xl border border-border p-4"
              >
                <Label htmlFor="correo" className="text-sm">
                  Tu correo
                </Label>
                <Input
                  id="correo"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="vecino@correo.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="h-12 rounded-xl text-base"
                />
                <p className="text-sm text-muted-foreground">
                  Te llega un enlace para entrar sin contraseña.
                </p>
                <Button
                  type="submit"
                  variant="secondary"
                  className="h-11 w-full rounded-xl"
                  disabled={enviando}
                >
                  <Mail className="size-4" />
                  Mandame el enlace
                </Button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setModoCorreo(true)}
                className="w-full text-center text-sm text-muted-foreground underline"
              >
                O entrá con tu correo
              </button>
            )}
          </div>
        )}

        <p className="mt-8 text-small leading-relaxed text-muted-foreground">
          Al entrar aceptás nuestras{" "}
          {/* En pestaña nueva: quien está por entrar ya escribió su correo, y
              mandarlo a leer un documento legal en la misma pestaña le borra
              lo que llevaba. Volver del documento debería costar cerrar una
              pestaña, no rehacer el formulario. */}
          <Link to="/terminos" target="_blank" rel="noopener noreferrer" className="underline">
            términos
          </Link>{" "}
          y el{" "}
          <Link to="/datos" target="_blank" rel="noopener noreferrer" className="underline">
            tratamiento de tus datos
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
