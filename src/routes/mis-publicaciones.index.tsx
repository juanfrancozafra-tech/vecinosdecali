// Mis publicaciones. Requiere sesión, perfil completo y rol 'doy'.
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'
import { db, mensajeDeError } from '@/lib/db'
import { fotoTransformada } from '@/lib/imagenes'
import { useAuth } from '@/lib/auth'
import type { Articulo, EstadoArticulo } from '@/lib/database.types'

export const Route = createFileRoute('/mis-publicaciones/')({
  ssr: false,
  component: () => (
    <RutaProtegida>
      <MisPublicaciones />
    </RutaProtegida>
  ),
  head: () => ({
    meta: [
      { title: 'Mis publicaciones — Vecinos de Cali' },
      {
        name: 'description',
        content:
          'Mirá lo que publicaste, quién te lo pidió y cerrá el ciclo cuando lo entregues a un vecino de Cali.',
      },
      { property: 'og:title', content: 'Mis publicaciones — Vecinos de Cali' },
      {
        property: 'og:description',
        content: 'Lo que publicaste, las solicitudes que te llegaron y las entregas por cerrar.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
})

type Fila = Articulo & { foto: string | null }

const ETIQUETA_ESTADO: Record<EstadoArticulo, string> = {
  disponible: 'Publicado',
  reservado: 'Reservado',
  entregado: 'Entregado',
  retirado: 'Retirado',
  oculto: 'Oculto',
}

const COLOR_ESTADO: Record<EstadoArticulo, string> = {
  disponible: 'bg-primary/10 text-primary',
  reservado: 'bg-[hsl(var(--aviso))]/25 text-[hsl(var(--aviso-foreground))]',
  entregado: 'bg-emerald-100 text-emerald-800',
  retirado: 'bg-muted text-muted-foreground',
  oculto: 'bg-muted text-muted-foreground',
}

type ClaveFiltro = 'todas' | 'por_responder' | 'reservados' | 'publicados' | 'cerrados'

const FILTROS: { clave: ClaveFiltro; etiqueta: string }[] = [
  { clave: 'todas', etiqueta: 'Todas' },
  { clave: 'por_responder', etiqueta: 'Por responder' },
  { clave: 'reservados', etiqueta: 'Reservados' },
  { clave: 'publicados', etiqueta: 'Publicados' },
  { clave: 'cerrados', etiqueta: 'Cerrados' },
]

function pertenece(fila: Fila, filtro: ClaveFiltro): boolean {
  switch (filtro) {
    case 'todas':
      return true
    case 'por_responder':
      return fila.estado === 'disponible' && fila.solicitudes_abiertas > 0
    case 'reservados':
      return fila.estado === 'reservado'
    case 'publicados':
      return fila.estado === 'disponible' || fila.estado === 'oculto'
    case 'cerrados':
      return fila.estado === 'entregado' || fila.estado === 'retirado'
  }
}

function MisPublicaciones() {
  const { usuario, perfil } = useAuth()
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [filtro, setFiltro] = useState<ClaveFiltro>('todas')
  const [porRetirar, setPorRetirar] = useState<Fila | null>(null)
  const [trabajando, setTrabajando] = useState(false)

  const cargar = async () => {
    if (!usuario) return
    const { data, error } = await db
      .from('articulos')
      .select('*')
      .eq('donante_id', usuario.id)
      .order('creado_en', { ascending: false })
    if (error) {
      toast.error(mensajeDeError(error))
      setFilas([])
      return
    }
    const articulos = (data ?? []) as Articulo[]
    let fotos: Record<string, string> = {}
    if (articulos.length > 0) {
      const { data: fotoFilas } = await db
        .from('articulo_fotos')
        .select('articulo_id, url, orden')
        .in(
          'articulo_id',
          articulos.map((a) => a.id),
        )
        .order('orden', { ascending: true })
      for (const f of (fotoFilas ?? []) as { articulo_id: string; url: string }[]) {
        if (!fotos[f.articulo_id]) fotos = { ...fotos, [f.articulo_id]: f.url }
      }
    }
    setFilas(articulos.map((a) => ({ ...a, foto: fotos[a.id] ?? null })))
  }

  useEffect(() => {
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id])

  const conteos = useMemo(() => {
    const base: Record<ClaveFiltro, number> = {
      todas: 0,
      por_responder: 0,
      reservados: 0,
      publicados: 0,
      cerrados: 0,
    }
    for (const fila of filas ?? []) {
      for (const f of FILTROS) if (pertenece(fila, f.clave)) base[f.clave] += 1
    }
    return base
  }, [filas])

  const grupos = useMemo(() => {
    const lista = filas ?? []
    return [
      {
        titulo: 'Te están esperando',
        filas: lista.filter((f) => f.estado === 'disponible' && f.solicitudes_abiertas > 0),
      },
      { titulo: 'Reservados', filas: lista.filter((f) => f.estado === 'reservado') },
      {
        titulo: 'Publicados',
        filas: lista.filter(
          (f) => (f.estado === 'disponible' && f.solicitudes_abiertas === 0) || f.estado === 'oculto',
        ),
      },
      { titulo: 'Entregados', filas: lista.filter((f) => f.estado === 'entregado') },
      { titulo: 'Retirados', filas: lista.filter((f) => f.estado === 'retirado') },
    ].filter((g) => g.filas.length > 0)
  }, [filas])

  const planas = useMemo(
    () => (filas ?? []).filter((f) => pertenece(f, filtro)),
    [filas, filtro],
  )

  const retirar = async () => {
    if (!porRetirar) return
    setTrabajando(true)
    const { error } = await db.rpc('liberar_articulo', { p_articulo_id: porRetirar.id })
    setTrabajando(false)
    if (error) {
      toast.error(mensajeDeError(error))
      return
    }
    toast.success('Ya lo retiraste del catálogo.')
    setPorRetirar(null)
    void cargar()
  }

  if (perfil?.rol_principal === 'recibo') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-[22px] font-semibold text-foreground">Esta cuenta recibe cosas</h1>
          <p className="mt-3 text-[17px] leading-relaxed text-foreground">
            Acá aparecen las publicaciones de quien regala. Si también querés regalar algo, cambiá tu
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

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b border-border bg-background px-4 pb-3 pt-6">
        <h1 className="text-[22px] font-semibold text-foreground">Mis publicaciones</h1>
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTROS.map((f) => (
            <button
              key={f.clave}
              type="button"
              onClick={() => setFiltro(f.clave)}
              className={cn(
                'shrink-0 rounded-xl border px-3 py-2 text-[15px] font-medium transition-colors',
                filtro === f.clave
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground',
              )}
            >
              {f.etiqueta}
              <span
                className={cn(
                  'ml-2 text-[13px]',
                  filtro === f.clave ? 'text-primary-foreground/80' : 'text-muted-foreground',
                )}
              >
                {conteos[f.clave]}
              </span>
            </button>
          ))}
        </div>
      </header>

      {filas === null ? (
        <div className="space-y-3 px-4 pt-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filas.length === 0 ? (
        <div className="px-4 pt-16 text-center">
          <p className="text-[17px] text-foreground">Todavía no publicaste nada.</p>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Lo que a vos te sobra, a un vecino le cambia el día.
          </p>
          <Button asChild className="mt-6 h-12 rounded-xl px-6">
            <Link to="/publicar">Publicar algo</Link>
          </Button>
        </div>
      ) : filtro === 'todas' ? (
        <div className="px-4 pt-2">
          {grupos.map((grupo) => (
            <section key={grupo.titulo} className="pt-5">
              <h2 className="pb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                {grupo.titulo}
              </h2>
              <div className="space-y-3">
                {grupo.filas.map((fila) => (
                  <FilaArticulo key={fila.id} fila={fila} onRetirar={() => setPorRetirar(fila)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : planas.length === 0 ? (
        <p className="px-4 pt-16 text-center text-[17px] text-muted-foreground">
          Acá no hay nada por ahora.
        </p>
      ) : (
        <div className="space-y-3 px-4 pt-5">
          {planas.map((fila) => (
            <FilaArticulo key={fila.id} fila={fila} onRetirar={() => setPorRetirar(fila)} />
          ))}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-3">
        <Button asChild className="h-12 w-full rounded-xl text-[17px]">
          <Link to="/publicar">Publicar algo</Link>
        </Button>
      </div>

      <AlertDialog open={porRetirar !== null} onOpenChange={(o) => !o && setPorRetirar(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Retirar esta publicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Sale del catálogo y las solicitudes que tenga se cierran. Podés volver a publicarlo
              cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-xl">Dejarlo así</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 rounded-xl"
              disabled={trabajando}
              onClick={(e) => {
                e.preventDefault()
                void retirar()
              }}
            >
              Retirar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FilaArticulo({ fila, onRetirar }: { fila: Fila; onRetirar: () => void }) {
  const foto = fotoTransformada(fila.foto, 200)
  const puedeRetirar = fila.estado === 'disponible' || fila.estado === 'reservado'
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {foto ? (
            <img src={foto} alt={fila.titulo} className="h-full w-full object-cover" loading="lazy" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-medium text-foreground">{fila.titulo}</p>
          <span
            className={cn(
              'mt-1 inline-block rounded-lg px-2 py-1 text-[13px] font-medium',
              COLOR_ESTADO[fila.estado],
            )}
          >
            {ETIQUETA_ESTADO[fila.estado]}
          </span>
          {fila.estado === 'disponible' && fila.solicitudes_abiertas > 0 ? (
            <p className="mt-1 text-[15px] font-semibold text-primary">
              {fila.solicitudes_abiertas === 1
                ? '1 solicitud'
                : `${fila.solicitudes_abiertas} solicitudes`}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-11 flex-1 rounded-xl">
          <Link to="/mis-publicaciones/$id" params={{ id: fila.id }}>
            {fila.estado === 'reservado' ? 'Ver la entrega' : 'Ver solicitudes'}
          </Link>
        </Button>
        {puedeRetirar ? (
          <Button variant="ghost" className="h-11 rounded-xl" onClick={onRetirar}>
            Retirar
          </Button>
        ) : null}
      </div>
    </div>
  )
}
