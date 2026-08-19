// Herramienta interna de moderación. Solo administradores.
// Si soy_admin() es false mostramos un 404: no delatamos que la ruta existe.
// Todas las acciones van por RPC. Nunca un update directo a las tablas.
import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { db, mensajeDeError } from '@/lib/db'
import type { Json } from '@/lib/database.types'

type FilaReporte = {
  reporte_id: string
  motivo: string
  detalle: string | null
  creado_en: string | null
  articulo_id: string | null
  articulo_titulo: string | null
  perfil_id: string | null
  perfil_nombre: string | null
  reportante_nombre: string | null
}

const ETIQUETA_MOTIVO: Record<string, string> = {
  pide_dinero: 'Pide dinero',
  articulo_no_corresponde: 'El artículo no corresponde',
  contenido_inapropiado: 'Contenido inapropiado',
  me_trato_mal: 'Me trató mal',
  se_esta_aprovechando: 'Sospecho que se está aprovechando',
  otro: 'Otro',
}

export const Route = createFileRoute('/moderacion')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Moderación — Vecinos de Cali' },
      { name: 'description', content: 'Cola interna de reportes de Vecinos de Cali.' },
      { property: 'og:title', content: 'Moderación — Vecinos de Cali' },
      { property: 'og:description', content: 'Cola interna de reportes de Vecinos de Cali.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: Moderacion,
})

function CuatroCientoCuatro() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Esta página no existe</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}

function normalizar(fila: Json): FilaReporte | null {
  if (!fila || typeof fila !== 'object' || Array.isArray(fila)) return null
  const o = fila as Record<string, unknown>
  const texto = (...claves: string[]): string | null => {
    for (const c of claves) {
      const v = o[c]
      if (typeof v === 'string' && v.trim()) return v
    }
    return null
  }
  const id = texto('reporte_id', 'id')
  if (!id) return null
  return {
    reporte_id: id,
    motivo: texto('motivo') ?? 'otro',
    detalle: texto('detalle'),
    creado_en: texto('creado_en', 'creada_en'),
    articulo_id: texto('articulo_id'),
    articulo_titulo: texto('articulo_titulo', 'titulo', 'articulo'),
    perfil_id: texto('perfil_id', 'reportado_id'),
    perfil_nombre: texto('perfil_nombre', 'reportado_nombre', 'nombre'),
    reportante_nombre: texto('reportante_nombre', 'reportante'),
  }
}

type Confirmacion =
  | { tipo: 'ocultar'; fila: FilaReporte }
  | { tipo: 'bloquear'; fila: FilaReporte }
  | { tipo: 'descartar'; fila: FilaReporte }
  | null

