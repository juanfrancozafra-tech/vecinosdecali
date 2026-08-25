// La pantalla donde se decide a quién le llega el artículo.
// Requiere sesión, perfil completo y rol 'doy'.
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { RutaProtegida } from '@/components/RutaProtegida'
import { FlujoEntrega } from '@/components/FlujoEntrega'

import { cn } from '@/lib/utils'
import { db, mensajeDeError } from '@/lib/db'
import { fotoTransformada } from '@/lib/imagenes'
import { useAuth } from '@/lib/auth'
import type {
  Articulo,
  EstadoArticulo,
  NivelVecino,
  PerfilVecino,
  Solicitud,
} from '@/lib/database.types'

const ETIQUETA_ESTADO: Record<EstadoArticulo, string> = {
  disponible: 'Publicado',
  reservado: 'Reservado',
  entregado: 'Entregado',
  retirado: 'Retirado',
  oculto: 'Oculto',
}

const COLOR_ESTADO: Record<EstadoArticulo, string> = {
  disponible: 'bg-primary/10 text-primary',
  reservado: 'bg-aviso text-aviso-foreground',
  entregado: 'bg-emerald-100 text-emerald-800',
  retirado: 'bg-muted text-muted-foreground',
  oculto: 'bg-muted text-muted-foreground',
}

const ETIQUETA_NIVEL: Record<NivelVecino, string> = {
  nuevo: 'Vecino nuevo',
  verificado: 'Vecino verificado',
  conocido: 'Vecino conocido',
}

export const Route = createFileRoute('/mis-publicaciones/$id')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { confirmar?: boolean } =>
    search['confirmar'] === true || search['confirmar'] === 'true'
      ? { confirmar: true }
      : {},
  component: () => (
    <RutaProtegida>
      <Publicacion />
    </RutaProtegida>
  ),
  head: () => ({
    meta: [
      { title: 'Solicitudes de tu publicación — Vecinos de Cali' },
      {
        name: 'description',
        content:
          'Mirá quién te pidió tu artículo, leé su situación y elegí a quién se lo entregás.',
      },
      { property: 'og:title', content: 'Solicitudes de tu publicación — Vecinos de Cali' },
      {
        property: 'og:description',
        content: 'Leé la situación de cada vecino y elegí a quién le llega tu artículo.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
})

type SolicitudConVecino = Solicitud & { vecino: PerfilVecino | null }

function miembroDesde(fecha: string): string {
  const dias = Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000))
  if (dias < 1) return 'hoy'
  if (dias === 1) return '1 día'
  if (dias < 30) return `${dias} días`
  const meses = Math.floor(dias / 30)
  if (meses === 1) return '1 mes'
  if (meses < 12) return `${meses} meses`
  const anios = Math.floor(meses / 12)
  return anios === 1 ? '1 año' : `${anios} años`
}

function horasRestantes(hasta: string | null): number | null {
  if (!hasta) return null
  const ms = new Date(hasta).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.ceil(ms / 3600000))
}

function urlArticulo(id: string): string {
  const origen = typeof window === 'undefined' ? '' : window.location.origin
  return `${origen}/articulos/${id}`
}

