# Vecinos de Cali

**Cosas que sobran en una casa, para la casa que las necesita.**

👉 **[vecinosdecali.com](https://vecinosdecali.com)**

Vecinos de Cali conecta a quienes tienen algo para regalar —ropa, muebles,
electrodomésticos, útiles, cosas de bebé— con vecinos de la ciudad que lo
necesitan. Sin dinero de por medio, sin intermediarios: una persona publica,
otra pide, y se encuentran.

---

## Cómo funciona

1. **Quien regala publica** una foto, qué es y en qué sector de Cali está.
2. **Quien necesita pide** desde el catálogo, sin tener que conocer a nadie.
3. **Quien regala elige** a quién dárselo. Recién ahí se abre la conversación
   por WhatsApp para acordar la entrega.
4. **Se entrega y se califica.** Los dos lados suben de nivel, y eso le da
   confianza al siguiente vecino.

Hay dos tipos de cuenta: **«Quiero regalar algo»** y **«Necesito algo»**. El
catálogo se puede ver sin cuenta.

### Seguridad y privacidad

- Nadie ve el número de WhatsApp de otra persona hasta que el donante acepta
  una solicitud.
- Quien pide nunca escribe primero.
- En las publicaciones se muestra el sector, nunca la dirección.
- Las reservas que no se concretan se liberan solas a las 48 horas.
- Cualquier vecino puede reportar una publicación o una persona; los reportes
  pasan por moderación.

---

## Stack

| Pieza | Herramienta |
| --- | --- |
| Aplicación | React + TanStack Start (SSR), Tailwind CSS, shadcn/ui |
| Base de datos, autenticación y fotos | Supabase (Postgres con RLS, pg_cron, pg_net, Vault) |
| Hosting | Cloudflare Workers |
| Dominio y correo entrante | Cloudflare Registrar + Email Routing |
| Correo saliente | Resend, desde `hola@vecinosdecali.com` |
| Acceso | Google y enlace mágico por correo (sin contraseñas) |

La primera versión se generó con [Lovable](https://lovable.dev), que sigue
sincronizado con este repositorio como editor.

---

## Desarrollo

```bash
bun install
bun run dev     # servidor local
bun run build   # compilación de producción
```

### Variables de entorno

La app necesita cuatro variables `VITE_`: la conexión a Supabase (URL, clave
pública e identificador del proyecto) y `VITE_SITIO_URL`, la dirección pública
del sitio, que se usa para armar los enlaces y las vistas previas al compartir
por WhatsApp.

> **Importante:** las variables `VITE_` se incrustan **al compilar**. Cambiar
> una en Cloudflare no tiene efecto hasta que se dispara una compilación nueva
> (un push o «Retry build»).

### Despliegue

Cada push a `main` compila y publica solo en Cloudflare Workers. Las ramas
también se compilan, así que un PR roto se detecta antes de mergear.

**Mergear es desplegar.** Si algo sale mal, Cloudflare guarda las versiones
anteriores y se puede volver atrás desde el panel del Worker.

### Base de datos

La lógica sensible vive en Postgres, no en el cliente: aceptar, rechazar y
retirar se hacen con funciones de la base, y las políticas de RLS impiden que
un vecino modifique datos que no son suyos (incluido su propio puntaje).

Tareas programadas con pg_cron:

- `liberar-reservas` — cada hora, libera las reservas vencidas.
- `avisar-solicitudes` — cada hora, avisa por correo a los donantes que tienen
  solicitudes sin responder (máximo uno cada 12 horas por persona).

Regla para nuevos triggers: si escribe en una tabla o columna que el vecino no
puede escribir por su cuenta, necesita `security definer`.

### Sistema de diseño

Los tamaños de letra son tokens propios (`display`, `title`, `screen`, `lead`,
`topbar`, `body`, `request`, `suave`, `tarjeta`, `chip`, `small`), con un piso
de 14 px. Al agregar uno nuevo:

- Verificar que no exista un **color** con el mismo nombre, o Tailwind aplica
  el color y descarta el tamaño en silencio.
- Declararlo también en `cn()` (`src/lib/utils.ts`), o `tailwind-merge` lo
  elimina.

---

## Contacto

Juan Carlos Franco · [hola@vecinosdecali.com](mailto:hola@vecinosdecali.com)
