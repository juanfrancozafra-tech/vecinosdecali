// Selector de barrio con búsqueda sobre la tabla `barrios`.
import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

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

export function SelectorBarrio({
  valor,
  onChange,
}: {
  valor: number | null
  onChange: (barrioId: number) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [barrios, setBarrios] = useState<Barrio[]>([])

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

  const seleccionado = useMemo(
    () => barrios.find((b) => b.id === valor) ?? null,
    [barrios, valor],
  )

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
          {seleccionado ? seleccionado.nombre : 'Buscá tu barrio'}
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Escribí el nombre del barrio…" />
          <CommandList>
            <CommandEmpty>No encontramos ese barrio.</CommandEmpty>
            <CommandGroup>
              {barrios.map((barrio) => (
                <CommandItem
                  key={barrio.id}
                  value={`${barrio.nombre} ${barrio.comuna ?? ''}`}
                  onSelect={() => {
                    onChange(barrio.id)
                    setAbierto(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      barrio.id === valor ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span>{barrio.nombre}</span>
                  {barrio.comuna ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Comuna {barrio.comuna}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
