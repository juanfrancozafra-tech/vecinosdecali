// Contexto de autenticación de Vecinos de Cali.
// Solo publishable/anon key. El perfil propio se lee de `perfiles`
// (única fila permitida) y el WhatsApp propio de `contactos`.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { db } from '@/lib/db'
import type { Perfil, RolVecino } from '@/lib/database.types'

const CLAVE_ROL_ELEGIDO = 'vdc:rol-elegido'
const CLAVE_RUTA_ORIGEN = 'vdc:ruta-origen'

export function guardarRolElegido(rol: RolVecino) {
  try {
    window.localStorage.setItem(CLAVE_ROL_ELEGIDO, rol)
  } catch {
    /* almacenamiento no disponible */
  }
}

export function leerRolElegido(): RolVecino | null {
  try {
    const valor = window.localStorage.getItem(CLAVE_ROL_ELEGIDO)
    return valor === 'doy' || valor === 'recibo' ? valor : null
  } catch {
    return null
  }
}

export function olvidarRolElegido() {
  try {
    window.localStorage.removeItem(CLAVE_ROL_ELEGIDO)
  } catch {
    /* nada */
  }
}

/** Guarda la ruta desde la que el vecino fue mandado a /entrar. */
export function guardarRutaOrigen(ruta: string) {
  try {
    if (ruta.startsWith('/') && !ruta.startsWith('//')) {
      window.localStorage.setItem(CLAVE_RUTA_ORIGEN, ruta)
    }
  } catch {
    /* nada */
  }
}

export function tomarRutaOrigen(): string | null {
  try {
    const valor = window.localStorage.getItem(CLAVE_RUTA_ORIGEN)
    window.localStorage.removeItem(CLAVE_RUTA_ORIGEN)
    if (valor && valor.startsWith('/') && !valor.startsWith('//')) return valor
    return null
  } catch {
    return null
  }
}

export type EstadoAuth = {
  cargando: boolean
  session: Session | null
  usuario: User | null
  perfil: Perfil | null
  whatsapp: string | null
  perfilCompleto: boolean
  refrescarPerfil: () => Promise<void>
  cerrarSesion: () => Promise<void>
}

const AuthContext = createContext<EstadoAuth | null>(null)

async function cargarPerfil(userId: string) {
  const [{ data: perfil }, { data: contacto }] = await Promise.all([
    db.from('perfiles').select('*').eq('id', userId).maybeSingle(),
    db.from('contactos').select('whatsapp').eq('perfil_id', userId).maybeSingle(),
  ])
  return {
    perfil: (perfil as Perfil | null) ?? null,
    whatsapp: contacto?.whatsapp ?? null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [whatsapp, setWhatsapp] = useState<string | null>(null)

  const refrescarPerfil = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) {
      setPerfil(null)
      setWhatsapp(null)
      return
    }
    const datos = await cargarPerfil(userId)
    setPerfil(datos.perfil)
    setWhatsapp(datos.whatsapp)
  }, [session?.user?.id])

  useEffect(() => {
    let activo = true

    const { data: sub } = db.auth.onAuthStateChange((_evento, nuevaSesion) => {
      if (!activo) return
      setSession(nuevaSesion)
    })

    db.auth.getSession().then(({ data }) => {
      if (!activo) return
      setSession(data.session)
      setCargando(false)
    })

    return () => {
      activo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let activo = true
    const userId = session?.user?.id
    if (!userId) {
      setPerfil(null)
      setWhatsapp(null)
      return
    }
    ;(async () => {
      let datos = await cargarPerfil(userId)

      // La fila del perfil la crea el trigger `crear_perfil` en la misma
      // transacción que el alta, así que a esta altura ya debería estar. Un
      // reintento cubre la carrera por si alguna vez no.
      if (!datos.perfil) {
        await new Promise((r) => setTimeout(r, 700))
        if (!activo) return
        datos = await cargarPerfil(userId)
      }
      if (!activo) return

      // Sesión fantasma: el token sigue guardado en el navegador pero la
      // cuenta ya no existe en la base. Pasa al borrar un usuario desde
      // Supabase con la pestaña abierta, y es una trampa sin salida: la app te
      // cree conectado, te manda a completar el perfil, y ahí no hay fila que
      // actualizar. Ni siquiera se puede cerrar sesión, porque ese botón vive
      // en una pantalla a la que ya no se llega. Se cierra sola.
      if (!datos.perfil) {
        await db.auth.signOut()
        if (!activo) return
        setSession(null)
        setPerfil(null)
        setWhatsapp(null)
        return
      }

      setPerfil(datos.perfil)
      setWhatsapp(datos.whatsapp)
    })()
    return () => {
      activo = false
    }
  }, [session?.user?.id])

  const cerrarSesion = useCallback(async () => {
    await db.auth.signOut()
    setSession(null)
    setPerfil(null)
    setWhatsapp(null)
  }, [])

  const valor = useMemo<EstadoAuth>(() => {
    const nombreListo = Boolean(perfil?.nombre && perfil.nombre.trim())
    const rolListo = Boolean(perfil?.rol_principal)
    const extraListo =
      perfil?.rol_principal === 'doy'
        ? Boolean(perfil?.barrio_id)
        : perfil?.rol_principal === 'recibo'
          ? Boolean(perfil?.mi_situacion && perfil.mi_situacion.trim())
          : false
    return {
      cargando,
      session,
      usuario: session?.user ?? null,
      perfil,
      whatsapp,
      perfilCompleto: Boolean(
        session?.user && nombreListo && rolListo && extraListo && whatsapp,
      ),
      refrescarPerfil,
      cerrarSesion,
    }
  }, [cargando, session, perfil, whatsapp, refrescarPerfil, cerrarSesion])

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth(): EstadoAuth {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

/** Normaliza lo que escribe el vecino a +573XXXXXXXXX. */
export function normalizarWhatsapp(entrada: string): string {
  const digitos = entrada.replace(/\D/g, '')
  const sin57 = digitos.startsWith('57') ? digitos.slice(2) : digitos
  return `+57${sin57}`
}

export function errorWhatsapp(entrada: string): string | null {
  const digitos = entrada.replace(/\D/g, '')
  const sin57 = digitos.startsWith('57') ? digitos.slice(2) : digitos
  if (!sin57) return 'Escribí tu número de WhatsApp.'
  if (!sin57.startsWith('3')) return 'El número debe empezar por 3.'
  if (sin57.length < 10) return 'Faltan dígitos: son 10 después del +57.'
  if (sin57.length > 10) return 'Son 10 dígitos después del +57.'
  return null
}
