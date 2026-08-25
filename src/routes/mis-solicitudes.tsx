// Lo que pedí. Requiere sesión y perfil completo.
// Quien recibe NUNCA inicia la conversación: acá no hay botón de abrir WhatsApp
// hacia el vecino que regala, solo el recordatorio de confirmar la entrega.
import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RutaProtegida } from '@/components/RutaProtegida'
import { cn } from '@/lib/utils'
import { db, mensajeDeError } from '@/lib/db'
import { fotoTransformada } from '@/lib/imagenes'
import { useAuth } from '@/lib/auth'
import type { ArticuloPublico, PerfilVecino, Solicitud } from '@/lib/database.types'

export const Route = createFileRoute('/mis-solicitudes')({
  ssr: false,
  component: () => (
    <RutaProtegida>
      <MisSolicitudes />
    </RutaProtegida>
  ),
  head: () => ({
    meta: [
      { title: 'Mis solicitudes — Vecinos de Cali' },
      {
        name: 'description',
        content:
          'Mirá en qué va cada cosa que pediste: quién te respondió, qué falta y qué ya recibiste.',
      },
      { property: 'og:title', content: 'Mis solicitudes — Vecinos de Cali' },
      {
        property: 'og:description',
        content: 'En qué va cada cosa que pediste a los vecinos de Cali.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
})

type Item = {
  solicitud: Solicitud
  articulo: ArticuloPublico | null
  vecino: PerfilVecino | null
  reservadoHasta: string | null
  otros: ArticuloPublico[]
}

type ClaveFiltro = 'todas' | 'activas' | 'recibidas' | 'cerradas'

const FILTROS: { clave: ClaveFiltro; etiqueta: string }[] = [
  { clave: 'todas', etiqueta: 'Todas' },
  { clave: 'activas', etiqueta: 'Activas' },
  { clave: 'recibidas', etiqueta: 'Recibidas' },
  { clave: 'cerradas', etiqueta: 'Cerradas' },
]

function pertenece(item: Item, filtro: ClaveFiltro): boolean {
  const e = item.solicitud.estado
  switch (filtro) {
    case 'todas':
      return true
    case 'activas':
      return e === 'pendiente' || e === 'aceptada'
    case 'recibidas':
      return e === 'completada'
    case 'cerradas':
      return e === 'rechazada' || e === 'expirada'
  }
}

function horasRestantes(hasta: string | null): number | null {
  if (!hasta) return null
  const ms = new Date(hasta).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.ceil(ms / 3600000))
}

function horasDesde(fecha: string | null): number | null {
  if (!fecha) return null
  const ms = Date.now() - new Date(fecha).getTime()
  if (Number.isNaN(ms)) return null
  return Math.floor(ms / 3600000)
}

function urlArticulo(id: string): string {
  const origen = typeof window === 'undefined' ? '' : window.location.origin
  return `${origen}/articulos/${id}`
}

function MisSolicitudes() {
  const { usuario, perfil } = useAuth()
  const [items, setItems] = useState<Item[] | null>(null)
  const [filtro, setFiltro] = useState<ClaveFiltro>('todas')
  const [calificando, setCalificando] = useState<Item | null>(null)

  const cargar = useCallback(async () => {
    if (!usuario) return
    const { data, error } = await db
      .from('solicitudes')
      .select('*')
      .eq('solicitante_id', usuario.id)
      .order('creada_en', { ascending: false })
    if (error) {
      toast.error(mensajeDeError(error))
      setItems([])
      return
    }
    const solicitudes = (data ?? []) as Solicitud[]
    if (solicitudes.length === 0) {
      setItems([])
      return
    }

    const idsArticulos = Array.from(new Set(solicitudes.map((s) => s.articulo_id)))
    const { data: filasArticulos } = await db
      .from('articulos_publicos')
      .select('*')
      .in('id', idsArticulos)
    const articulos = new Map<string, ArticuloPublico>()
    for (const a of (filasArticulos ?? []) as ArticuloPublico[]) articulos.set(a.id, a)

    const { data: reservas } = await db
      .from('articulos')
      .select('id, reservado_hasta')
      .in('id', idsArticulos)
    const hasta = new Map<string, string | null>()
    for (const r of (reservas ?? []) as { id: string; reservado_hasta: string | null }[]) {
      hasta.set(r.id, r.reservado_hasta)
    }

    const idsDonantes = Array.from(
      new Set(
        idsArticulos
          .map((id) => articulos.get(id)?.donante_id)
          .filter((v): v is string => Boolean(v)),
      ),
    )
    const vecinos = new Map<string, PerfilVecino>()
    if (idsDonantes.length > 0) {
      const { data: perfiles } = await db.from('perfiles_vecinos').select('*').in('id', idsDonantes)
      for (const p of (perfiles ?? []) as PerfilVecino[]) vecinos.set(p.id, p)
    }

    let otrosPorDonante = new Map<string, ArticuloPublico[]>()
    if (idsDonantes.length > 0) {
      const { data: otros } = await db
        .from('articulos_publicos')
        .select('*')
        .in('donante_id', idsDonantes)
        .eq('estado', 'disponible')
      otrosPorDonante = new Map()
      for (const a of (otros ?? []) as ArticuloPublico[]) {
        const lista = otrosPorDonante.get(a.donante_id) ?? []
        lista.push(a)
        otrosPorDonante.set(a.donante_id, lista)
      }
    }

    setItems(
      solicitudes.map((s) => {
        const articulo = articulos.get(s.articulo_id) ?? null
        const donante = articulo?.donante_id ?? null
        return {
          solicitud: s,
          articulo,
          vecino: donante ? vecinos.get(donante) ?? null : null,
          reservadoHasta: hasta.get(s.articulo_id) ?? null,
          otros: (donante ? otrosPorDonante.get(donante) ?? [] : []).filter(
            (a) => a.id !== s.articulo_id,
          ),
        }
      }),
    )
  }, [usuario])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const conteos = useMemo(() => {
    const base: Record<ClaveFiltro, number> = { todas: 0, activas: 0, recibidas: 0, cerradas: 0 }
    for (const item of items ?? []) {
      for (const f of FILTROS) if (pertenece(item, f.clave)) base[f.clave] += 1
    }
    return base
  }, [items])

  const visibles = useMemo(
    () => (items ?? []).filter((i) => pertenece(i, filtro)),
    [items, filtro],
  )

  if (perfil?.rol_principal === 'doy') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-screen font-semibold text-foreground">Esta cuenta regala cosas</h1>
          <p className="mt-3 text-body leading-relaxed text-foreground">
            Acá aparecen las solicitudes de quien recibe. Mirá{' '}
            <Link to="/mis-publicaciones" className="font-medium text-primary underline">
              tus publicaciones
            </Link>
            .
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto w-full max-w-2xl bg-background px-4 pb-3 pt-6">
        <h1 className="text-screen font-semibold text-foreground">Mis solicitudes</h1>
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTROS.map((f) => (
            <button
              key={f.clave}
              type="button"
              onClick={() => setFiltro(f.clave)}
              className={cn(
                'shrink-0 rounded-xl border px-3 py-2 text-chip font-medium transition-colors',
                filtro === f.clave
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground',
              )}
            >
              {f.etiqueta}
              <span
                className={cn(
                  'ml-2 text-small',
                  filtro === f.clave ? 'text-primary-foreground/80' : 'text-muted-foreground',
                )}
              >
                {conteos[f.clave]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {items === null ? (
        <div className="mx-auto w-full max-w-2xl space-y-3 px-4 pt-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <div className="mx-auto w-full max-w-2xl px-4 pt-16 text-center">
          <p className="text-body text-foreground">
            {items.length === 0 ? 'Todavía no pediste nada.' : 'Acá no hay nada por ahora.'}
          </p>
          <Button asChild className="mt-6 h-12 rounded-xl px-6">
            <Link to="/articulos">Buscar cosas</Link>
          </Button>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-5">
          {visibles.map((item) => (
            <TarjetaSolicitud
              key={item.solicitud.id}
              item={item}
              onCalificar={() => setCalificando(item)}
            />
          ))}
        </div>
      )}

      <ModalCalificar
        item={calificando}
        onCerrar={() => setCalificando(null)}
        onListo={() => {
          setCalificando(null)
          void cargar()
        }}
      />
    </div>
  )
}

function TarjetaSolicitud({
  item,
  onCalificar,
}: {
  item: Item
  onCalificar: () => void
}) {
  const { solicitud, articulo, vecino, otros } = item
  const [recordando, setRecordando] = useState(false)
  const nombreVecino = vecino?.nombre ?? 'el vecino'
  const titulo = articulo?.titulo ?? 'Un artículo'
  const foto = fotoTransformada(articulo?.foto_portada ?? null, 200)
  const horas = horasRestantes(item.reservadoHasta)
  const desdeAceptada = horasDesde(solicitud.respondida_en)

  const recordar = async () => {
    setRecordando(true)
    const { data, error } = await db.rpc('obtener_whatsapp', { p_solicitud_id: solicitud.id })
    setRecordando(false)
    if (error || !data) {
      toast.error(mensajeDeError(error))
      return
    }
    const mensaje = `Hola ${nombreVecino}, ya recogí ${titulo}. ¿Me confirmás la entrega en la app? Así me sube el nivel. ${urlArticulo(solicitud.articulo_id)}`
    window.open(
      `https://wa.me/${String(data).replace(/[^\d]/g, '')}?text=${encodeURIComponent(mensaje)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {foto ? <img src={foto} alt={titulo} className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          {articulo ? (
            <Link
              to="/articulos/$id"
              params={{ id: articulo.id }}
              className="block truncate text-body font-medium text-foreground"
            >
              {titulo}
            </Link>
          ) : (
            <p className="truncate text-body font-medium text-foreground">{titulo}</p>
          )}

          {solicitud.estado === 'pendiente' ? (
            <p className="mt-1 text-chip text-muted-foreground">
              Esperando respuesta de {nombreVecino}.
            </p>
          ) : null}
          {solicitud.estado === 'aceptada' ? (
            <p className="mt-1 text-chip font-medium text-primary">
              {horas !== null && horas > 0
                ? `Te lo aceptaron. Quedan ${horas} ${horas === 1 ? 'hora' : 'horas'}.`
                : 'Te lo aceptaron.'}
            </p>
          ) : null}
          {solicitud.estado === 'completada' ? (
            <p className="mt-1 text-chip text-foreground">
              Recibiste {titulo} de {nombreVecino}.
            </p>
          ) : null}
          {solicitud.estado === 'rechazada' || solicitud.estado === 'expirada' ? (
            <p className="mt-1 text-chip text-muted-foreground">
              {nombreVecino} eligió a otra persona. Seguí buscando.
            </p>
          ) : null}
        </div>
      </div>

      {solicitud.estado === 'aceptada' ? (
        <>
          <p className="mt-3 rounded-xl bg-aviso px-3 py-3 text-chip leading-relaxed text-aviso-foreground">
            {nombreVecino} te escribe por WhatsApp. Revisá tus mensajes y acordá dónde y cuándo
            recogerlo.
          </p>

          {otros.length > 0 ? (
            <div className="mt-3">
              <p className="text-chip text-foreground">
                {nombreVecino} también está regalando:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {otros.slice(0, 6).map((a) => (
                  <Link
                    key={a.id}
                    to="/articulos/$id"
                    params={{ id: a.id }}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-chip text-foreground"
                  >
                    {a.titulo}
                  </Link>
                ))}
              </div>
              <p className="mt-2 text-chip text-muted-foreground">
                Pedilas ahora y recogé todo en el mismo viaje.
              </p>
            </div>
          ) : null}

          {desdeAceptada !== null && desdeAceptada >= 12 ? (
            <Button
              variant="outline"
              className="mt-4 h-12 w-full rounded-xl"
              disabled={recordando}
              onClick={() => void recordar()}
            >
              Recordarle que confirme
            </Button>
          ) : null}
        </>
      ) : null}

      {solicitud.estado === 'rechazada' || solicitud.estado === 'expirada' ? (
        <Link
          to="/articulos"
          className="mt-3 inline-block text-chip font-medium text-primary underline"
        >
          Ver el catálogo
        </Link>
      ) : null}

      {solicitud.estado === 'completada' ? (
        <Button variant="outline" className="mt-3 h-12 w-full rounded-xl" onClick={onCalificar}>
          Calificar a {nombreVecino}
        </Button>
      ) : null}

    </article>
  )
}

function ModalCalificar({
  item,
  onCerrar,
  onListo,
}: {
  item: Item | null
  onCerrar: () => void
  onListo: () => void
}) {
  const [estrellas, setEstrellas] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (item) {
      setEstrellas(0)
      setComentario('')
    }
  }, [item])

  const enviar = async () => {
    if (!item?.articulo || estrellas === 0) return
    setEnviando(true)
    const { error } = await db.from('calificaciones').insert({
      articulo_id: item.articulo.id,
      destinatario_id: item.articulo.donante_id,
      estrellas,
      comentario: comentario.trim() || null,
    })
    setEnviando(false)
    if (error) {
      toast.error(mensajeDeError(error))
      return
    }
    toast.success('Gracias por calificar.')
    onListo()
  }

  return (
    <Dialog open={item !== null} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="rounded-xl">
        <DialogHeader>
          <DialogTitle>¿Cómo te fue con {item?.vecino?.nombre ?? 'tu vecino'}?</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center gap-2 pt-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} estrellas`}
              onClick={() => setEstrellas(n)}
              className="p-1"
            >
              <Star
                className={cn(
                  'h-10 w-10',
                  n <= estrellas ? 'fill-primary text-primary' : 'text-muted-foreground',
                )}
              />
            </button>
          ))}
        </div>
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value.slice(0, 300))}
          placeholder="¿Algo que quieras contar? (opcional)"
          className="min-h-24 rounded-xl text-body"
        />
        <p className="text-right text-small text-muted-foreground">{comentario.length}/300</p>
        <Button
          className="h-12 w-full rounded-xl text-body"
          disabled={estrellas === 0 || enviando}
          onClick={() => void enviar()}
        >
          Listo
        </Button>
      </DialogContent>
    </Dialog>
  )
}
