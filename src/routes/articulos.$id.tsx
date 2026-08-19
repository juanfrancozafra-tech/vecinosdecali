// Detalle de artículo. El artículo es público; la persona detrás, no.
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Flag, Share2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { ModalReporte } from '@/components/ModalReporte'
import { db, mensajeDeError } from '@/lib/db'
import { fotoTransformada } from '@/lib/imagenes'
import { guardarRutaOrigen, useAuth } from '@/lib/auth'
import type {
  ArticuloPublico,
  CondicionArticulo,
  NivelVecino,
  PerfilVecino,
} from '@/lib/database.types'

const ETIQUETA_CONDICION: Record<CondicionArticulo, string> = {
  nuevo: 'Nuevo',
  como_nuevo: 'Como nuevo',
  buen_estado: 'Buen estado',
  usado_con_detalles: 'Usado con detalles',
}

const ETIQUETA_NIVEL: Record<NivelVecino, string> = {
  nuevo: 'Vecino nuevo',
  verificado: 'Vecino verificado',
  conocido: 'Vecino conocido',
}

export const Route = createFileRoute('/articulos/$id')({
  loader: async ({ params }) => {
    const { data } = await db
      .from('articulos_publicos')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()
    const articulo = (data as ArticuloPublico | null) ?? null
    let fotos: string[] = []
    if (articulo) {
      const { data: filas } = await db
        .from('articulo_fotos')
        .select('url, orden')
        .eq('articulo_id', articulo.id)
        .order('orden', { ascending: true })
      fotos = (filas ?? []).map((f: { url: string }) => f.url)
      if (fotos.length === 0 && articulo.foto_portada) fotos = [articulo.foto_portada]
    }
    return { articulo, fotos }
  },
  head: ({ loaderData }) => {
    const articulo = loaderData?.articulo
    if (!articulo) {
      return {
        meta: [
          { title: 'Publicación no disponible — Vecinos de Cali' },
          { name: 'robots', content: 'noindex' },
        ],
      }
    }
    const titulo = `${articulo.titulo} — Vecinos de Cali`
    const descripcion =
      articulo.descripcion?.slice(0, 155) ??
      `${articulo.titulo} en ${articulo.barrio}. Lo regala un vecino de Cali.`
    const imagen = articulo.foto_portada
    return {
      meta: [
        { title: titulo },
        { name: 'description', content: descripcion },
        { property: 'og:title', content: titulo },
        { property: 'og:description', content: descripcion },
        { property: 'og:type', content: 'article' },
        { name: 'twitter:card', content: 'summary_large_image' },
        ...(imagen
          ? [
              { property: 'og:image', content: imagen },
              { name: 'twitter:image', content: imagen },
            ]
          : []),
      ],
    }
  },
  component: DetalleArticulo,
  errorComponent: NoDisponible,
  notFoundComponent: NoDisponible,
})

function NoDisponible() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-[22px] font-semibold text-foreground">Esta publicación ya no está</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Pero hay más cosas de otros vecinos.
        </p>
        <Button asChild className="mt-6 h-12 rounded-xl px-6">
          <Link to="/articulos">Ver el catálogo</Link>
        </Button>
      </div>
    </div>
  )
}

