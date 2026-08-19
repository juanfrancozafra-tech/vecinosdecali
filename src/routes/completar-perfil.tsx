import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RutaProtegida } from '@/components/RutaProtegida'
import { SelectorBarrio } from '@/components/SelectorBarrio'
import { db, mensajeDeError } from '@/lib/db'
import type { RolVecino } from '@/lib/database.types'
import {
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
    if (whatsapp) setTelefono((a) => (a ? a : whatsapp))
  }, [perfil?.barrio_id, perfil?.mi_situacion, whatsapp])

  useEffect(() => {
    if (perfilCompleto) {
      olvidarRolElegido()
      const destino = tomarRutaOrigen()
      navigate({ to: destino ?? '/', replace: true })
    }
  }, [perfilCompleto, navigate])

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

      const { error: errorPerfil } = await db
        .from('perfiles')
        .upsert({ id: usuario.id, nombre: nombre.trim() }, { onConflict: 'id' })
      if (errorPerfil) throw errorPerfil

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
          <p className="mt-2 text-[17px] leading-relaxed text-muted-foreground">
            Podés cambiarlo después desde tu cuenta.
          </p>
          <div className="mt-8 space-y-3">
            <Button
              className="h-14 w-full rounded-xl text-[17px]"
              onClick={() => setRol('doy')}
            >
              Quiero regalar algo
            </Button>
            <Button
              variant="outline"
              className="h-14 w-full rounded-xl text-[17px]"
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
        <p className="mt-2 text-[17px] leading-relaxed text-muted-foreground">
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
            <Input
              id="whatsapp"
              inputMode="tel"
              placeholder="+57 300 000 0000"
              value={telefono}
              onBlur={() => {
                setTocado(true)
                setErrorTelefono(errorWhatsapp(telefono))
              }}
              onChange={(e) => alCambiarTelefono(e.target.value)}
              aria-invalid={Boolean(errorTelefono)}
              className="h-12 rounded-xl text-base"
              required
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
              <a href="/#datos" className="underline">
                política
              </a>
              .
            </span>
          </label>
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background px-5 py-4">
          <div className="mx-auto w-full max-w-sm">
            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-[17px]"
              disabled={guardando}
            >
              {guardando ? 'Guardando…' : 'Listo'}
            </Button>
          </div>
        </div>
      </form>
    </main>
  )
}
