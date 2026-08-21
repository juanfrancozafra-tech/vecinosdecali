// Pendientes del vecino. Viven dentro de la app: no hay correo ni push.
// Nada del sistema depende de esto: la reserva se libera a las 48 horas por
// reloj, haya visto el aviso o no.
import { useCallback, useEffect, useState } from 'react'

import { db } from '@/lib/db'
import { useAuth } from '@/lib/auth'
import type { Articulo } from '@/lib/database.types'

const CLAVE_VISTO = 'vdc:solicitudes-vistas'
const CLAVE_CERRADO = 'vdc:franja-cerrada'

/** Marca como vistas las solicitudes de mis publicaciones. */
export function marcarSolicitudesVistas() {
  try {
    window.localStorage.setItem(CLAVE_VISTO, new Date().toISOString())
  } catch {
    /* almacenamiento no disponible */
  }
}

function leerVisto(): number {
  try {
    const valor = window.localStorage.getItem(CLAVE_VISTO)
    return valor ? new Date(valor).getTime() : 0
  } catch {
    return 0
  }
}

export type Pendiente =
  | { tipo: 'solicitudes'; cantidad: number; desde: number }
  | { tipo: 'entrega'; articuloId: string; titulo: string; desde: number }

export type EstadoPendientes = {
  hayAlgo: boolean
  solicitudesSinVer: number
  entregasSinConfirmar: number
  /**
   * Solicitudes propias ya aceptadas. Es el contador de la navegación inferior
   * de quien recibe, y su única señal dentro de la app de que alguien lo
   * eligió. No lleva lógica de "ya lo vi", igual que el prototipo: sigue ahí
   * hasta que la solicitud deja de estar aceptada.
   */
  aceptadas: number
  /** El pendiente más antiguo: es el que se muestra en la franja. */
  principal: Pendiente | null
  refrescar: () => void
}

export function usePendientes(): EstadoPendientes {
  const { usuario, perfil } = useAuth()
  const [solicitudes, setSolicitudes] = useState<Pendiente | null>(null)
  const [entrega, setEntrega] = useState<Pendiente | null>(null)
  const [entregas, setEntregas] = useState(0)
  const [aceptadas, setAceptadas] = useState(0)
  const [tic, setTic] = useState(0)

  const refrescar = useCallback(() => setTic((n) => n + 1), [])

  // Rama de quien recibe. Antes no existía: el vecino que pedía algo no tenía
  // ninguna señal dentro de la app de que lo habían elegido, y como él nunca
  // puede escribir primero, se quedaba esperando sin saber.
  useEffect(() => {
    const userId = usuario?.id
    if (!userId || perfil?.rol_principal !== 'recibo') {
      setAceptadas(0)
      return
    }
    let activo = true
    db.from('solicitudes')
      .select('id', { count: 'exact', head: true })
      .eq('solicitante_id', userId)
      .eq('estado', 'aceptada')
      .then(({ count }) => {
        if (activo) setAceptadas(count ?? 0)
      })
    return () => {
      activo = false
    }
  }, [usuario?.id, perfil?.rol_principal, tic])

  useEffect(() => {
    const userId = usuario?.id
    if (!userId || perfil?.rol_principal !== 'doy') {
      setSolicitudes(null)
      setEntrega(null)
      setEntregas(0)
      return
    }
    let activo = true
    ;(async () => {
      const { data } = await db
        .from('articulos')
        .select('id, titulo, estado, creado_en, reservado_hasta')
        .eq('donante_id', userId)
        .in('estado', ['disponible', 'reservado'])
      if (!activo) return
      const mios = (data ?? []) as Pick<
        Articulo,
        'id' | 'titulo' | 'estado' | 'creado_en' | 'reservado_hasta'
      >[]

      // Entregas sin confirmar: lo reservado espera que el donante cierre el ciclo.
      const reservados = mios
        .filter((a) => a.estado === 'reservado')
        .sort(
          (a, b) =>
            new Date(a.reservado_hasta ?? a.creado_en).getTime() -
            new Date(b.reservado_hasta ?? b.creado_en).getTime(),
        )
      setEntregas(reservados.length)
      const primero = reservados[0]
      setEntrega(
        primero
          ? {
              tipo: 'entrega',
              articuloId: primero.id,
              titulo: primero.titulo,
              desde: new Date(primero.reservado_hasta ?? primero.creado_en).getTime(),
            }
          : null,
      )

      // Solicitudes sin ver en lo que sigue disponible.
      const disponibles = mios.filter((a) => a.estado === 'disponible').map((a) => a.id)
      if (disponibles.length === 0) {
        setSolicitudes(null)
        return
      }
      const { data: sols } = await db
        .from('solicitudes')
        .select('id, creada_en')
        .eq('estado', 'pendiente')
        .in('articulo_id', disponibles)
        .order('creada_en', { ascending: true })
      if (!activo) return
      const visto = leerVisto()
      const nuevas = ((sols ?? []) as { id: string; creada_en: string }[]).filter(
        (s) => new Date(s.creada_en).getTime() > visto,
      )
      setSolicitudes(
        nuevas.length
          ? {
              tipo: 'solicitudes',
              cantidad: nuevas.length,
              desde: new Date(nuevas[0]!.creada_en).getTime(),
            }
          : null,
      )
    })()
    return () => {
      activo = false
    }
  }, [usuario?.id, perfil?.rol_principal, tic])

  const candidatos = [entrega, solicitudes].filter((p): p is Pendiente => p !== null)
  candidatos.sort((a, b) => a.desde - b.desde)

  return {
    hayAlgo: candidatos.length > 0 || aceptadas > 0,
    solicitudesSinVer: solicitudes?.tipo === 'solicitudes' ? solicitudes.cantidad : 0,
    entregasSinConfirmar: entregas,
    aceptadas,
    principal: candidatos[0] ?? null,
    refrescar,
  }
}

/** La franja se puede cerrar, pero vuelve en la siguiente sesión. */
export function franjaCerrada(): boolean {
  try {
    return window.sessionStorage.getItem(CLAVE_CERRADO) === '1'
  } catch {
    return false
  }
}

export function cerrarFranja() {
  try {
    window.sessionStorage.setItem(CLAVE_CERRADO, '1')
  } catch {
    /* nada */
  }
}
