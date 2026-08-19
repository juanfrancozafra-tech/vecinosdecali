// Flujo de confirmación de entrega, en tres pantallas + celebración.
// El sistema NO asume a quién se le entregó: el vecino que da lo dice.
import { useEffect, useState } from 'react'
import { Heart, Star } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { db, mensajeDeError } from '@/lib/db'
import { fotoTransformada } from '@/lib/imagenes'
import { useAuth } from '@/lib/auth'
import type { NivelVecino } from '@/lib/database.types'

const ETIQUETA_NIVEL: Record<NivelVecino, string> = {
  nuevo: 'Vecino nuevo',
  verificado: 'Vecino verificado',
  conocido: 'Vecino conocido',
}

type Candidato = {
  perfil_id: string
  nombre: string | null
  foto_url: string | null
  nivel: NivelVecino
  fue_aceptado: boolean
}

const FUERA = 'fuera-de-la-app'

export function FlujoEntrega({
  articuloId,
  tituloArticulo,
  onCerrar,
  onListo,
  onPublicarOtra,
}: {
  articuloId: string
  tituloArticulo: string
  onCerrar: () => void
  onListo: () => void
  onPublicarOtra: () => void
}) {
  const { perfil, refrescarPerfil } = useAuth()
  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null)
  const [elegido, setElegido] = useState<string | null>(null)
  const [estrellas, setEstrellas] = useState(0)
  const [comentario, setComentario] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [exito, setExito] = useState<{ nombre: string | null; primera: boolean } | null>(null)

  const entregasAntes = perfil?.entregas_confirmadas ?? 0

  useEffect(() => {
    if (paso !== 2 || candidatos !== null) return
    let activo = true
    db.rpc('candidatos_entrega', { p_articulo_id: articuloId }).then(({ data, error }) => {
      if (!activo) return
      if (error) {
        toast.error(mensajeDeError(error))
        setCandidatos([])
        return
      }
      const lista = (data ?? []) as Candidato[]
      setCandidatos(lista)
      const aceptado = lista.find((c) => c.fue_aceptado)
      if (aceptado) setElegido(aceptado.perfil_id)
    })
    return () => {
      activo = false
    }
  }, [paso, candidatos, articuloId])

  const liberar = async () => {
    setTrabajando(true)
    const { error } = await db.rpc('liberar_articulo', { p_articulo_id: articuloId })
    setTrabajando(false)
    if (error) {
      toast.error(mensajeDeError(error))
      return
    }
    toast.success('Tu artículo volvió al catálogo.')
    onListo()
  }

  const confirmar = async (opciones?: { conCalificacion?: boolean }) => {
    const receptorId = elegido === FUERA ? null : elegido
    setTrabajando(true)
    const { error } = await db.rpc('confirmar_entrega', {
      p_articulo_id: articuloId,
      p_receptor_id: receptorId,
      ...(opciones?.conCalificacion && receptorId
        ? { p_estrellas: estrellas, p_comentario: comentario.trim() || null }
        : {}),
    })
    setTrabajando(false)
    if (error) {
      toast.error(mensajeDeError(error))
      return
    }
    const nombre =
      receptorId === null
        ? null
        : (candidatos ?? []).find((c) => c.perfil_id === receptorId)?.nombre ?? 'tu vecino'
    await refrescarPerfil()
    setExito({ nombre, primera: entregasAntes === 0 })
  }

  if (exito) {
    return (
      <Celebracion
        nombreReceptor={exito.nombre}
        primera={exito.primera}
        entregas={Math.max(1, (perfil?.entregas_confirmadas ?? 0) || entregasAntes + 1)}
        nombreDonante={perfil?.nombre ?? null}
        onPublicarOtra={onPublicarOtra}
        onCerrar={onListo}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-8 pt-6">
        {paso === 1 ? (
          <>
            <h1 className="text-[24px] font-semibold leading-snug text-foreground">
              ¿Ya entregaste {tituloArticulo}?
            </h1>
            <div className="mt-8 space-y-3">
              <Button className="h-14 w-full rounded-xl text-[17px]" onClick={() => setPaso(2)}>
                Sí, ya lo entregué
              </Button>
              <Button
                variant="outline"
                className="h-14 w-full rounded-xl text-[17px]"
                onClick={onCerrar}
              >
                Todavía no
              </Button>
              <Button
                variant="ghost"
                className="h-14 w-full rounded-xl text-[17px]"
                disabled={trabajando}
                onClick={() => void liberar()}
              >
                El vecino no apareció
              </Button>
            </div>
          </>
        ) : paso === 2 ? (
          <>
            <h1 className="text-[24px] font-semibold leading-snug text-foreground">
              ¿A quién se lo entregaste?
            </h1>
            <div className="mt-6 space-y-3">
              {candidatos === null ? (
                <p className="text-[15px] text-muted-foreground">Un momento…</p>
              ) : (
                <>
                  {candidatos.map((c) => (
                    <button
                      key={c.perfil_id}
                      type="button"
                      onClick={() => setElegido(c.perfil_id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border p-3 text-left',
                        elegido === c.perfil_id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card',
                      )}
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                        {fotoTransformada(c.foto_url, 120) ? (
                          <img
                            src={fotoTransformada(c.foto_url, 120)!}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-medium text-foreground">
                          {c.nombre ?? 'Vecino'}
                        </p>
                        <p className="text-[13px] text-muted-foreground">
                          {ETIQUETA_NIVEL[c.nivel]}
                          {c.fue_aceptado ? ' · le habías aceptado' : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setElegido(FUERA)}
                    className={cn(
                      'w-full rounded-xl border p-4 text-left text-[17px] font-medium text-foreground',
                      elegido === FUERA ? 'border-primary bg-primary/5' : 'border-border bg-card',
                    )}
                  >
                    A alguien que no está en la app
                  </button>
                </>
              )}
            </div>
            <div className="mt-8 space-y-3">
              <Button
                className="h-14 w-full rounded-xl text-[17px]"
                disabled={!elegido || trabajando}
                onClick={() => {
                  if (elegido === FUERA) void confirmar()
                  else setPaso(3)
                }}
              >
                Seguir
              </Button>
              <button
                type="button"
                className="w-full text-center text-[15px] text-muted-foreground"
                onClick={onCerrar}
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[24px] font-semibold leading-snug text-foreground">
              ¿Cómo te fue con{' '}
              {(candidatos ?? []).find((c) => c.perfil_id === elegido)?.nombre ?? 'tu vecino'}?
            </h1>
            <div className="mt-8 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} estrellas`}
                  onClick={() => setEstrellas(n)}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      'h-11 w-11',
                      n <= estrellas ? 'fill-primary text-primary' : 'text-muted-foreground',
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="mt-8">
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value.slice(0, 300))}
                placeholder="¿Algo que quieras contar? (opcional)"
                className="min-h-24 rounded-xl text-[17px]"
              />
              <p className="mt-1 text-right text-[13px] text-muted-foreground">
                {comentario.length}/300
              </p>
            </div>
            <div className="mt-8 space-y-4">
              <Button
                className="h-14 w-full rounded-xl text-[17px]"
                disabled={estrellas === 0 || trabajando}
                onClick={() => void confirmar({ conCalificacion: true })}
              >
                Listo
              </Button>
              <button
                type="button"
                className="w-full text-center text-[15px] text-primary underline"
                disabled={trabajando}
                onClick={() => void confirmar()}
              >
                Prefiero no calificar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Celebracion({
  nombreReceptor,
  primera,
  entregas,
  nombreDonante,
  onPublicarOtra,
  onCerrar,
}: {
  nombreReceptor: string | null
  primera: boolean
  entregas: number
  nombreDonante: string | null
  onPublicarOtra: () => void
  onCerrar: () => void
}) {
  const primerNombre = (nombreDonante ?? 'vecino').trim().split(' ')[0]
  const nombre = nombreReceptor ?? 'Tu vecino'
  const frase =
    nombreReceptor === null
      ? 'Una cosa menos guardada y una familia que arranca mejor.'
      : primera
        ? `Tu primera entrega. ${nombre} ya tiene lo que necesitaba.`
        : `${nombre} ya tiene lo que necesitaba.`

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-9 w-9 text-primary" aria-hidden />
        </div>
        <h1 className="mt-6 text-[28px] font-semibold leading-tight text-foreground">
          Gracias, {primerNombre}.
        </h1>
        <p className="mt-2 text-[19px] font-semibold text-primary">Sos una bacanería.</p>
        <p className="mt-4 text-[17px] leading-relaxed text-foreground">{frase}</p>

        <div className="mt-8 w-full rounded-xl border border-border bg-card p-6">
          {primera && nombreReceptor !== null ? (
            <>
              <p className="text-[19px] font-semibold text-foreground">
                Ya sos un vecino verificado
              </p>
              <p className="mt-2 text-[15px] text-muted-foreground">
                Otro vecino confirmó que se vieron en persona.
              </p>
            </>
          ) : (
            <>
              <p className="text-[40px] font-semibold leading-none text-foreground">{entregas}</p>
              <p className="mt-2 text-[15px] text-muted-foreground">
                vecinos que ayudaste desde que entraste
              </p>
            </>
          )}
        </div>

        <div className="mt-8 w-full space-y-3">
          <Button className="h-14 w-full rounded-xl text-[17px]" onClick={onPublicarOtra}>
            Publicar otra cosa
          </Button>
          <button
            type="button"
            className="w-full text-center text-[15px] text-muted-foreground"
            onClick={onCerrar}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
