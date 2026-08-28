// Editar una publicación. Solo el dueño, y solo mientras está disponible.
//
// Por qué solo disponible: una publicación reservada tiene a un vecino
// esperando algo concreto, y cambiarle el nombre a mitad del trato es
// deshonesto con él. Lo entregado y lo retirado ya cerró su ciclo y sostiene el
// historial de los dos lados.
//
// Las fotos no se editan todavía. Se muestran para que se vea de qué artículo
// se trata, pero cambiarlas implica subir, borrar del almacenamiento y
// reordenar: es otra tanda de trabajo.
//
// No hace falta nada nuevo en la base. La migración 01 revocó el `update`
// entero sobre `articulos` y lo devolvió solo sobre estas cinco columnas,
// justamente previendo esta pantalla. El estado sigue moviéndose únicamente por
// las RPC, así que desde acá no se puede tocar.
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import { SelectorBarrio } from '@/components/SelectorBarrio'
import { cn } from '@/lib/utils'
import { db, mensajeDeError } from '@/lib/db'
import { fotoTransformada } from '@/lib/imagenes'
import { useAuth } from '@/lib/auth'
import type { Articulo, Categoria, CondicionArticulo } from '@/lib/database.types'

const CONDICIONES: { valor: CondicionArticulo; etiqueta: string }[] = [
  { valor: 'nuevo', etiqueta: 'Nuevo' },
  { valor: 'como_nuevo', etiqueta: 'Como nuevo' },
  { valor: 'buen_estado', etiqueta: 'Buen estado' },
  { valor: 'usado_con_detalles', etiqueta: 'Usado con detalles' },
]

