// Política de tratamiento de datos personales.
// El texto sale de 06-textos-legales.md, sección 3, palabra por palabra.
// Los datos del responsable los dio Juan el 25 de agosto de 2026.
import { createFileRoute } from "@tanstack/react-router";

import { Apartado, Lista, PaginaLegal } from "@/components/PaginaLegal";

export const Route = createFileRoute("/datos")({
  component: Datos,
  head: () => ({
    meta: [
      { title: "Tratamiento de datos — Vecinos de Cali" },
      {
        name: "description",
        content:
          "Qué datos recogemos, para qué los usamos, quién ve tu número de WhatsApp y cómo pedir que los borremos.",
      },
      { property: "og:title", content: "Tratamiento de datos — Vecinos de Cali" },
      { property: "og:type", content: "website" },
    ],
  }),
});

function Datos() {
  return (
    <PaginaLegal
      titulo="Política de tratamiento de datos personales"
      actualizado="25 de agosto de 2026"
    >
      <Apartado titulo="Responsable del tratamiento">
        <p>
          Juan Carlos Franco, persona natural, identificado con cédula de ciudadanía 16.931.005,
          domiciliado en Cali, Colombia. Correo de contacto:{" "}
          <a href="mailto:shipinflow@gmail.com" className="text-violet underline">
            shipinflow@gmail.com
          </a>
          .
        </p>
      </Apartado>

      <Apartado titulo="1. Qué datos recogemos">
        <Lista
          items={[
            "Nombre, correo electrónico y foto de perfil, que nos entrega Google cuando iniciás sesión, o el correo que registrás si entrás con enlace mágico.",
            "Número de celular con WhatsApp, que vos escribís.",
            "Barrio de Cali, que vos elegís.",
            "Un texto opcional sobre tu situación, si decidís escribirlo.",
            "Las fotos y descripciones de los artículos que publiques.",
            "Registros técnicos básicos de uso de la plataforma.",
          ]}
        />
        <p>
          No recogemos documento de identidad, dirección exacta, datos financieros ni datos
          sensibles.
        </p>
      </Apartado>

      <Apartado titulo="2. Para qué los usamos">
        <Lista
          items={[
            <>
              Para mostrar tu perfil a otros vecinos que hayan iniciado sesión: nombre, foto, nivel
              de confianza, historial de entregas y calificaciones, y tu barrio si publicás
              artículos. Tu perfil <strong className="text-foreground">no</strong> es visible para
              quien no tenga cuenta.
            </>,
            "Para permitir el contacto por WhatsApp entre dos vecinos cuando una solicitud es aceptada.",
            "Para enviarte avisos por correo sobre solicitudes recibidas y entregas pendientes de confirmar.",
            "Para moderar la plataforma y atender reportes.",
          ]}
        />
        <p className="font-medium text-foreground">
          No vendemos, alquilamos ni compartimos tus datos con terceros con fines comerciales o
          publicitarios. No hacemos perfilamiento publicitario.
        </p>
      </Apartado>

      <Apartado titulo="3. Quién ve tu número de WhatsApp">
        <p>
          Tu número <strong className="text-foreground">no aparece</strong> en tus publicaciones, en
          tu perfil, ni en ningún listado. Únicamente se le muestra a un vecino específico cuando
          una solicitud entre ustedes dos es aceptada, y solo para que puedan coordinar la entrega.
        </p>
      </Apartado>

      <Apartado titulo="4. Dónde se guardan">
        <p>
          En servidores de Supabase Inc. Esto implica una transferencia internacional de datos, que
          autorizás al aceptar esta política.
        </p>
      </Apartado>

      <Apartado titulo="5. Tus derechos">
        <p>Como titular de tus datos podés, en cualquier momento y gratis:</p>
        <Lista
          items={[
            "Conocer, actualizar y rectificar tus datos.",
            "Solicitar prueba de la autorización que otorgaste.",
            "Ser informado sobre el uso que se les ha dado.",
            "Presentar quejas ante la Superintendencia de Industria y Comercio.",
            "Revocar la autorización y solicitar la supresión de tus datos.",
          ]}
        />
        <p>
          Para ejercerlos, escribí a{" "}
          <a href="mailto:shipinflow@gmail.com" className="text-violet underline">
            shipinflow@gmail.com
          </a>
          . Respondemos consultas en máximo diez días hábiles y reclamos en máximo quince, conforme
          a la Ley 1581 de 2012.
        </p>
      </Apartado>

      <Apartado titulo="6. Eliminación de la cuenta">
        <p>
          Podés pedir que borremos tu cuenta y tus datos escribiendo a{" "}
          <a href="mailto:shipinflow@gmail.com" className="text-violet underline">
            shipinflow@gmail.com
          </a>
          . Al hacerlo se eliminan tu perfil, tu número y tus publicaciones activas. Las
          calificaciones que otros vecinos te dejaron pueden conservarse de forma anónima, porque
          son parte del historial de esas otras personas.
        </p>
      </Apartado>

      <Apartado titulo="7. Vigencia">
        <p>
          Los datos se conservan mientras la plataforma esté activa y tu cuenta exista. Vecinos de
          Cali es un proyecto de respuesta a la emergencia del terremoto de agosto de 2026. Si la
          plataforma se cierra, todos los datos personales se eliminarán y se avisará por correo con
          al menos quince días de anticipación.
        </p>
      </Apartado>

      <Apartado titulo="8. Cambios">
        <p>
          Cualquier cambio material a esta política se avisará por correo a las personas
          registradas.
        </p>
      </Apartado>
    </PaginaLegal>
  );
}
