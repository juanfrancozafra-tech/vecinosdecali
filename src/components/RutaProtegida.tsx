// Envoltorio de ruta protegida: manda a /entrar si no hay sesión y a
// /completar-perfil si el perfil está incompleto.
import { useEffect, type ReactNode } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'

import { guardarRutaOrigen, useAuth } from '@/lib/auth'

export function RutaProtegida({
  children,
  permitirPerfilIncompleto = false,
}: {
  children: ReactNode
  permitirPerfilIncompleto?: boolean
}) {
  const { cargando, usuario, perfilCompleto } = useAuth()
  const navigate = useNavigate()
  const ruta = useRouterState({ select: (s) => s.location.href })

  useEffect(() => {
    if (cargando) return
    if (!usuario) {
      guardarRutaOrigen(ruta)
      navigate({ to: '/entrar', replace: true })
      return
    }
    if (!perfilCompleto && !permitirPerfilIncompleto) {
      navigate({ to: '/completar-perfil', replace: true })
    }
  }, [cargando, usuario, perfilCompleto, permitirPerfilIncompleto, navigate, ruta])

  if (cargando || !usuario || (!perfilCompleto && !permitirPerfilIncompleto)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Un momento…</p>
      </div>
    )
  }

  return <>{children}</>
}