function DetalleArticulo() {
  const { articulo, fotos } = Route.useLoaderData()
  const { id } = Route.useParams()
  const { usuario, perfil, perfilCompleto } = useAuth()
  const navigate = useNavigate()
  const [vecino, setVecino] = useState<PerfilVecino | null>(null)
  const [yaSolicitado, setYaSolicitado] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [reportando, setReportando] = useState(false)

  const oculto =
    !articulo || articulo.estado === 'retirado' || articulo.estado === 'oculto'

  useEffect(() => {
    if (!usuario || !articulo) return
    let activo = true
    db.from('perfiles_vecinos')
      .select('*')
      .eq('id', articulo.donante_id)
      .maybeSingle()
      .then(({ data }) => {
        if (activo && data) setVecino(data as PerfilVecino)
      })
    db.from('solicitudes')
      .select('id, estado')
      .eq('articulo_id', articulo.id)
      .eq('solicitante_id', usuario.id)
      .then(({ data }) => {
        if (activo) setYaSolicitado(Boolean(data && data.length > 0))
      })
    return () => {
      activo = false
    }
  }, [usuario, articulo])

  const enlace = typeof window !== 'undefined' ? window.location.href : ''

  const accion = useMemo(() => {
    if (!articulo) return { texto: 'Solicitar', tipo: 'inactivo' as const }
    if (!usuario) return { texto: 'Solicitar', tipo: 'entrar' as const }
    if (!perfilCompleto) return { texto: 'Solicitar', tipo: 'completar' as const }
    if (articulo.donante_id === usuario.id) return { texto: 'Es tuyo', tipo: 'inactivo' as const }
    if (perfil?.rol_principal === 'doy')
      return { texto: 'Tu cuenta es para regalar cosas', tipo: 'rol' as const }
    if (yaSolicitado) return { texto: 'Ya lo solicitaste', tipo: 'inactivo' as const }
    if (articulo.estado === 'reservado') return { texto: 'Reservado', tipo: 'inactivo' as const }
    if (articulo.estado === 'entregado')
      return { texto: 'Ya lo entregaron', tipo: 'inactivo' as const }
    if (articulo.solicitudes_abiertas >= 5)
      return { texto: 'Solicitudes cerradas por ahora', tipo: 'inactivo' as const }
    return { texto: 'Solicitar', tipo: 'solicitar' as const }
  }, [articulo, usuario, perfil?.rol_principal, perfilCompleto, yaSolicitado])

  if (!articulo || oculto) return <NoDisponible />

  function tocarAccion() {
    if (accion.tipo === 'entrar') {
      guardarRutaOrigen(`/articulos/${id}`)
      navigate({ to: '/entrar' })
      return
    }
    if (accion.tipo === 'completar') {
      guardarRutaOrigen(`/articulos/${id}`)
      navigate({ to: '/completar-perfil' })
      return
    }
    if (accion.tipo === 'solicitar') setModalAbierto(true)
  }

  async function enviarSolicitud() {
    setEnviando(true)
    const { error } = await db.from('solicitudes').insert({
      articulo_id: id,
      mensaje: mensaje.trim() ? mensaje.trim() : null,
    })
    setEnviando(false)
    if (error) {
      toast.error(mensajeDeError(error))
      return
    }
    setModalAbierto(false)
    setYaSolicitado(true)
    toast.success('Solicitud enviada. Si te elige, te escribe por WhatsApp.')
  }

  const contador =
    articulo.solicitudes_abiertas >= 5
      ? 'Solicitudes cerradas por ahora'
      : articulo.solicitudes_abiertas === 1
        ? '1 vecino también lo solicitó'
        : articulo.solicitudes_abiertas > 1
          ? `${articulo.solicitudes_abiertas} vecinos también lo solicitaron`
          : null

  const miembroDesde = vecino ? tiempoDesde(vecino.creado_en) : null

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link to="/articulos" className="text-[13px] text-muted-foreground">
            ← Catálogo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        <Carousel className="w-full">
          <CarouselContent>
            {(fotos.length ? fotos : [null]).map((url, i) => (
              <CarouselItem key={i}>
                <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                  {url ? (
                    <img
                      src={fotoTransformada(url, 900) ?? url}
                      alt={`${articulo.titulo} — foto ${i + 1}`}
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {fotos.length > 1 ? (
            <>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </>
          ) : null}
        </Carousel>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-[13px] font-medium text-secondary-foreground">
            {articulo.categoria}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {ETIQUETA_CONDICION[articulo.condicion]}
          </span>
        </div>

        <h1 className="mt-2 text-[24px] font-semibold text-foreground">{articulo.titulo}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{articulo.barrio}</p>
        {articulo.estado !== 'disponible' ? (
          <p className="mt-2 text-[15px] font-medium text-foreground">
            {articulo.estado === 'reservado' ? 'Reservado' : 'Ya lo entregaron'}
          </p>
        ) : null}

        {articulo.descripcion ? (
          <p className="mt-4 whitespace-pre-line text-[17px] leading-relaxed text-foreground">
            {articulo.descripcion}
          </p>
        ) : null}

        {!usuario ? (
          <div className="mt-6 rounded-xl border border-violet-border bg-secondary px-4 py-3 text-[14px] leading-relaxed text-secondary-foreground">
            Iniciá sesión para ver quién lo regala. Es gratis y toma diez segundos. Tocá
            «Solicitar» y te llevamos.
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-border p-4">
            <Link
              to="/vecino/$id"
              params={{ id: articulo.donante_id }}
              className="flex items-center gap-3"
            >
              <span className="size-12 overflow-hidden rounded-full bg-muted">
                {vecino?.foto_url ? (
                  <img
                    src={fotoTransformada(vecino.foto_url, 120) ?? vecino.foto_url}
                    alt={vecino.nombre ?? 'Vecino'}
                    className="size-full object-cover"
                  />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block text-[17px] font-medium text-foreground">
                  {vecino?.nombre ?? 'Un vecino'}
                </span>
                <span className="block text-[13px] text-muted-foreground">
                  {vecino ? ETIQUETA_NIVEL[vecino.nivel] : 'Cargando…'}
                  {miembroDesde ? ` · miembro desde hace ${miembroDesde}` : ''}
                </span>
                {vecino ? (
                  <span className="block text-[13px] text-muted-foreground">
                    {vecino.entregas_confirmadas === 1
                      ? '1 artículo entregado'
                      : `${vecino.entregas_confirmadas} artículos entregados`}
                  </span>
                ) : null}
              </span>
            </Link>
            {contador ? (
              <p className="mt-3 border-t border-border pt-3 text-[13px] text-muted-foreground">
                {contador}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="outline"
            className="h-12 rounded-xl"
            onClick={() =>
              window.open(
                `https://wa.me/?text=${encodeURIComponent(`${articulo.titulo} — Vecinos de Cali ${enlace}`)}`,
                '_blank',
                'noopener',
              )
            }
          >
            <Share2 className="mr-2 size-4" />
            Compartir por WhatsApp
          </Button>
          <button
            type="button"
            onClick={() => setReportando(true)}
            className="inline-flex items-center gap-1.5 self-start text-[13px] text-muted-foreground underline"
          >
            <Flag className="size-3.5" />
            Reportar
          </button>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <Button
            className="h-12 w-full rounded-xl text-[17px]"
            disabled={accion.tipo === 'inactivo' || accion.tipo === 'rol'}
            onClick={tocarAccion}
          >
            {accion.texto}
          </Button>
          {accion.tipo === 'rol' ? (
            <p className="mt-2 text-center text-[13px] text-muted-foreground">
              <a href="/mi-cuenta" className="underline">
                Cambiar el tipo de cuenta
              </a>
            </p>
          ) : null}
        </div>
      </div>

      <ModalReporte
        abierto={reportando}
        onOpenChange={setReportando}
        articuloId={articulo.id}
      />

      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Solicitar {articulo.titulo}</DialogTitle>
            <DialogDescription>
              ¿Algo que quieras contarle sobre este artículo?
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={mensaje}
            maxLength={140}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Opcional"
            className="min-h-24 rounded-xl text-base"
          />
          <p className="text-[13px] text-muted-foreground">{mensaje.length}/140</p>
          <Button
            className="h-12 w-full rounded-xl text-[17px]"
            onClick={enviarSolicitud}
            disabled={enviando}
          >
            {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </DialogContent>
      </Dialog>
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