export const Route = createFileRoute('/mis-publicaciones/editar/$id')({
  ssr: false,
  component: () => (
    <RutaProtegida>
      <Editar />
    </RutaProtegida>
  ),
  head: () => ({
    meta: [
      { title: 'Editar publicación — Vecinos de Cali' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
})

function Editar() {
  const { id } = Route.useParams()
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [articulo, setArticulo] = useState<Articulo | null>(null)
  const [fotos, setFotos] = useState<string[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [noEditable, setNoEditable] = useState<string | null>(null)

  const [titulo, setTitulo] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [condicion, setCondicion] = useState<CondicionArticulo | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [barrioId, setBarrioId] = useState<number | null>(null)
  const [nombreBarrio, setNombreBarrio] = useState<string | null>(null)
  const [cambiandoBarrio, setCambiandoBarrio] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

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
    if (!usuario) return
    ;(async () => {
      const { data, error } = await db
        .from('articulos')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (!activo) return
      if (error || !data) {
        setNoEditable('No encontramos esa publicación.')
        setCargando(false)
        return
      }
      const fila = data as Articulo
      // La política RLS ya impide escribir en lo ajeno, pero leer es público:
      // sin esta comprobación se vería el formulario de otro y el error
      // llegaría recién al guardar.
      if (fila.donante_id !== usuario.id) {
        setNoEditable('Esta publicación no es tuya.')
        setCargando(false)
        return
      }
      if (fila.estado !== 'disponible') {
        setNoEditable(
          fila.estado === 'reservado'
            ? 'Esta publicación está reservada. Mientras un vecino la esté esperando no se puede cambiar.'
            : 'Esta publicación ya cerró su ciclo y no se puede cambiar.',
        )
        setCargando(false)
        return
      }

      setArticulo(fila)
      setTitulo(fila.titulo)
      setCategoriaId(fila.categoria_id)
      setCondicion(fila.condicion)
      setDescripcion(fila.descripcion ?? '')
      setBarrioId(fila.barrio_id)
      setCargando(false)

      const { data: fotoFilas } = await db
        .from('articulo_fotos')
        .select('url, orden')
        .eq('articulo_id', id)
        .order('orden', { ascending: true })
      if (!activo) return
      setFotos(((fotoFilas ?? []) as { url: string }[]).map((f) => f.url))
    })()
    return () => {
      activo = false
    }
  }, [id, usuario?.id])

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
        if (activo) setNombreBarrio((data as { nombre: string } | null)?.nombre ?? null)
      })
    return () => {
      activo = false
    }
  }, [barrioId])

  const listo =
    titulo.trim().length > 0 && categoriaId !== null && condicion !== null && barrioId !== null

  const cambio = useMemo(() => {
    if (!articulo) return false
    return (
      titulo.trim() !== articulo.titulo ||
      (descripcion.trim() || null) !== (articulo.descripcion ?? null) ||
      categoriaId !== articulo.categoria_id ||
      condicion !== articulo.condicion ||
      barrioId !== articulo.barrio_id
    )
  }, [articulo, titulo, descripcion, categoriaId, condicion, barrioId])

  const pendientes = articulo?.solicitudes_abiertas ?? 0

  function intentarGuardar() {
    if (!listo || !cambio) return
    // Con solicitudes abiertas el cambio no es solo suyo: hay vecinos que
    // pidieron una cosa concreta y podrían terminar recibiendo otra.
    if (pendientes > 0) {
      setConfirmando(true)
      return
    }
    void guardar()
  }

  async function guardar() {
    if (!listo || !categoriaId || !condicion || !barrioId) return
    setGuardando(true)
    const { error } = await db
      .from('articulos')
      .update({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() ? descripcion.trim() : null,
        categoria_id: categoriaId,
        condicion,
        barrio_id: barrioId,
      })
      .eq('id', id)
    setGuardando(false)
    setConfirmando(false)
    if (error) {
      toast.error(mensajeDeError(error))
      return
    }
    toast.success('Guardamos los cambios.')
    void navigate({ to: '/mis-publicaciones' })
  }

  if (cargando) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </main>
    )
  }

  if (noEditable || !articulo) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-screen font-semibold text-foreground">No se puede editar</h1>
        <p className="mt-2 text-body leading-relaxed text-muted-foreground">{noEditable}</p>
        <Button asChild variant="outline" className="mt-6 h-11 rounded-xl">
          <Link to="/mis-publicaciones">Volver a mis publicaciones</Link>
        </Button>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <Link
          to="/mis-publicaciones"
          className="text-small text-muted-foreground hover:text-foreground"
        >
          ← Mis publicaciones
        </Link>
        <h1 className="mt-1 text-screen font-semibold text-foreground">Editar publicación</h1>
      </div>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-6">
        {pendientes > 0 ? (
          <p className="rounded-xl bg-aviso px-4 py-3 text-small leading-relaxed text-aviso-foreground">
            {pendientes === 1
              ? 'Un vecino ya te pidió esto.'
              : `${pendientes} vecinos ya te pidieron esto.`}{' '}
            Pidieron lo que ves publicado ahora, así que si cambiás de qué se trata, avisales
            cuando les escribas.
          </p>
        ) : null}

        {fotos.length > 0 ? (
          <section>
            <Label className="text-chip font-medium">Fotos</Label>
            <div className="mt-2 flex gap-2">
              {fotos.map((url) => (
                <div key={url} className="h-20 w-20 overflow-hidden rounded-xl bg-muted">
                  <img
                    src={fotoTransformada(url, 200) ?? url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-small text-muted-foreground">
              Las fotos todavía no se pueden cambiar. Si salieron mal, retirá la publicación y
              volvé a publicarla.
            </p>
          </section>
        ) : null}

        <section>
          <Label htmlFor="titulo" className="text-chip font-medium">
            Título
          </Label>
          <Input
            id="titulo"
            value={titulo}
            maxLength={60}
            onChange={(e) => setTitulo(e.target.value)}
            className="mt-2 h-12 rounded-xl text-base"
          />
          <p className="mt-1 text-right text-small text-muted-foreground">{titulo.length}/60</p>
        </section>

        <section>
          <Label className="text-chip font-medium">Categoría</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {categorias.map((c) => (
              <Chip key={c.id} activo={categoriaId === c.id} onClick={() => setCategoriaId(c.id)}>
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
                onChange={(nuevo) => {
                  setBarrioId(nuevo)
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

      <div
        className="fixed inset-x-0 bottom-0 border-t border-border bg-background px-4 py-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <Button asChild variant="outline" className="h-12 rounded-xl">
            <Link to="/mis-publicaciones">Cancelar</Link>
          </Button>
          <Button
            className="h-12 flex-1 rounded-xl text-body"
            disabled={!listo || !cambio || guardando}
            onClick={intentarGuardar}
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendientes === 1 ? 'Un vecino ya te pidió esto' : `${pendientes} vecinos ya te pidieron esto`}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              Lo pidieron como está publicado ahora. Si cambiaste de qué se trata, contáselo cuando
              les escribas para que nadie se lleve una sorpresa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Volver</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              onClick={(e) => {
                e.preventDefault()
                void guardar()
              }}
            >
              Guardar igual
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
