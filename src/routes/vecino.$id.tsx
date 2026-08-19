// Perfil público de un vecino. Requiere sesión.
// Se lee SOLO de la vista `perfiles_vecinos`: nunca de `perfiles`,
// y nunca se muestra WhatsApp ni correo.
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Flag, Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ModalReporte } from '@/components/ModalReporte'
import { RutaProtegida } from '@/components/RutaProtegida'
import { db } from '@/lib/db'
import { fotoTransformada } from '@/lib/imagenes'
import type { ArticuloPublico, NivelVecino, PerfilVecino } from '@/lib/database.types'

const ETIQUETA_NIVEL: Record<NivelVecino, string> = {
  nuevo: 'Vecino nuevo',
  verificado: 'Vecino verificado',
  conocido: 'Vecino conocido',
}

type Comentario = {
  id: string
  estrellas: number
  comentario: string | null
  creada_en: string
  autor: string | null
}

export const Route = createFileRoute('/vecino/$id')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Perfil de un vecino — Vecinos de Cali' },
      {
        name: 'description',
        content:
          'Mirá el nivel, las entregas confirmadas y las cosas que está regalando este vecino de Cali.',
      },
      { property: 'og:title', content: 'Perfil de un vecino — Vecinos de Cali' },
      {
        property: 'og:description',
        content:
          'Mirá el nivel, las entregas confirmadas y las cosas que está regalando este vecino de Cali.',
      },
      { property: 'og:type', content: 'profile' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: () => (
    <RutaProtegida permitirPerfilIncompleto>
      <PerfilDelVecino />
    </RutaProtegida>
  ),
})

