// Catálogo público. No requiere sesión y nunca muestra datos de personas.
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImageOff, Search } from 'lucide-react'

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

type BusquedaCatalogo = { categoria?: string; barrio?: string }

export const Route = createFileRoute('/articulos/')({
  component: Catalogo,
  // Los filtros viven en la URL. Así los chips de la landing pueden saltar acá
  // con la categoría ya puesta, el botón de atrás funciona, y un vecino puede
  // mandar por WhatsApp "mirá lo que hay en San Fernando" y que abra filtrado.
  validateSearch: (busqueda: Record<string, unknown>): BusquedaCatalogo => {
    const limpia: BusquedaCatalogo = {}
    if (typeof busqueda['categoria'] === 'string') limpia.categoria = busqueda['categoria']
    if (typeof busqueda['barrio'] === 'string') limpia.barrio = busqueda['barrio']
    return limpia
  },
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
  const busqueda_url = Route.useSearch()
  const navigate = useNavigate({ from: '/articulos/' })
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [barrios, setBarrios] = useState<{ id: number; nombre: string }[]>([])
  const categoria = busqueda_url.categoria ?? 'todas'
  const barrioId = busqueda_url.barrio ?? 'todos'

  // Quitar el filtro borra la clave de la URL en vez de dejarla vacía: así
  // /articulos y /articulos?categoria= no son dos direcciones distintas para
  // la misma pantalla.
  function filtrar(cambio: Partial<Record<'categoria' | 'barrio', string | null>>) {
    void navigate({
      replace: true,
      search: (previo) => {
        const proximo: BusquedaCatalogo = { ...previo }
        for (const [clave, valor] of Object.entries(cambio) as [
          'categoria' | 'barrio',
          string | null,
        ][]) {
          if (valor === null) delete proximo[clave]
          else proximo[clave] = valor
        }
        return proximo
      },
    })
  }

  const setCategoria = (valor: string) => filtrar({ categoria: valor === 'todas' ? null : valor })
  const setBarrioId = (valor: string) => filtrar({ barrio: valor === 'todos' ? null : valor })
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
      <div className="mx-auto max-w-5xl px-4 pb-1 pt-6">
        <h1 className="text-screen font-semibold text-foreground">Catálogo</h1>
      </div>

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
                className="pl-9"
              />
            </div>
            <Select value={barrioId} onValueChange={setBarrioId}>
              <SelectTrigger
                aria-label="Filtrar por barrio"
                className="w-[45%] sm:w-56"
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
              Todo
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
        <p className="mb-3 text-small text-muted-foreground">
          {items === null ? 'Cargando…' : linea}
        </p>

        {items === null ? (
          <Cuadricula>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            ))}
          </Cuadricula>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mx-auto max-w-sm text-body text-foreground">
              Todavía no hay nada en esta categoría. Volvé en un rato — los vecinos están
              publicando.
            </p>
            <Button
              className="mt-5"
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
                <Button variant="outline" onClick={verMas} disabled={cargandoMas}>
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
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>
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
        'shrink-0 rounded-full border px-3.5 py-2 text-chip transition-colors',
        activo
          ? 'border-violet bg-violet text-white'
          : 'border-border bg-white text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Tarjeta({ articulo }: { articulo: ArticuloPublico }) {
  const foto = fotoTransformada(articulo.foto_portada, 400)
  return (
    // La tarjeta es una tarjeta: fondo blanco, borde y el texto adentro. Sin el
    // contenedor, sobre el fondo hueso de la página, la retícula se lee como
    // una lista de fotos sueltas y no como cosas que se pueden tocar.
    <Link
      to="/articulos/$id"
      params={{ id: articulo.id }}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-[#d6d3d1]"
    >
      <div className="flex aspect-square w-full items-center justify-center bg-violet-light text-violet-mid">
        {foto ? (
          <img
            src={foto}
            alt={articulo.titulo}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <ImageOff className="size-7" aria-hidden="true" />
        )}
      </div>
      <div className="px-2.5 pb-[11px] pt-[9px]">
        <h2 className="line-clamp-2 text-tarjeta font-medium leading-[1.32] text-foreground">
          {articulo.titulo}
        </h2>
        <p className="mt-1 text-small leading-[1.35] text-muted-foreground">
          {articulo.barrio}
          <br />
          {ETIQUETA_CONDICION[articulo.condicion]}
        </p>
      </div>
    </Link>
  )
}
