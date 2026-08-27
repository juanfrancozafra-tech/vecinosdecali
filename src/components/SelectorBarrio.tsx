// Selector de barrio con búsqueda sobre la tabla `barrios`.
//
// La lista tiene una fila especial para quien no encuentra el suyo. Antes vivía
// mezclada entre las demás, ordenada alfabéticamente, así que quedaba enterrada
// entre las O: justo la persona que ya no encontró su barrio tenía que seguir
// buscando una opción escondida. Ahora está fija abajo, siempre visible aunque
// se esté filtrando, y el mensaje de «no encontramos nada» apunta a ella.
//
// Esa fila se llama distinto según qué pregunta esté respondiendo. Acá dice
// «Mi barrio no está en la lista», que es lo que la persona está pensando. En
// la tarjeta y en la ficha dice «Otro sector de Cali», que es lo que el otro
// vecino necesita leer. Es la misma fila; la traducción vive solo acá, que es
// donde se elige.
import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronsUpDown, MapPinOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import type { Barrio } from '@/lib/database.types'

/**
 * Nombre exacto de la fila comodín en `barrios`. Si se renombra en la base hay
 * que cambiarlo acá también: sin coincidencia, el renglón de abajo no aparece
 * y la fila vuelve a la lista alfabética, que es de donde la sacamos.
 */
const NOMBRE_OTRO = 'Otro sector de Cali'
const ETIQUETA_OTRO = 'Mi barrio no está en la lista'

export function SelectorBarrio({
  valor,
  onChange,
}: {
  valor: number | null
  onChange: (barrioId: number) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [escrito, setEscrito] = useState('')

  useEffect(() => {
    let activo = true
    db.from('barrios')
      .select('id, nombre, comuna')
      .order('nombre')
      .then(({ data }) => {
        if (activo && data) setBarrios(data as Barrio[])
      })
    return () => {
      activo = false
    }
  }, [])

  const otro = useMemo(() => barrios.find((b) => b.nombre === NOMBRE_OTRO) ?? null, [barrios])
  const listados = useMemo(() => barrios.filter((b) => b.nombre !== NOMBRE_OTRO), [barrios])

  const seleccionado = useMemo(
    () => barrios.find((b) => b.id === valor) ?? null,
    [barrios, valor],
  )

  function elegir(id: number) {
    onChange(id)
    setEscrito('')
    setAbierto(false)
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          className="h-12 w-full justify-between rounded-xl text-base font-normal"
        >
          {/* Con la fila comodín elegida muestra su nombre público, no la
              etiqueta de acá: así se ve de una qué va a leer el otro vecino. */}
          {seleccionado ? seleccionado.nombre : 'Buscá tu barrio'}
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Escribí el nombre del barrio…"
            value={escrito}
            onValueChange={setEscrito}
          />
          <CommandList>
            {/* No es un aviso, es una salida. Decirle «no encontramos nada» a
                quien ya buscó no le resuelve el paso en el que está atascado. */}
            <CommandEmpty className="px-4 py-5 text-center">
              <p className="text-body font-medium text-foreground">
                {escrito.trim() ? `No encontramos «${escrito.trim()}»` : 'No encontramos ese barrio'}
              </p>
              <p className="mt-1 text-chip leading-relaxed text-muted-foreground">
                Elegí «{ETIQUETA_OTRO}», acá abajo.
              </p>
            </CommandEmpty>
            <CommandGroup>
              {listados.map((barrio) => (
                <CommandItem
                  key={barrio.id}
                  value={`${barrio.nombre} ${barrio.comuna ?? ''}`}
                  onSelect={() => elegir(barrio.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      barrio.id === valor ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span>{barrio.nombre}</span>
                  {barrio.comuna ? (
                    <span className="ml-auto text-small text-muted-foreground">
                      Comuna {barrio.comuna}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          {/* Fuera de CommandList a propósito: adentro lo filtraría el buscador
              y desaparecería justo cuando hace falta. */}
          {otro ? (
            <button
              type="button"
              onClick={() => elegir(otro.id)}
              className={cn(
                'flex w-full items-center gap-2 border-t border-border px-3 py-3 text-left text-tarjeta',
                valor === otro.id ? 'bg-secondary font-medium' : 'hover:bg-muted',
              )}
            >
              <MapPinOff className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
              <span>{ETIQUETA_OTRO}</span>
              {valor === otro.id ? <Check className="ml-auto size-4 shrink-0" /> : null}
            </button>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