function Moderacion() {
  const [estado, setEstado] = useState<'cargando' | 'admin' | 'no'>('cargando')
  const [filas, setFilas] = useState<FilaReporte[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null)
  const [motivoBloqueo, setMotivoBloqueo] = useState('')
  const [trabajando, setTrabajando] = useState(false)

  const cargarCola = useCallback(async () => {
    const { data, error } = await db.rpc('admin_cola_reportes')
    if (error) {
      toast.error(mensajeDeError(error))
      return
    }
    const crudas = (data ?? []) as Json[]
    setFilas(crudas.map(normalizar).filter((f): f is FilaReporte => f !== null))
  }, [])

  useEffect(() => {
    let activo = true
    ;(async () => {
      const { data, error } = await db.rpc('soy_admin')
      if (!activo) return
      if (error || data !== true) {
        setEstado('no')
        return
      }
      setEstado('admin')
      await cargarCola()
    })()
    return () => {
      activo = false
    }
  }, [cargarCola])

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return filas
    return filas.filter(
      (f) =>
        (f.articulo_titulo ?? '').toLowerCase().includes(q) ||
        (f.perfil_nombre ?? '').toLowerCase().includes(q) ||
        (f.reportante_nombre ?? '').toLowerCase().includes(q),
    )
  }, [filas, busqueda])

  if (estado === 'cargando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Un momento…</p>
      </div>
    )
  }
  if (estado === 'no') return <CuatroCientoCuatro />

  async function ejecutar() {
    if (!confirmacion) return
    const { tipo, fila } = confirmacion
    if (tipo === 'bloquear' && !motivoBloqueo.trim()) {
      toast.error('Escribí el motivo del bloqueo.')
      return
    }
    setTrabajando(true)
    try {
      if (tipo === 'ocultar') {
        if (!fila.articulo_id) throw new Error('Este reporte no tiene artículo.')
        const { error } = await db.rpc('admin_ocultar_articulo', {
          p_articulo_id: fila.articulo_id,
          p_reporte_id: fila.reporte_id,
        })
        if (error) throw error
        toast.success('Artículo oculto.')
      } else if (tipo === 'bloquear') {
        const perfilId = fila.perfil_id
        if (!perfilId) throw new Error('Este reporte no tiene vecino.')
        const { error } = await db.rpc('admin_bloquear_vecino', {
          p_perfil_id: perfilId,
          p_motivo: motivoBloqueo.trim(),
          p_reporte_id: fila.reporte_id,
        })
        if (error) throw error
        toast.success('Vecino bloqueado.')
      } else {
        const { error } = await db.rpc('admin_resolver_reporte', {
          p_reporte_id: fila.reporte_id,
        })
        if (error) throw error
        toast.success('Reporte descartado.')
      }
      setConfirmacion(null)
      setMotivoBloqueo('')
      await cargarCola()
    } catch (error) {
      toast.error(mensajeDeError(error))
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link to="/" className="text-[13px] text-muted-foreground">
            ← Inicio
          </Link>
          <h1 className="mt-2 text-[24px] font-semibold text-foreground">Moderación</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-4">
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por artículo o vecino"
          className="h-12 rounded-xl text-base"
        />

        {visibles.length === 0 ? (
          <p className="mt-8 text-[15px] text-muted-foreground">
            {filas.length === 0 ? 'No hay reportes sin resolver.' : 'Nada coincide con la búsqueda.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {visibles.map((f) => {
              const abierta = confirmacion?.fila.reporte_id === f.reporte_id
              return (
                <li key={f.reporte_id} className="rounded-xl border border-border p-4">
                  <p className="text-[15px] font-medium text-foreground">
                    {f.articulo_id ? (
                      <Link
                        to="/articulos/$id"
                        params={{ id: f.articulo_id }}
                        className="underline"
                      >
                        {f.articulo_titulo ?? 'Artículo reportado'}
                      </Link>
                    ) : f.perfil_id ? (
                      <Link to="/vecino/$id" params={{ id: f.perfil_id }} className="underline">
                        {f.perfil_nombre ?? 'Vecino reportado'}
                      </Link>
                    ) : (
                      'Reporte sin objeto'
                    )}
                  </p>
                  <p className="mt-1 text-[15px] text-foreground">
                    {ETIQUETA_MOTIVO[f.motivo] ?? f.motivo}
                  </p>
                  {f.detalle ? (
                    <p className="mt-1 whitespace-pre-line text-[15px] text-muted-foreground">
                      {f.detalle}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    Reportó {f.reportante_nombre ?? 'un vecino'}
                    {f.creado_en ? ` · ${new Date(f.creado_en).toLocaleString('es-CO')}` : ''}
                  </p>

                  {abierta && confirmacion ? (
                    <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
                      <p className="text-[15px] font-medium text-foreground">
                        {confirmacion.tipo === 'ocultar'
                          ? '¿Ocultar este artículo del catálogo?'
                          : confirmacion.tipo === 'bloquear'
                            ? '¿Bloquear a este vecino?'
                            : '¿Descartar este reporte?'}
                      </p>
                      {confirmacion.tipo === 'bloquear' ? (
                        <div className="mt-3 space-y-2">
                          <Label htmlFor="motivo-bloqueo">Motivo del bloqueo</Label>
                          <Textarea
                            id="motivo-bloqueo"
                            rows={3}
                            value={motivoBloqueo}
                            onChange={(e) => setMotivoBloqueo(e.target.value)}
                            className="rounded-xl text-base"
                          />
                        </div>
                      ) : null}
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="ghost"
                          className="h-11 rounded-xl"
                          onClick={() => {
                            setConfirmacion(null)
                            setMotivoBloqueo('')
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          className="h-11 flex-1 rounded-xl"
                          onClick={ejecutar}
                          disabled={trabajando}
                        >
                          {trabajando ? 'Un momento…' : 'Confirmar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {f.articulo_id ? (
                        <Button
                          variant="outline"
                          className="h-10 rounded-xl"
                          onClick={() => setConfirmacion({ tipo: 'ocultar', fila: f })}
                        >
                          Ocultar artículo
                        </Button>
                      ) : null}
                      {f.perfil_id ? (
                        <Button
                          variant="outline"
                          className="h-10 rounded-xl"
                          onClick={() => {
                            setMotivoBloqueo('')
                            setConfirmacion({ tipo: 'bloquear', fila: f })
                          }}
                        >
                          Bloquear vecino
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        className="h-10 rounded-xl"
                        onClick={() => setConfirmacion({ tipo: 'descartar', fila: f })}
                      >
                        Descartar reporte
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
