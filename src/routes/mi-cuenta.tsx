import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RutaProtegida } from "@/components/RutaProtegida";
import { SelectorBarrio } from "@/components/SelectorBarrio";
import { CampoWhatsapp } from "@/components/CampoWhatsapp";
import { db, mensajeDeError } from "@/lib/db";
import type { RolVecino } from "@/lib/database.types";
import { digitosWhatsapp, errorWhatsapp, normalizarWhatsapp, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/mi-cuenta")({
  ssr: false,
  component: () => (
    <RutaProtegida>
      <MiCuenta />
    </RutaProtegida>
  ),
  head: () => ({
    meta: [
      { title: "Mi cuenta — Vecinos de Cali" },
      {
        name: "description",
        content: "Actualizá tu nombre, tu WhatsApp y el tipo de cuenta en Vecinos de Cali.",
      },
      { property: "og:title", content: "Mi cuenta — Vecinos de Cali" },
      {
        property: "og:description",
        content: "Actualizá tu nombre, tu WhatsApp y el tipo de cuenta en Vecinos de Cali.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const MAX_SITUACION = 300;

function MiCuenta() {
  const { perfil, whatsapp, refrescarPerfil, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const rol = (perfil?.rol_principal ?? "doy") as RolVecino;

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [barrioId, setBarrioId] = useState<number | null>(null);
  const [situacion, setSituacion] = useState("");
  const [errorTelefono, setErrorTelefono] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Cambio de tipo de cuenta
  const [cambiando, setCambiando] = useState(false);
  const [nuevoBarrioId, setNuevoBarrioId] = useState<number | null>(null);
  const [nuevaSituacion, setNuevaSituacion] = useState("");
  const [guardandoRol, setGuardandoRol] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const rolDestino: RolVecino = rol === "doy" ? "recibo" : "doy";

  useEffect(() => {
    setNombre(perfil?.nombre ?? "");
    setBarrioId(perfil?.barrio_id ?? null);
    setSituacion(perfil?.mi_situacion ?? "");
  }, [perfil?.nombre, perfil?.barrio_id, perfil?.mi_situacion]);

  useEffect(() => {
    setTelefono(whatsapp ? digitosWhatsapp(whatsapp) : "");
  }, [whatsapp]);

  // La entrada a moderación solo aparece si soy_admin() es verdadero.
  useEffect(() => {
    let activo = true;
    db.rpc("soy_admin").then(({ data }) => {
      if (activo) setEsAdmin(data === true);
    });
    return () => {
      activo = false;
    };
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const errTel = errorWhatsapp(telefono);
    setErrorTelefono(errTel);
    if (errTel) return;
    if (!nombre.trim()) {
      toast.error("Escribí tu nombre.");
      return;
    }
    setGuardando(true);
    try {
      const { error: errorPerfil } = await db
        .from("perfiles")
        .update({
          nombre: nombre.trim(),
          ...(rol === "doy" ? { barrio_id: barrioId } : { mi_situacion: situacion.trim() }),
        })
        .eq("id", perfil!.id);
      if (errorPerfil) throw errorPerfil;

      const { error: errorContacto } = await db
        .from("contactos")
        .upsert(
          { perfil_id: perfil!.id, whatsapp: normalizarWhatsapp(telefono) },
          { onConflict: "perfil_id" },
        );
      if (errorContacto) {
        const msg = mensajeDeError(errorContacto);
        if (/duplicad|duplicate|unique|ya está/i.test(msg)) {
          setErrorTelefono("Ese número ya está registrado en otra cuenta.");
          setGuardando(false);
          return;
        }
        throw errorContacto;
      }

      await refrescarPerfil();
      toast.success("Listo, guardamos tus cambios.");
    } catch (error) {
      toast.error(mensajeDeError(error));
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarTipoDeCuenta() {
    if (rolDestino === "doy" && !nuevoBarrioId) {
      toast.error("Elegí tu barrio.");
      return;
    }
    if (rolDestino === "recibo" && !nuevaSituacion.trim()) {
      toast.error("Contanos qué estás buscando.");
      return;
    }
    setGuardandoRol(true);
    try {
      const { error } = await db.rpc("cambiar_rol", {
        p_rol: rolDestino,
        p_barrio_id: rolDestino === "doy" ? nuevoBarrioId : null,
        p_situacion: rolDestino === "recibo" ? nuevaSituacion.trim() : null,
      });
      if (error) throw error;
      await refrescarPerfil();
      setCambiando(false);
      toast.success("Cambiamos el tipo de tu cuenta.");
    } catch (error) {
      toast.error(mensajeDeError(error));
    } finally {
      setGuardandoRol(false);
    }
  }

  async function salir() {
    await cerrarSesion();
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="mx-auto w-full max-w-sm px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mi cuenta</h1>

        <form onSubmit={guardar} className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nombre">Tu nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="h-12 rounded-xl text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <CampoWhatsapp
              valor={telefono}
              alCambiar={(v) => {
                setTelefono(v);
                setErrorTelefono(errorWhatsapp(v));
              }}
              hayError={Boolean(errorTelefono)}
            />
            {errorTelefono ? (
              <p className="text-sm text-destructive">{errorTelefono}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Solo lo verá el vecino con quien inicies una conversación. Nunca aparece en tus
                publicaciones.
              </p>
            )}
          </div>

          {rol === "doy" ? (
            <div className="space-y-2">
              <Label>Tu barrio</Label>
              <SelectorBarrio valor={barrioId} onChange={setBarrioId} />
              <p className="text-sm text-muted-foreground">
                Para que un vecino sepa si le queda cerca. No pedimos tu dirección.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="situacion">Mi situación</Label>
              <Textarea
                id="situacion"
                rows={5}
                maxLength={MAX_SITUACION}
                value={situacion}
                onChange={(e) => setSituacion(e.target.value.slice(0, MAX_SITUACION))}
                className="rounded-xl text-base"
              />
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Contales a los vecinos qué estás buscando y por qué.
                </p>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {situacion.length}/{MAX_SITUACION}
                </span>
              </div>
            </div>
          )}

          <Button type="submit" className="h-12 w-full rounded-xl text-body" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Button>
        </form>

        <section className="mt-10 rounded-xl border border-border p-4">
          <h2 className="text-body font-medium text-foreground">Cambiar el tipo de cuenta</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {rol === "doy"
              ? "Hoy estás regalando cosas. Podés pasar a pedir lo que necesitás."
              : "Hoy estás pidiendo cosas. Podés pasar a regalar lo que ya no usás."}
          </p>

          {cambiando ? (
            <div className="mt-4 space-y-4">
              {rolDestino === "doy" ? (
                <div className="space-y-2">
                  <Label>Tu barrio</Label>
                  <SelectorBarrio valor={nuevoBarrioId} onChange={setNuevoBarrioId} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="nueva-situacion">Mi situación</Label>
                  <Textarea
                    id="nueva-situacion"
                    rows={4}
                    maxLength={MAX_SITUACION}
                    value={nuevaSituacion}
                    onChange={(e) => setNuevaSituacion(e.target.value.slice(0, MAX_SITUACION))}
                    className="rounded-xl text-base"
                  />
                  <span className="block text-right text-sm tabular-nums text-muted-foreground">
                    {nuevaSituacion.length}/{MAX_SITUACION}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="h-11 flex-1 rounded-xl"
                  onClick={cambiarTipoDeCuenta}
                  disabled={guardandoRol}
                >
                  {guardandoRol ? "Cambiando…" : "Confirmar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-xl"
                  onClick={() => setCambiando(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-11 w-full rounded-xl"
              onClick={() => setCambiando(true)}
            >
              {rolDestino === "doy" ? "Quiero regalar algo" : "Necesito algo"}
            </Button>
          )}
        </section>

        {esAdmin ? (
          <Button asChild variant="outline" className="mt-6 h-11 w-full rounded-xl">
            <Link to="/moderacion">Moderación</Link>
          </Button>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          className="mt-8 h-11 w-full rounded-xl text-muted-foreground"
          onClick={salir}
        >
          Cerrar sesión
        </Button>
      </div>
    </main>
  );
}
