import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RutaProtegida } from '@/components/RutaProtegida'
import { SelectorBarrio } from '@/components/SelectorBarrio'
import { CampoWhatsapp } from '@/components/CampoWhatsapp'
import { db, mensajeDeError } from '@/lib/db'
import type { RolVecino } from '@/lib/database.types'
import {
  digitosWhatsapp,
  errorWhatsapp,
  leerRolElegido,
  normalizarWhatsapp,
  olvidarRolElegido,
  tomarRutaOrigen,
  useAuth,
} from '@/lib/auth'

export const Route = createFileRoute('/completar-perfil')({
  ssr: false,
  component: () => (
    <RutaProtegida permitirPerfilIncompleto>
      <CompletarPerfil />
    </RutaProtegida>
  ),
  head: () => ({
    meta: [
      { title: 'Completá tu perfil — Vecinos de Cali' },
      {
        name: 'description',
        content: 'Contanos tu nombre y tu WhatsApp para empezar a ayudar o a recibir ayuda.',
      },
      { property: 'og:title', content: 'Completá tu perfil — Vecinos de Cali' },
      {
        property: 'og:description',
        content: 'Contanos tu nombre y tu WhatsApp para empezar a ayudar o a recibir ayuda.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
})

const MAX_SITUACION = 300

function CompletarPerfil() {
  const { usuario, perfil, whatsapp, perfilCompleto, refrescarPerfil } = useAuth()
  const navigate = useNavigate()

  // `tomarRutaOrigen` consume el valor al leerlo. Si el efecto corre dos veces
  // —React lo hace en desarrollo— la segunda lectura devuelve null y manda a la
  // casa del rol en vez de al artículo del que la persona venía. Se lee una
  // sola vez y se recuerda.
  const destinoRef = useRef<string | null | undefined>(undefined)
  const [rol, setRol] = useState<RolVecino | null>(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [barrioId, setBarrioId] = useState<number | null>(null)
  const [situacion, setSituacion] = useState('')
  const [autoriza, setAutoriza] = useState(false)
  const [errorTelefono, setErrorTelefono] = useState<string | null>(null)
  const [tocado, setTocado] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setRol((actual) => actual ?? perfil?.rol_principal ?? leerRolElegido())
  }, [perfil?.rol_principal])

  useEffect(() => {
    const sugerido =
      perfil?.nombre ??
      (usuario?.user_metadata?.['full_name'] as string | undefined) ??
      (usuario?.user_metadata?.['name'] as string | undefined) ??
      ''
    setNombre((actual) => (actual ? actual : sugerido))
  }, [perfil?.nombre, usuario])

  useEffect(() => {
    if (perfil?.barrio_id) setBarrioId((a) => a ?? perfil.barrio_id)
    if (perfil?.mi_situacion) setSituacion((a) => (a ? a : (perfil.mi_situacion ?? '')))
    if (whatsapp) setTelefono((a) => (a ? a : digitosWhatsapp(whatsapp)))
  }, [perfil?.barrio_id, perfil?.mi_situacion, whatsapp])

  useEffect(() => {
    if (perfilCompleto) {
      olvidarRolElegido()
      if (destinoRef.current === undefined) destinoRef.current = tomarRutaOrigen()
      const destino = destinoRef.current
      const casa = perfil?.rol_principal === 'doy' ? '/mis-publicaciones' : '/articulos'
      navigate({ to: destino ?? casa, replace: true })
    }
  }, [perfilCompleto, perfil?.rol_principal, navigate])

  // Lo que hace falta para poder guardar, según el rol. Se calcula igual que
  // las validaciones de `guardar`, para que el botón y el envío nunca digan
  // cosas distintas.
  const faltantes: string[] = []
  if (!nombre.trim()) faltantes.push('tu nombre')
  if (errorWhatsapp(telefono)) faltantes.push('tu WhatsApp')
  if (rol === 'doy' && !barrioId) faltantes.push('tu barrio')
  if (rol === 'recibo' && !situacion.trim()) faltantes.push('tu situación')
  if (!autoriza) faltantes.push('la autorización de datos')
  const puedeGuardar = faltantes.length === 0

  function alCambiarTelefono(valor: string) {
    setTelefono(valor)
    if (tocado) setErrorTelefono(errorWhatsapp(valor))
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!usuario || !rol) return
    setTocado(true)
    const errTel = errorWhatsapp(telefono)
    setErrorTelefono(errTel)
    if (errTel) return
    if (!nombre.trim()) {
      toast.error('Escribí tu nombre.')
      return
    }
    if (!autoriza) {
      toast.error('Necesitamos tu autorización para tratar tus datos.')
      return
    }
    if (rol === 'doy' && !barrioId) {
      toast.error('Elegí tu barrio.')
      return
    }
    if (rol === 'recibo' && !situacion.trim()) {
      toast.error('Contanos qué estás buscando.')
      return
    }

    setGuardando(true)
    try {
      const numero = normalizarWhatsapp(telefono)

      // UPDATE, no upsert. La fila del perfil ya existe: la crea el trigger
      // `crear_perfil` cuando Google devuelve al vecino, así que acá nunca hay
      // nada que insertar.
      //
      // El upsert además fallaba con "permission denied for table perfiles", y
      // no por un permiso mal puesto sino por uno bien puesto. Un upsert es un
      // INSERT ... ON CONFLICT DO UPDATE, y PostgREST mete en el SET todas las
      // columnas del cuerpo, `id` incluida. El esquema revoca el UPDATE sobre
      // `perfiles` y lo devuelve solo sobre nombre, foto_url, barrio_id y
      // mi_situacion — justamente para que nadie se ascienda a admin ni se
      // infle los contadores desde el navegador. `id` no está en esa lista, y
      // ahí muere.
      const { data: filaPerfil, error: errorPerfil } = await db
        .from('perfiles')
        .update({ nombre: nombre.trim() })
        .eq('id', usuario.id)
        .select('id')
        .maybeSingle()
      if (errorPerfil) throw errorPerfil
      // Si el trigger no alcanzó a crear la fila, el update no toca nada y
      // `cambiar_rol` tampoco — todo "funciona" y no se guarda nada, y el
      // vecino se queda dando vueltas en este mismo formulario sin entender
      // por qué. Mejor decirlo.
      if (!filaPerfil) {
        throw new Error('No encontramos tu cuenta. Salí y volvé a entrar, por favor.')
      }

      const { error: errorContacto } = await db
        .from('contactos')
        .upsert({ perfil_id: usuario.id, whatsapp: numero }, { onConflict: 'perfil_id' })
      if (errorContacto) {
        const msg = mensajeDeError(errorContacto)
        if (/duplicad|duplicate|unique|ya está/i.test(msg)) {
          setErrorTelefono('Ese número ya está registrado en otra cuenta.')
          setGuardando(false)
          return
        }
        throw errorContacto
      }

      const { error: errorRol } = await db.rpc('cambiar_rol', {
        p_rol: rol,
        p_barrio_id: rol === 'doy' ? barrioId : null,
        p_situacion: rol === 'recibo' ? situacion.trim() : null,
      })
      if (errorRol) throw errorRol

      await refrescarPerfil()
      olvidarRolElegido()
    } catch (error) {
      toast.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  if (!rol) {
    return (
      <main className="flex min-h-screen flex-col justify-center bg-background px-5 py-12">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            ¿Cómo querés participar?
          </h1>
          <p className="mt-2 text-body leading-relaxed text-muted-foreground">
            Podés cambiarlo después desde tu cuenta.
          </p>
          <div className="mt-8 space-y-3">
            <Button
              className="h-14 w-full rounded-xl text-body"
              onClick={() => setRol('doy')}
            >
              Quiero regalar algo
            </Button>
            <Button
              variant="outline"
              className="h-14 w-full rounded-xl text-body"
              onClick={() => setRol('recibo')}
            >
              Necesito algo
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <form onSubmit={guardar} className="mx-auto w-full max-w-sm px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Completá tu perfil
        </h1>
        <p className="mt-2 text-body leading-relaxed text-muted-foreground">
          {rol === 'doy'
            ? 'Con esto un vecino sabe quién le está regalando.'
            : 'Con esto los vecinos saben a quién le están ayudando.'}
        </p>

        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nombre">Tu nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="h-12 rounded-xl text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <CampoWhatsapp
              valor={telefono}
              alCambiar={alCambiarTelefono}
              alSalir={() => {
                setTocado(true)
                setErrorTelefono(errorWhatsapp(telefono))
              }}
              hayError={Boolean(errorTelefono)}
            />
            {errorTelefono ? (
              <p className="text-sm text-destructive">{errorTelefono}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Solo lo verá el vecino con quien inicies una conversación. Nunca aparece en
                tus publicaciones.
              </p>
            )}
          </div>

          {rol === 'doy' ? (
            <div className="space-y-2">
              <Label>Tu barrio</Label>
              <SelectorBarrio valor={barrioId} onChange={setBarrioId} />
              <p className="text-sm text-muted-foreground">
                Para que un vecino sepa si le queda cerca. No pedimos tu dirección.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="situacion">Mi situación</Label>
              <Textarea
                id="situacion"
                value={situacion}
                maxLength={MAX_SITUACION}
                rows={5}
                onChange={(e) => setSituacion(e.target.value.slice(0, MAX_SITUACION))}
                className="rounded-xl text-base"
                required
              />
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Contales a los vecinos qué estás buscando y por qué. Es lo primero que ven
                  cuando pedís algo.
                </p>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {situacion.length}/{MAX_SITUACION}
                </span>
              </div>
            </div>
          )}

          <label className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
            <Checkbox
              checked={autoriza}
              onCheckedChange={(v) => setAutoriza(v === true)}
              className="mt-0.5"
            />
            <span>
              Autorizo el tratamiento de mis datos personales según la{' '}
              {/* En pestaña nueva. Es el caso más claro: el enlace vive al
                  lado de una casilla que hay que marcar, dentro de un
                  formulario a medio llenar. Nadie debería perder lo escrito
                  por leer aquello que se le pide aceptar. */}
              <Link
                to="/datos"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                política de tratamiento de datos
              </Link>
              .
            </span>
          </label>
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background px-5 py-4">
          <div className="mx-auto w-full max-w-sm">
            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-body"
              disabled={guardando || !puedeGuardar}
            >
              {guardando ? 'Guardando…' : 'Listo'}
            </Button>
            {/* Un botón apagado sin explicación deja a la persona sin saber qué
                le falta. Se lo decimos. */}
            {!puedeGuardar && !guardando ? (
              <p className="mt-2 text-center text-small text-muted-foreground">
                Falta {faltantes.join(', ').replace(/, ([^,]*)$/, ' y $1')}.
              </p>
            ) : null}
          </div>
        </div>
      </form>
    </main>
  )
}
