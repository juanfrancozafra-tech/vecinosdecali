// Franja de pendientes y punto en el menú. Las notificaciones viven dentro de
// la app y en el hilo de WhatsApp que ya existe entre los dos vecinos.
import { Link, useNavigate } from '@tanstack/react-router'
import { Menu } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth'
import { usePendientes } from '@/lib/pendientes'

export function MenuVecino() {
  const { usuario, perfil, cerrarSesion } = useAuth()
  const { hayAlgo } = usePendientes()
  const navigate = useNavigate()

  if (!usuario) return null
  const doy = perfil?.rol_principal === 'doy'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú"
        className="relative -mr-2 inline-flex size-11 items-center justify-center rounded-full"
      >
        <Menu className="size-5 text-foreground" />
        {hayAlgo ? (
          <span
            aria-label="Tenés algo sin ver"
            className="absolute right-2 top-2 size-2.5 rounded-full bg-primary ring-2 ring-background"
          />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuItem asChild>
          <Link to="/articulos">Catálogo</Link>
        </DropdownMenuItem>
        {doy ? (
          // "Publicar algo" salió de acá: vive en la franja, siempre visible.
          <DropdownMenuItem asChild>
            <Link to="/mis-publicaciones" className="justify-between">
              Mis publicaciones
              {hayAlgo ? <span className="size-2 rounded-full bg-primary" /> : null}
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/mis-solicitudes">Mis solicitudes</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/mi-cuenta">Mi cuenta</Link>
        </DropdownMenuItem>
        {/* Salir estaba solo al final de Mi cuenta, como botón fantasma. Si
            esa pantalla no carga —una sesión que quedó huérfana, por
            ejemplo— no había forma de salir de la app. */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void cerrarSesion().then(() => navigate({ to: '/', replace: true }))
          }}
        >
          Cerrar sesión
        </DropdownMenuItem>
    </DropdownMenuContent>
    </DropdownMenu>
  )
}
