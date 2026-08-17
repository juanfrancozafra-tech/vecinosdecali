// Único punto de acceso a datos de Vecinos de Cali.
//
// Reglas:
// - Solo la publishable/anon key desde el cliente. No hay cliente service_role.
// - Perfiles ajenos: SIEMPRE la vista `perfiles_vecinos` (requiere sesión).
// - Catálogo: vista `articulos_publicos` (lectura pública).
// - Cambios de estado: SOLO por RPC, nunca con update directo.
// - Los errores de Postgres vienen en español ya redactados: mostrarlos tal cual.
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as generatedClient } from '@/integrations/supabase/client'
import type { Database } from './database.types'

/** Cliente Supabase tipado con el esquema real de Vecinos de Cali. */
export const db = generatedClient as unknown as SupabaseClient<Database, 'public'>

/** Mensaje listo para mostrar al vecino. La base ya lo redacta en español. */
export function mensajeDeError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message)
    if (message.trim()) return message
  }
  return 'Algo salió mal. Intentá de nuevo en un momento.'
}
