// Catálogo público. No requiere sesión y nunca muestra datos de personas.
import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { fotoTransformada } from '@/lib/imagenes'
import type { ArticuloPublico, Categoria, CondicionArticulo } from '@/lib/database.types'

const POR_PAGINA = 24

const ETIQUETA_CONDICION: Record<CondicionArticulo, string> = {
  nuevo: 'Nuevo',
  como_nuevo: 'Como nuevo',
  buen_estado: 'Buen estado',
  usado_con_detalles: 'Usado con detalles',
}

export const Route = createFileRoute('/articulos/')({
  component: Catalogo,
  head: () => ({
    meta: [
      { title: 'Catálogo — Vecinos de Cali' },
      {
        name: 'description',
        content:
          'Mirá lo que los vecinos de Cali están regalando: muebles, ropa, cocina y más. Filtrá por barrio y categoría.',
      },
      { property: 'og:title', content: 'Catálogo — Vecinos de Cali' },
      {
        property: 'og:description',
        content: 'Mirá lo que los vecinos de Cali están regalando. Filtrá por barrio y categoría.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
})

function plural(n: number) {
  return n === 1 ? '1 cosa disponible' : `${n} cosas disponibles`
}

function Catalogo() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [barrios, setBarrios] = useState<{ id: number; nombre: string }[]>([])
  const [categoria, setCategoria] = useState<string>('todas')
  const [barrioId, setBarrioId] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [busquedaAplicada, setBusquedaAplicada] = useState('')
  const [items, setItems] = useState<ArticuloPublico[] | null>(null)
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [cargandoMas, setCargandoMas] = useState(false)
  const primeraCarga = useRef(true)

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda.trim()), 350)
    return () => clearTimeout(t)
  }, [busqueda])

  useEffect(() => {
    let activo = true
    db.from('categorias')
      .select('*')
      .order('orden', { ascending: true })
      .then(({ data }) => {
        if (activo && data) setCategorias(data as Categoria[])
      })
    // El selector se arma solo con los barrios que tienen artículos disponibles.
    db.from('articulos_publicos')
      .select('barrio_id, barrio')
      .eq('estado', 'disponible')
      .limit(2000)
      .then(({ data }) => {
        if (!activo || !data) return
        const mapa = new Map<number, string>()
        for (const fila of data as { barrio_id: number; barrio: string }[]) {
          if (fila.barrio) mapa.set(fila.barrio_id, fila.barrio)
        }
        setBarrios(
          [...mapa.entries()]
            .map(([id, nombre]) => ({ id, nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        )
      })
    return () => {
      activo = false
    }
  }, [])

  const consultar = useCallback(
    async (paginaPedida: number) => {
      let q = db
        .from('articulos_publicos')
        .select('*', { count: 'exact' })
        .eq('estado', 'disponible')
        .order('creado_en', { ascending: false })
        .range(paginaPedida * POR_PAGINA, paginaPedida * POR_PAGINA + POR_PAGINA - 1)

      if (categoria !== 'todas') q = q.eq('categoria_slug', categoria)
      if (barrioId !== 'todos') q = q.eq('barrio_id', Number(barrioId))
      if (busquedaAplicada) q = q.ilike('titulo', `%${busquedaAplicada}%`)

      const { data, count } = await q
      return { filas: (data ?? []) as ArticuloPublico[], count: count ?? 0 }
    },
    [categoria, barrioId, busquedaAplicada],
  )

  useEffect(() => {
    let activo = true
    if (!primeraCarga.current) setItems(null)
    primeraCarga.current = false
    setPagina(0)
    consultar(0).then(({ filas, count }) => {
      if (!activo) return
      setItems(filas)
      setTotal(count)
    })
    return () => {
      activo = false
    }
  }, [consultar])

  async function verMas() {
    setCargandoMas(true)
    const siguiente = pagina + 1
    const { filas, count } = await consultar(siguiente)
    setItems((prev) => [...(prev ?? []), ...filas])
    setTotal(count)
    setPagina(siguiente)
    setCargandoMas(false)
  }

  const nombreBarrio = useMemo(
    () => barrios.find((b) => String(b.id) === barrioId)?.nombre ?? null,
    [barrios, barrioId],
  )

  const linea = nombreBarrio ? `${plural(total)} en ${nombreBarrio}` : plural(total)

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <Link to="/" className="text-[13px] text-muted-foreground">
            Vecinos de Cali
          </Link>
          <h1 className="mt-1 text-[24px] font-semibold text-foreground">Catálogo</h1>
        </div>
      </header>

      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscá algo…"
                aria-label="Buscar en el catálogo"
                className="h-11 rounded-xl pl-9 text-base"
              />
            </div>
            <Select value={barrioId} onValueChange={setBarrioId}>
              <SelectTrigger
                aria-label="Filtrar por barrio"
                className="h-11 w-[45%] rounded-xl text-base sm:w-56"
              >
                <SelectValue placeholder="Barrio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los barrios</SelectItem>
                {barrios.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Chip activo={categoria === 'todas'} onClick={() => setCategoria('todas')}>
              Todas
            </Chip>
            {categorias.map((c) => (
              <Chip
                key={c.id}
                activo={categoria === c.slug}
                onClick={() => setCategoria(c.slug)}
              >
                {c.nombre}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-4">
        <p className="mb-3 text-[13px] text-muted-foreground">
          {items === null ? 'Cargando…' : linea}
        </p>

        {items === null ? (
          <Cuadricula>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            ))}
          </Cuadricula>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mx-auto max-w-sm text-[17px] text-foreground">
              Todavía no hay nada en esta categoría. Volvé en un rato — los vecinos están
              publicando.
            </p>
            <Button
              className="mt-5 h-12 rounded-xl px-5"
              onClick={() => {
                setCategoria('todas')
                setBarrioId('todos')
                setBusqueda('')
              }}
            >
              Ver todas las categorías
            </Button>
          </div>
        ) : (
          <>
            <Cuadricula>
              {items.map((a) => (
                <Tarjeta key={a.id} articulo={a} />
              ))}
            </Cuadricula>
            {items.length < total ? (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  className="h-12 rounded-xl px-6"
                  onClick={verMas}
                  disabled={cargandoMas}
                >
                  {cargandoMas ? 'Cargando…' : 'Ver más'}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}

function Cuadricula({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{children}</div>
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
        'shrink-0 rounded-lg border px-3 py-2 text-[14px] transition-colors',
        activo
          ? 'border-violet-border bg-secondary font-medium text-secondary-foreground'
          : 'border-border bg-background text-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Tarjeta({ articulo }: { articulo: ArticuloPublico }) {
  const foto = fotoTransformada(articulo.foto_portada, 400)
  return (
    <Link
      to="/articulos/$id"
      params={{ id: articulo.id }}
      className="group block rounded-xl"
    >
      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
        {foto ? (
          <img
            src={foto}
            alt={articulo.titulo}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : null}
      </div>
      <h2 className="mt-2 line-clamp-2 text-[15px] font-medium text-foreground">
        {articulo.titulo}
      </h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        {articulo.barrio} · {ETIQUETA_CONDICION[articulo.condicion]}
      </p>
    </Link>
  )
}