function abrirWhatsApp(whatsapp: string, mensaje: string) {
  const numero = whatsapp.replace(/[^\d]/g, '')
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function Publicacion() {
  const { id } = Route.useParams()
  const { usuario, perfil } = useAuth()
  const navigate = useNavigate()
  const [articulo, setArticulo] = useState<Articulo | null | undefined>(undefined)
  const [foto, setFoto] = useState<string | null>(null)
  const [solicitudes, setSolicitudes] = useState<SolicitudConVecino[]>([])
  const [aceptada, setAceptada] = useState<SolicitudConVecino | null>(null)
  const [porDescartar, setPorDescartar] = useState<SolicitudConVecino | null>(null)
  const [porAceptar, setPorAceptar] = useState<SolicitudConVecino | null>(null)
  const [abriendo, setAbriendo] = useState(false)
  const [confirmandoEntrega, setConfirmandoEntrega] = useState(false)
  const [noApareceAbierto, setNoApareceAbierto] = useState(false)
  const [trabajando, setTrabajando] = useState(false)

  const cargar = useCallback(async () => {
    if (!usuario) return
    const { data, error } = await db
      .from('articulos')
      .select('*')
      .eq('id', id)
      .eq('donante_id', usuario.id)
      .maybeSingle()
    if (error) toast.error(mensajeDeError(error))
    const art = (data as Articulo | null) ?? null
    setArticulo(art)
    if (!art) return

    const { data: fotos } = await db
      .from('articulo_fotos')
      .select('url, orden')
      .eq('articulo_id', art.id)
      .order('orden', { ascending: true })
      .limit(1)
    setFoto(((fotos ?? [])[0] as { url: string } | undefined)?.url ?? null)

    const { data: filas } = await db
      .from('solicitudes')
      .select('*')
      .eq('articulo_id', art.id)
      .order('creada_en', { ascending: true })
    const lista = (filas ?? []) as Solicitud[]
    const ids = Array.from(new Set(lista.map((s) => s.solicitante_id)))
    let vecinos: Record<string, PerfilVecino> = {}
    if (ids.length > 0) {
      const { data: perfiles } = await db.from('perfiles_vecinos').select('*').in('id', ids)
      for (const p of (perfiles ?? []) as PerfilVecino[]) vecinos = { ...vecinos, [p.id]: p }
    }
    const conVecino: SolicitudConVecino[] = lista.map((s) => ({
      ...s,
      vecino: vecinos[s.solicitante_id] ?? null,
    }))
    setSolicitudes(conVecino.filter((s) => s.estado === 'pendiente'))
    setAceptada(conVecino.find((s) => s.estado === 'aceptada') ?? null)
  }, [id, usuario])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // Si llegó desde la franja de pendientes, abrimos el flujo de confirmación.
  const { confirmar } = Route.useSearch()
  useEffect(() => {
    if (confirmar && articulo?.estado === 'reservado') setConfirmandoEntrega(true)
  }, [confirmar, articulo?.estado])

  // Antes esto filtraba contra una lista en memoria: descartar solo escondía la
  // solicitud en esta sesión. El otro vecino seguía viendo "pendiente" para
  // siempre, y al recargar la tarjeta volvía. Ahora `rechazar_solicitud` la
  // cierra de verdad en la base y `cargar()` trae la lista ya sin ella.
  const pendientes = solicitudes

  const descartar = async () => {
    if (!porDescartar) return
    setTrabajando(true)
    const { error } = await db.rpc('rechazar_solicitud', { p_solicitud_id: porDescartar.id })
    setTrabajando(false)
    if (error) {
      toast.error(mensajeDeError(error))
      return
    }
    setPorDescartar(null)
    void cargar()
  }

  const aceptar = async () => {
    if (!porAceptar || !articulo) return
    setAbriendo(true)
    const { data, error } = await db.rpc('aceptar_solicitud', { p_solicitud_id: porAceptar.id })
    setAbriendo(false)
    if (error) {
      toast.error(mensajeDeError(error))
      return
    }
    const fila = (Array.isArray(data) ? data[0] : data) as
      | { whatsapp: string; nombre: string }
      | undefined
    if (!fila?.whatsapp) {
      toast.error('No pudimos abrir WhatsApp. Volvé a intentarlo.')
      return
    }
    const mensaje = `Hola ${fila.nombre}, soy ${perfil?.nombre ?? 'un vecino'} de Vecinos de Cali. Te acepté la solicitud de ${articulo.titulo}. ¿Cuándo podés venir a recogerlo? Cuando lo tengas, te confirmo la entrega acá: ${urlArticulo(articulo.id)}`
    abrirWhatsApp(fila.whatsapp, mensaje)
    setPorAceptar(null)
    void cargar()
  }

  const reabrirWhatsApp = async () => {
    if (!aceptada || !articulo) return
    setTrabajando(true)
    const { data, error } = await db.rpc('obtener_whatsapp', { p_solicitud_id: aceptada.id })
    setTrabajando(false)
    if (error || !data) {
      toast.error(mensajeDeError(error))
      return
    }
    const nombre = aceptada.vecino?.nombre ?? 'vecino'
    const mensaje = `Hola ${nombre}, soy ${perfil?.nombre ?? 'un vecino'} de Vecinos de Cali. Te acepté la solicitud de ${articulo.titulo}. ¿Cuándo podés venir a recogerlo? Cuando lo tengas, te confirmo la entrega acá: ${urlArticulo(articulo.id)}`
    abrirWhatsApp(String(data), mensaje)
  }




  const noAparecio = async () => {
    if (!articulo) return
    setTrabajando(true)
    const { error } = await db.rpc('liberar_articulo', { p_articulo_id: articulo.id })
    setTrabajando(false)
    if (error) {
      toast.error(mensajeDeError(error))
      return
    }
    setNoApareceAbierto(false)
    toast.success('Tu artículo volvió al catálogo.')
    void cargar()
  }

  if (perfil?.rol_principal === 'recibo') {
    void navigate({ to: '/articulos', replace: true })
    return null
  }

  if (articulo === undefined) {
    return (
      <div className="min-h-screen space-y-3 bg-background px-4 pt-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (articulo === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-screen font-semibold text-foreground">Esta publicación no está</h1>
          <Button asChild className="mt-6 h-12 rounded-xl px-6">
            <Link to="/mis-publicaciones">Ver mis publicaciones</Link>
          </Button>
        </div>
      </div>
    )
  }

  const horas = horasRestantes(articulo.reservado_hasta)
  const nombreAceptado = aceptada?.vecino?.nombre ?? 'el vecino'

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="bg-background px-4 pb-4 pt-6">
        <Link to="/mis-publicaciones" className="text-chip text-primary">
          ← Mis publicaciones
        </Link>
        <div className="mt-4 flex gap-3">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
            {fotoTransformada(foto, 200) ? (
              <img
                src={fotoTransformada(foto, 200)!}
                alt={articulo.titulo}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[19px] font-semibold text-foreground">{articulo.titulo}</h1>
            <span
              className={cn(
                'mt-2 inline-block rounded-lg px-2 py-1 text-small font-medium',
                COLOR_ESTADO[articulo.estado],
              )}
            >
              {ETIQUETA_ESTADO[articulo.estado]}
            </span>
          </div>
        </div>
      </div>

      {articulo.estado === 'reservado' ? (
        <section className="px-4 pt-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-body text-foreground">
              Se lo aceptaste a <span className="font-semibold">{nombreAceptado}</span>.
            </p>
            {horas !== null ? (
              <p className="mt-2 text-chip text-muted-foreground">
                {horas === 0
                  ? 'La reserva está por vencerse; el artículo vuelve al catálogo solo.'
                  : `Faltan ${horas} ${horas === 1 ? 'hora' : 'horas'} para que vuelva al catálogo solo.`}
              </p>
            ) : null}
            <Button
              variant="outline"
              className="mt-4 h-12 w-full rounded-xl"
              disabled={trabajando}
              onClick={() => void reabrirWhatsApp()}
            >
              Abrir WhatsApp otra vez
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            <Button
              className="h-14 w-full rounded-xl text-body"
              onClick={() => setConfirmandoEntrega(true)}
            >
              Ya lo entregué
            </Button>
            <Button
              variant="outline"
              className="h-14 w-full rounded-xl text-body"
              onClick={() => setNoApareceAbierto(true)}
            >
              No apareció
            </Button>
          </div>
        </section>
      ) : articulo.estado === 'disponible' ? (
        <section className="px-4 pt-6">
          <h2 className="text-chip font-semibold text-foreground">
            {pendientes.length === 0
              ? 'Todavía no hay solicitudes'
              : pendientes.length === 1
                ? '1 solicitud'
                : `${pendientes.length} solicitudes`}
          </h2>
          {pendientes.length === 0 ? (
            <p className="mt-2 text-chip text-muted-foreground">
              Cuando un vecino lo pida, su solicitud te aparece acá con su situación.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {pendientes.map((s) => (
                <TarjetaSolicitud
                  key={s.id}
                  solicitud={s}
                  onDescartar={() => setPorDescartar(s)}
                  onAceptar={() => setPorAceptar(s)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="px-4 pt-8 text-center">
          <p className="text-body text-foreground">
            {articulo.estado === 'entregado'
              ? '¡Gracias! Este artículo ya llegó a un vecino.'
              : 'Este artículo no está en el catálogo.'}
          </p>
        </section>
      )}

      <Dialog open={porAceptar !== null} onOpenChange={(o) => !o && setPorAceptar(null)}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Antes de aceptar</DialogTitle>
            <DialogDescription className="space-y-3 pt-2 text-left text-body leading-relaxed text-foreground">
              <span className="block">
                Vas a abrir WhatsApp con {porAceptar?.vecino?.nombre ?? 'este vecino'}.
              </span>
              <span className="block">
                Acordá la entrega en la portería o en la puerta, de día. No dejés entrar a nadie a tu
                casa.
              </span>
              <span className="block">
                Las demás solicitudes se van a cerrar. Si{' '}
                {porAceptar?.vecino?.nombre ?? 'este vecino'} no aparece en 48 horas, tu artículo
                vuelve al catálogo solo.
              </span>
            </DialogDescription>
          </DialogHeader>
          <Button
            className="h-14 w-full rounded-xl text-body"
            disabled={abriendo}
            onClick={() => void aceptar()}
          >
            Abrir WhatsApp
          </Button>
        </DialogContent>
      </Dialog>

      {confirmandoEntrega ? (
        <FlujoEntrega
          articuloId={articulo.id}
          tituloArticulo={articulo.titulo}
          onCerrar={() => setConfirmandoEntrega(false)}
          onListo={() => {
            setConfirmandoEntrega(false)
            void cargar()
          }}
          onPublicarOtra={() => {
            setConfirmandoEntrega(false)
            void navigate({ to: '/publicar' })
          }}
        />
      ) : null}


      {/* Descartar no tiene vuelta atrás: la restricción única de la base impide
          que esa persona vuelva a pedir este mismo artículo. Por eso pregunta,
          igual que las demás acciones que no se pueden deshacer. */}
      <AlertDialog open={porDescartar !== null} onOpenChange={(o) => !o && setPorDescartar(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Descartar a {porDescartar?.vecino?.nombre ?? 'este vecino'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              No va a poder volver a pedir esta cosa, y le queda el puesto libre a otro vecino. No
              le llega ningún mensaje tuyo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-xl">Dejarlo en la lista</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 rounded-xl"
              disabled={trabajando}
              onClick={(e) => {
                e.preventDefault()
                void descartar()
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={noApareceAbierto} onOpenChange={setNoApareceAbierto}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿No apareció?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu artículo vuelve al catálogo y otros vecinos van a poder pedirlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-xl">Esperar un poco</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 rounded-xl"
              disabled={trabajando}
              onClick={(e) => {
                e.preventDefault()
                void noAparecio()
              }}
            >
              Volver a publicarlo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TarjetaSolicitud({
  solicitud,
  onDescartar,
  onAceptar,
}: {
  solicitud: SolicitudConVecino
  onDescartar: () => void
  onAceptar: () => void
}) {
  const v = solicitud.vecino
  const foto = fotoTransformada(v?.foto_url ?? null, 120)
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
          {foto ? <img src={foto} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <p className="text-body font-semibold text-foreground">{v?.nombre ?? 'Vecino'}</p>
      </div>

      {v?.mi_situacion ? (
        <p className="mt-3 text-body leading-relaxed text-foreground">{v.mi_situacion}</p>
      ) : null}

      {solicitud.mensaje ? (
        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-chip leading-relaxed text-foreground">
          {solicitud.mensaje}
        </p>
      ) : null}

      <div className="mt-3 space-y-1">
        {v ? (
          <span className="inline-block rounded-lg bg-primary/10 px-2 py-1 text-small font-medium text-primary">
            {ETIQUETA_NIVEL[v.nivel]}
          </span>
        ) : null}
        {v ? (
          <p className="text-chip text-muted-foreground">
            Miembro desde hace {miembroDesde(v.creado_en)}
          </p>
        ) : null}
        <p className="text-body font-semibold text-foreground">
          {v?.recibidos_confirmados === 1
            ? 'Ha recibido 1 artículo'
            : `Ha recibido ${v?.recibidos_confirmados ?? 0} artículos`}
        </p>
        <p className="flex items-center gap-1 text-chip text-muted-foreground">
          {v?.calificacion != null && (v?.num_calificaciones ?? 0) > 0 ? (
            <>
              <Star className="h-4 w-4 fill-current" aria-hidden />
              {v.calificacion.toFixed(1)} · {v.num_calificaciones}{' '}
              {v.num_calificaciones === 1 ? 'calificación' : 'calificaciones'}
            </>
          ) : (
            'Sin calificaciones todavía'
          )}
        </p>
      </div>

      <div className="mt-4 flex gap-3">
        <Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={onDescartar}>
          Descartar
        </Button>
        <Button className="h-12 flex-1 rounded-xl" onClick={onAceptar}>
          Aceptar
        </Button>
      </div>
    </article>
  )
}
