// Modal de reporte. Se abre desde un artículo o desde el perfil de un vecino.
// Inserta en la tabla `reportes`. Nunca muestra datos de contacto.
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { db, mensajeDeError } from '@/lib/db'

const MAX_DETALLE = 500

export const MOTIVOS_REPORTE: { valor: string; etiqueta: string }[] = [
  { valor: 'pide_dinero', etiqueta: 'Pide dinero' },
  { valor: 'articulo_no_corresponde', etiqueta: 'El artículo no corresponde' },
  { valor: 'contenido_inapropiado', etiqueta: 'Contenido inapropiado' },
  { valor: 'me_trato_mal', etiqueta: 'Me trató mal' },
  { valor: 'se_esta_aprovechando', etiqueta: 'Sospecho que se está aprovechando' },
  { valor: 'otro', etiqueta: 'Otro' },
]

export function ModalReporte({
  abierto,
  onOpenChange,
  articuloId,
  perfilId,
}: {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  articuloId?: string
  perfilId?: string
}) {
  const [motivo, setMotivo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (abierto) {
      setMotivo('')
      setDetalle('')
      setListo(false)
    }
  }, [abierto])

  async function enviar() {
    if (!motivo) {
      toast.error('Elegí un motivo.')
      return
    }
    setEnviando(true)
    try {
      const { error } = await db.from('reportes').insert({
        articulo_id: articuloId ?? null,
        perfil_id: perfilId ?? null,
        motivo,
        detalle: detalle.trim() ? detalle.trim() : null,
      })
      if (error) throw error
      setListo(true)
    } catch (error) {
      toast.error(mensajeDeError(error))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl">
        {listo ? (
          <>
            <DialogHeader>
              <DialogTitle>Gracias. Lo vamos a revisar.</DialogTitle>
              <DialogDescription>
                Un administrador va a mirar tu reporte.
              </DialogDescription>
            </DialogHeader>
            <Button
              className="h-12 w-full rounded-xl text-body"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Reportar</DialogTitle>
              <DialogDescription>
                Contanos qué pasó. Nadie sabe que fuiste vos.
              </DialogDescription>
            </DialogHeader>

            <RadioGroup value={motivo} onValueChange={setMotivo} className="gap-1">
              {MOTIVOS_REPORTE.map((m) => (
                <Label
                  key={m.valor}
                  htmlFor={`motivo-${m.valor}`}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-3 text-chip font-normal"
                >
                  <RadioGroupItem id={`motivo-${m.valor}`} value={m.valor} />
                  {m.etiqueta}
                </Label>
              ))}
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="detalle-reporte">Detalle (opcional)</Label>
              <Textarea
                id="detalle-reporte"
                rows={4}
                maxLength={MAX_DETALLE}
                value={detalle}
                onChange={(e) => setDetalle(e.target.value.slice(0, MAX_DETALLE))}
                className="rounded-xl text-base"
              />
              <span className="block text-right text-small tabular-nums text-muted-foreground">
                {detalle.length}/{MAX_DETALLE}
              </span>
            </div>

            <Button
              className="h-12 w-full rounded-xl text-body"
              onClick={enviar}
              disabled={enviando}
            >
              {enviando ? 'Enviando…' : 'Enviar reporte'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
