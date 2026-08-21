// Publicar un artículo. Requiere sesión, perfil completo y rol 'doy'.
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, Check, Share2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RutaProtegida } from '@/components/RutaProtegida'
import { SelectorBarrio } from '@/components/SelectorBarrio'
import { cn } from '@/lib/utils'
import { db, mensajeDeError } from '@/lib/db'
import { comprimirImagen } from '@/lib/comprimir'
import { useAuth } from '@/lib/auth'
import type { Categoria, CondicionArticulo } from '@/lib/database.types'

const CONDICIONES: { valor: CondicionArticulo; etiqueta: string }[] = [
  { valor: 'nuevo', etiqueta: 'Nuevo' },
  { valor: 'como_nuevo', etiqueta: 'Como nuevo' },
  { valor: 'buen_estado', etiqueta: 'Buen estado' },
  { valor: 'usado_con_detalles', etiqueta: 'Usado con detalles' },
]

export const Route = createFileRoute('/publicar')({
  ssr: false,
  component: () => (
    <RutaProtegida>
      <Publicar />
    </RutaProtegida>
  ),
  head: () => ({
    meta: [
      { title: 'Publicar algo — Vecinos de Cali' },
      {
        name: 'description',
        content:
          'Publicá en un minuto lo que ya no usás: una foto, el título y listo. Un vecino de Cali lo va a necesitar.',
      },
      { property: 'og:title', content: 'Publicar algo — Vecinos de Cali' },
      {
        property: 'og:description',
        content: 'Publicá en un minuto lo que ya no usás. Un vecino de Cali lo va a necesitar.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
})

type FotoElegida = { id: string; blob: Blob; vistaPrevia: string }

function Publicar() {
  const { usuario, perfil } = useAuth()
  const [publicadoId, setPublicadoId] = useState<string | null>(null)

  if (perfil?.rol_principal === 'recibo') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-screen font-semibold text-foreground">Esta cuenta recibe cosas</h1>
          <p className="mt-3 text-body leading-relaxed text-foreground">
            Tu cuenta está registrada para recibir cosas. Si también querés regalar algo, cambiá tu
            cuenta en{' '}
            <Link to="/mi-cuenta" className="font-medium text-primary underline">
              Mi cuenta
            </Link>
            .
          </p>
        </div>
      </div>
    )
  }

  if (publicadoId) return <Confirmacion articuloId={publicadoId} />

  return <Formulario userId={usuario!.id} barrioPerfil={perfil?.barrio_id ?? null} onListo={setPublicadoId} />
}

function Formulario({
  userId,
  barrioPerfil,
  onListo,
}: {
  userId: string
  barrioPerfil: number | null
  onListo: (id: string) => void
}) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nombreBarrio, setNombreBarrio] = useState<string | null>(null)
  const [barrioId, setBarrioId] = useState<number | null>(barrioPerfil)
  const [cambiandoBarrio, setCambiandoBarrio] = useState(false)
  const [fotos, setFotos] = useState<FotoElegida[]>([])
  const [procesando, setProcesando] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [condicion, setCondicion] = useState<CondicionArticulo | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const inputFoto = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let activo = true
    db.from('categorias')
      .select('*')
      .order('orden', { ascending: true })
      .then(({ data }) => {
        if (activo && data) setCategorias(data as Categoria[])
      })
    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    let activo = true
    if (!barrioId) {
      setNombreBarrio(null)
      return
    }
    db.from('barrios')
      .select('nombre')
      .eq('id', barrioId)
      .maybeSingle()
      .then(({ data }) => {
        if (activo) setNombreBarrio(data?.nombre ?? null)
      })
    return () => {
      activo = false
    }
  }, [barrioId])

  async function agregarFotos(lista: FileList | null) {
    if (!lista || lista.length === 0) return
    const espacio = 3 - fotos.length
    if (espacio <= 0) {
      toast.error('Podés subir hasta tres fotos.')
      return
    }
    setProcesando(true)
    try {
      const nuevas: FotoElegida[] = []
      for (const archivo of Array.from(lista).slice(0, espacio)) {
        const blob = await comprimirImagen(archivo)
        nuevas.push({
          id: crypto.randomUUID(),
          blob,
          vistaPrevia: URL.createObjectURL(blob),
        })
      }
      setFotos((prev) => [...prev, ...nuevas])
    } catch (error) {
      toast.error(mensajeDeError(error))
    } finally {
      setProcesando(false)
      if (inputFoto.current) inputFoto.current.value = ''
    }
  }

  function quitarFoto(id: string) {
    setFotos((prev) => {
      const fuera = prev.find((f) => f.id === id)
      if (fuera) URL.revokeObjectURL(fuera.vistaPrevia)
      return prev.filter((f) => f.id !== id)
    })
  }

  function mover(indice: number, delta: number) {
    setFotos((prev) => {
      const destino = indice + delta
      if (destino < 0 || destino >= prev.length) return prev
      const copia = [...prev]
      const item = copia[indice]
      if (!item) return prev
      copia.splice(indice, 1)
      copia.splice(destino, 0, item)
      return copia
    })
  }

  const listo =
    fotos.length >= 1 && titulo.trim().length > 0 && categoriaId !== null && condicion !== null && barrioId !== null

  async function publicar() {
    if (!listo || !categoriaId || !condicion || !barrioId) return
    setEnviando(true)
    try {
      const urls: string[] = []
      for (const foto of fotos) {
        const ruta = `${userId}/${crypto.randomUUID()}.jpg`
        const { error: errorSubida } = await db.storage
          .from('articulos')
          .upload(ruta, foto.blob, { contentType: 'image/jpeg', upsert: false })
        if (errorSubida) throw errorSubida
        urls.push(db.storage.from('articulos').getPublicUrl(ruta).data.publicUrl)
      }

      const { data, error } = await db
        .from('articulos')
        .insert({
          titulo: titulo.trim(),
          descripcion: descripcion.trim() ? descripcion.trim() : null,
          categoria_id: categoriaId,
          barrio_id: barrioId,
          condicion,
        })
        .select('id')
        .single()
      if (error) throw error

      const articuloId = (data as { id: string }).id
      const { error: errorFotos } = await db
        .from('articulo_fotos')
        .insert(urls.map((url, i) => ({ articulo_id: articuloId, url, orden: i })))
      if (errorFotos) throw errorFotos

      onListo(articuloId)
    } catch (error) {
      toast.error(mensajeDeError(error))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link to="/articulos" className="text-small text-muted-foreground">
            ← Catálogo
          </Link>
          <h1 className="mt-1 text-screen font-semibold text-foreground">Publicar algo</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-6">
        <section>
          <Label className="text-chip font-medium">Fotos</Label>
          <p className="mt-1 text-small text-muted-foreground">
            De una a tres. La primera es la portada.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {fotos.map((foto, i) => (
              <div key={foto.id} className="relative">
                <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                  <img src={foto.vistaPrevia} alt="" className="size-full object-cover" />
                </div>
                {i === 0 ? (
                  <span className="absolute left-1 top-1 rounded-md bg-secondary px-1.5 py-0.5 text-small font-medium text-secondary-foreground">
                    Portada
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label="Quitar foto"
                  onClick={() => quitarFoto(foto.id)}
                  className="absolute right-1 top-1 rounded-md bg-card p-1 text-foreground"
                >
                  <X className="size-3.5" />
                </button>
                <div className="mt-1 flex justify-center gap-1">
                  <button
                    type="button"
                    aria-label="Mover atrás"
                    disabled={i === 0}
                    onClick={() => mover(i, -1)}
                    className="rounded-md border border-border p-1 disabled:opacity-30"
                  >
                    <ArrowLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mover adelante"
                    disabled={i === fotos.length - 1}
                    onClick={() => mover(i, 1)}
                    className="rounded-md border border-border p-1 disabled:opacity-30"
                  >
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {fotos.length < 3 ? (
              <button
                type="button"
                onClick={() => inputFoto.current?.click()}
                disabled={procesando}
                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-small text-muted-foreground"
              >
                <Camera className="size-5" />
                {procesando ? 'Procesando…' : 'Agregar'}
              </button>
            ) : null}
          </div>
          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            multiple
            capture={undefined}
            className="hidden"
            onChange={(e) => agregarFotos(e.target.files)}
          />
        </section>

        <section>
          <Label htmlFor="titulo" className="text-chip font-medium">
            Título
          </Label>
          <Input
            id="titulo"
            value={titulo}
            maxLength={60}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Lavadora Haceb 24 libras"
            className="mt-2 h-12 rounded-xl text-base"
          />
          <p className="mt-1 text-right text-small text-muted-foreground">{titulo.length}/60</p>
        </section>

        <section>
          <Label className="text-chip font-medium">Categoría</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {categorias.map((c) => (
              <Chip
                key={c.id}
                activo={categoriaId === c.id}
                onClick={() => setCategoriaId(c.id)}
              >
                {c.nombre}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <Label className="text-chip font-medium">Condición</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {CONDICIONES.map((c) => (
              <Chip
                key={c.valor}
                activo={condicion === c.valor}
                onClick={() => setCondicion(c.valor)}
              >
                {c.etiqueta}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <Label htmlFor="descripcion" className="text-chip font-medium">
            Descripción
          </Label>
          <Textarea
            id="descripcion"
            value={descripcion}
            maxLength={500}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Funciona bien. La usé tres años. Hay que llevársela en camioneta."
            className="mt-2 min-h-28 rounded-xl text-base"
          />
          <p className="mt-1 text-right text-small text-muted-foreground">
            {descripcion.length}/500
          </p>
        </section>

        <section>
          <Label className="text-chip font-medium">Barrio</Label>
          {cambiandoBarrio ? (
            <div className="mt-2">
              <SelectorBarrio
                valor={barrioId}
                onChange={(id) => {
                  setBarrioId(id)
                  setCambiandoBarrio(false)
                }}
              />
            </div>
          ) : (
            <>
              <p className="mt-2 text-body text-foreground">{nombreBarrio ?? '—'}</p>
              <button
                type="button"
                onClick={() => setCambiandoBarrio(true)}
                className="mt-1 text-small text-muted-foreground underline"
              >
                está en otro barrio
              </button>
            </>
          )}
        </section>

        <p className="rounded-xl bg-aviso px-4 py-3 text-small leading-relaxed text-aviso-foreground">
          Acordate: en Vecinos de Cali nada tiene precio. Si publicás algo con valor o pidiendo algo
          a cambio, lo retiramos.
        </p>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <Button
            className="h-12 w-full rounded-xl text-body"
            disabled={!listo || enviando || procesando}
            onClick={publicar}
          >
            {enviando ? 'Publicando…' : 'Publicar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'rounded-lg border px-3 py-2 text-small transition-colors',
        activo
          ? 'border-violet-border bg-secondary font-medium text-secondary-foreground'
          : 'border-border bg-background text-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Confirmacion({ articuloId }: { articuloId: string }) {
  const [copiado, setCopiado] = useState(false)
  const enlace =
    typeof window !== 'undefined' ? `${window.location.origin}/articulos/${articuloId}` : ''
  const texto = 'Estoy regalando esto en Vecinos de Cali'

  async function compartir() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Vecinos de Cali', text: texto, url: enlace })
        return
      } catch {
        return
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${texto} ${enlace}`)}`,
      '_blank',
      'noopener',
    )
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error('No pudimos copiar el enlace. Copialo desde la barra del navegador.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Check className="size-7" />
        </span>
        <h1 className="mt-5 text-screen font-semibold text-foreground">Listo, ya está publicado.</h1>
        <p className="mt-3 text-body leading-relaxed text-muted-foreground">
          Los vecinos que lo necesiten ya lo pueden ver y solicitar. Si lo compartís, llega más
          lejos.
        </p>
        <div className="mt-7 space-y-3">
          <Button className="h-12 w-full rounded-xl text-body" onClick={compartir}>
            <Share2 className="mr-2 size-4" />
            Compartir
          </Button>
          <Button variant="outline" className="h-12 w-full rounded-xl text-body" onClick={copiar}>
            {copiado ? 'Enlace copiado' : 'Copiar enlace'}
          </Button>
        </div>
        <Link
          to="/articulos"
          className="mt-6 inline-block text-chip text-muted-foreground underline"
        >
          Ver mis publicaciones
        </Link>
      </div>
    </div>
  )
}
