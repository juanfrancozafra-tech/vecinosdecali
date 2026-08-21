import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db, mensajeDeError } from '@/lib/db'
import { tomarRutaOrigen, useAuth } from '@/lib/auth'

export const Route = createFileRoute('/entrar')({
  ssr: false,
  component: Entrar,
  head: () => ({
    meta: [
      { title: 'Entrar — Vecinos de Cali' },
      {
        name: 'description',
        content: 'Entrá a Vecinos de Cali con Google o con un enlace a tu correo.',
      },
      { property: 'og:title', content: 'Entrar — Vecinos de Cali' },
      {
        property: 'og:description',
        content: 'Entrá a Vecinos de Cali con Google o con un enlace a tu correo.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
})

function Entrar() {
  const { usuario, perfilCompleto, cargando } = useAuth()
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [modoCorreo, setModoCorreo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    if (cargando || !usuario) return
    if (!perfilCompleto) {
      navigate({ to: '/completar-perfil', replace: true })
      return
    }
    const destino = tomarRutaOrigen()
    navigate({ to: destino ?? '/', replace: true })
  }, [cargando, usuario, perfilCompleto, navigate])

  async function entrarConGoogle() {
    setEnviando(true)
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/entrar` },
    })
    if (error) {
      setEnviando(false)
      toast.error(mensajeDeError(error))
    }
  }

  async function enviarEnlace(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    const { error } = await db.auth.signInWithOtp({
      email: correo.trim(),
      options: { emailRedirectTo: `${window.location.origin}/entrar` },
    })
    setEnviando(false)
    if (error) {
      toast.error(mensajeDeError(error))
      return
    }
    setEnviado(true)
  }

  return (
    <main className="flex min-h-screen flex-col justify-center bg-background px-5 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Entrá a Vecinos de Cali
        </h1>
        <p className="mt-2 text-body leading-relaxed text-muted-foreground">
          Lo que a vos te sobra, a un vecino le cambia el día.
        </p>

        {enviado ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-5">
            <p className="text-body font-medium text-foreground">Revisá tu correo</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Te mandamos un enlace a <span className="font-medium">{correo}</span>. Abrilo
              desde este mismo celular o computador y ya quedás dentro.
            </p>
            <button
              type="button"
              onClick={() => setEnviado(false)}
              className="mt-4 text-sm text-primary underline"
            >
              Usar otro correo
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-xl text-body"
              disabled={enviando}
              onClick={entrarConGoogle}
            >
              Entrar con Google
            </Button>

            {modoCorreo ? (
              <form onSubmit={enviarEnlace} className="space-y-3 rounded-xl border border-border p-4">
                <Label htmlFor="correo" className="text-sm">
                  Tu correo
                </Label>
                <Input
                  id="correo"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="vecino@correo.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="h-12 rounded-xl text-base"
                />
                <p className="text-sm text-muted-foreground">
                  Te llega un enlace para entrar sin contraseña.
                </p>
                <Button
                  type="submit"
                  variant="secondary"
                  className="h-11 w-full rounded-xl"
                  disabled={enviando}
                >
                  <Mail className="size-4" />
                  Mandame el enlace
                </Button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setModoCorreo(true)}
                className="w-full text-center text-sm text-muted-foreground underline"
              >
                O entrá con tu correo
              </button>
            )}
          </div>
        )}

        <p className="mt-8 text-small leading-relaxed text-muted-foreground">
          Al entrar aceptás nuestras{' '}
          <a href="/#reglas" className="underline">
            reglas
          </a>{' '}
          y el{' '}
          <a href="/#datos" className="underline">
            tratamiento de tus datos
          </a>
          .
        </p>
      </div>
    </main>
  )
}
