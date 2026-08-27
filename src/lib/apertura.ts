// Apertura del lado que recibe.
//
// Hasta el 1 de septiembre la app solo acepta cuentas de quien regala. La razón
// no es técnica: si el catálogo está vacío cuando llega la primera familia, se
// va y no vuelve. Primero se siembra, después se abre.
//
// Esto no es un candado, es una puerta cerrada con un cartel. Quien ya tiene
// cuenta de receptor —las cuentas de prueba— sigue pudiendo solicitar: el
// bloqueo está en el camino de registro, no en la acción.
//
// Se apaga solo. No hay que acordarse de sacar nada el 1 de septiembre.

/** 1 de septiembre de 2026, 00:00 en Cali (UTC-5). */
export const APERTURA_RECIBIR = new Date('2026-09-01T05:00:00Z')

/** Cómo se nombra la fecha en pantalla. */
export const FECHA_APERTURA = '1 de septiembre'

export function recibirAbierto(ahora: Date = new Date()): boolean {
  return ahora.getTime() >= APERTURA_RECIBIR.getTime()
}
