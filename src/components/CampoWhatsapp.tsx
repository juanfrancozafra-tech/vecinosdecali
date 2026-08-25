// Campo de WhatsApp con el +57 puesto de antemano.
//
// Antes era un campo de texto libre con "+57 300 000 0000" de marcador, y la
// duda más repetida era si había que escribir el indicativo o no. Ahora el +57
// es parte de la interfaz, no del dato que se pide: la persona escribe los diez
// dígitos y nada más. El campo no acepta letras ni más de diez números, así que
// el error se vuelve difícil de cometer en vez de fácil de corregir.
//
// El tope de diez lo pone `digitosWhatsapp`, no un maxLength en el campo: el
// navegador aplica maxLength antes de que el código vea nada, así que al pegar
// un número completo con indicativo cortaba la cadena a diez caracteres crudos
// —"+57 300 12"— y lo que quedaba era un número inventado.
import { digitosWhatsapp } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function CampoWhatsapp({
  id = "whatsapp",
  valor,
  alCambiar,
  alSalir,
  hayError = false,
}: {
  id?: string;
  valor: string;
  alCambiar: (valor: string) => void;
  alSalir?: () => void;
  hayError?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-12 items-center rounded-[0.5rem] border bg-transparent shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring",
        hayError ? "border-destructive" : "border-input",
      )}
    >
      <span className="select-none px-3 text-body text-muted-foreground">+57</span>
      <span className="h-6 w-px shrink-0 bg-border" />
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="3001234567"
        required
        value={valor}
        aria-invalid={hayError}
        onChange={(e) => alCambiar(digitosWhatsapp(e.target.value))}
        onBlur={alSalir}
        className="h-full min-w-0 flex-1 rounded-r-[0.5rem] bg-transparent px-3 text-body outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
