// Apertura del lado que recibe.
//
// Hasta el 5 de septiembre la app solo acepta cuentas de quien regala. La razón
// no es técnica: si el catálogo está vacío cuando llega la primera familia, se
// va y no vuelve. Primero se siembra, después se abre.
//
// Esto no es un candado, es una puerta cerrada con un cartel. Quien ya tiene
// cuenta de receptor —las cuentas de prueba— sigue pudiendo solicitar: el
// bloqueo está en el camino de registro, no en la acción.
//
// Se apaga solo. No hay que acordarse de sacar nada el día de la apertura.
//
// La fecha se movió del 1 al 5 de septiembre: la siembra del catálogo iba más
// lenta de lo esperado y abrir con poco es peor que abrir tarde. Cambiarla es
// tocar solo las dos constantes de abajo; todo lo demás las lee.

/** 5 de septiembre de 2026, 00:00 en Cali (UTC-5). */
export const APERTURA_RECIBIR = new Date('2026-09-05T05:00:00Z')

/** Cómo se nombra la fecha en pantalla. */
export const FECHA_APERTURA = '5 de septiembre'

export function recibirAbierto(ahora: Date = new Date()): boolean {
  return ahora.getTime() >= APERTURA_RECIBIR.getTime()
}