function PerfilDelVecino() {
  const { id } = Route.useParams()
  const [cargando, setCargando] = useState(true)
  const [vecino, setVecino] = useState<PerfilVecino | null>(null)
  const [articulos, setArticulos] = useState<ArticuloPublico[]>([])
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [reportando, setReportando] = useState(false)

  useEffect(() => {
    let activo = true
    setCargando(true)
    ;(async () => {
      const { data } = await db.from('perfiles_vecinos').select('*').eq('id', id).maybeSingle()
      if (!activo) return
      setVecino((data as PerfilVecino | null) ?? null)
      setCargando(false)

      const [{ data: cosas }, { data: calis }] = await Promise.all([
        db
          .from('articulos_publicos')
          .select('*')
          .eq('donante_id', id)
          .eq('estado', 'disponible')
          .order('creado_en', { ascending: false }),
        db
          .from('calificaciones')
          .select('id, estrellas, comentario, creada_en, autor_id')
          .eq('destinatario_id', id)
          .order('creada_en', { ascending: false })
          .limit(20),
      ])
      if (!activo) return
      setArticulos((cosas ?? []) as ArticuloPublico[])

      const filas = (calis ?? []) as {
        id: string
        estrellas: number
        comentario: string | null
        creada_en: string
        autor_id: string
      }[]
      const autores = Array.from(new Set(filas.map((f) => f.autor_id)))
      let nombres: Record<string, string | null> = {}
      if (autores.length) {
        const { data: perfiles } = await db
          .from('perfiles_vecinos')
          .select('id, nombre')
          .in('id', autores)
        for (const p of (perfiles ?? []) as { id: string; nombre: string | null }[]) {
          nombres[p.id] = p.nombre
        }
      }
      if (!activo) return
      setComentarios(
        filas.map((f) => ({
          id: f.id,
          estrellas: f.estrellas,
          comentario: f.comentario,
          creada_en: f.creada_en,
          autor: nombres[f.autor_id] ?? null,
        })),
      )
    })()
    return () => {
      activo = false
    }
  }, [id])

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Un momento…</p>
      </div>
    )
  }

  if (!vecino) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-[22px] font-semibold text-foreground">Este vecino ya no está</h1>
          <Button asChild className="mt-6 h-12 rounded-xl px-6">
            <Link to="/articulos">Ver el catálogo</Link>
          </Button>
        </div>
      </div>
    )
  }

  const mostrarBarrio = vecino.rol_principal === 'doy' && Boolean(vecino.barrio)
  const conComentario = comentarios.filter((c) => c.comentario && c.comentario.trim())

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link to="/articulos" className="text-[13px] text-muted-foreground">
            ← Catálogo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center gap-4">
          <span className="size-20 shrink-0 overflow-hidden rounded-full bg-muted">
            {vecino.foto_url ? (
              <img
                src={fotoTransformada(vecino.foto_url, 200) ?? vecino.foto_url}
                alt={vecino.nombre ?? 'Vecino'}
                className="size-full object-cover"
              />
            ) : null}
          </span>
          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold text-foreground">
              {vecino.nombre ?? 'Un vecino'}
            </h1>
            <p className="mt-1 inline-block rounded-lg bg-secondary px-2.5 py-1 text-[13px] font-medium text-secondary-foreground">
              {ETIQUETA_NIVEL[vecino.nivel]}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Miembro desde hace {tiempoDesde(vecino.creado_en)}
              {mostrarBarrio ? ` · ${vecino.barrio}` : ''}
            </p>
          </div>
        </div>

        {vecino.mi_situacion && vecino.mi_situacion.trim() ? (
          <section className="mt-6 rounded-xl border border-border p-4">
            <h2 className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
              Mi situación
            </h2>
            <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed text-foreground">
              {vecino.mi_situacion}
            </p>
          </section>
        ) : null}

        <section className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-[22px] font-semibold tabular-nums text-foreground">
              {vecino.entregas_confirmadas}
            </p>
            <p className="text-[13px] text-muted-foreground">artículos entregados</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-[22px] font-semibold tabular-nums text-foreground">
              {vecino.recibidos_confirmados}
            </p>
            <p className="text-[13px] text-muted-foreground">artículos recibidos</p>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-[17px] font-medium text-foreground">Calificación</h2>
          {vecino.calificacion != null && vecino.num_calificaciones > 0 ? (
            <div className="mt-2 flex items-center gap-2">
              <Star className="size-4 fill-current text-primary" />
              <span className="text-[17px] font-medium tabular-nums text-foreground">
                {vecino.calificacion.toFixed(1)}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {vecino.num_calificaciones === 1
                  ? '1 calificación'
                  : `${vecino.num_calificaciones} calificaciones`}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-[15px] text-muted-foreground">Todavía no tiene calificaciones.</p>
          )}

          {conComentario.length ? (
            <ul className="mt-4 space-y-3">
              {conComentario.map((c) => (
                <li key={c.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={
                          i < c.estrellas
                            ? 'size-3.5 fill-current text-primary'
                            : 'size-3.5 text-muted-foreground'
                        }
                      />
                    ))}
                    <span className="ml-2 text-[13px] text-muted-foreground">
                      {c.autor ?? 'Un vecino'}
                    </span>
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed text-foreground">{c.comentario}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="mt-8">
          <h2 className="text-[17px] font-medium text-foreground">
            {articulos.length ? 'Lo que está regalando' : 'No tiene nada publicado ahora'}
          </h2>
          {articulos.length ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {articulos.map((a) => (
                <Link
                  key={a.id}
                  to="/articulos/$id"
                  params={{ id: a.id }}
                  className="overflow-hidden rounded-xl border border-border"
                >
                  <span className="block aspect-square w-full bg-muted">
                    {a.foto_portada ? (
                      <img
                        src={fotoTransformada(a.foto_portada, 400) ?? a.foto_portada}
                        alt={a.titulo}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="block px-3 py-2 text-[15px] font-medium text-foreground">
                    {a.titulo}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <button
          type="button"
          onClick={() => setReportando(true)}
          className="mt-10 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground underline"
        >
          <Flag className="size-3.5" />
          Reportar a este vecino
        </button>
      </main>

      <ModalReporte abierto={reportando} onOpenChange={setReportando} perfilId={vecino.id} />
    </div>
  )
}

function tiempoDesde(fecha: string): string {
  const dias = Math.max(
    0,
    Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24)),
  )
  if (dias < 1) return 'unas horas'
  if (dias === 1) return '1 día'
  if (dias < 30) return `${dias} días`
  const meses = Math.floor(dias / 30)
  if (meses === 1) return '1 mes'
  if (meses < 12) return `${meses} meses`
  const anios = Math.floor(meses / 12)
  return anios === 1 ? '1 año' : `${anios} años`
}
