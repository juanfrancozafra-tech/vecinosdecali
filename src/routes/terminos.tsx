// Términos de uso.
// El texto sale de 06-textos-legales.md, sección 4, palabra por palabra.
import { createFileRoute } from "@tanstack/react-router";

import { Apartado, Lista, PaginaLegal } from "@/components/PaginaLegal";

export const Route = createFileRoute("/terminos")({
  component: Terminos,
  head: () => ({
    meta: [
      { title: "Términos de uso — Vecinos de Cali" },
      {
        name: "description",
        content:
          "Qué es Vecinos de Cali, qué no es, tus responsabilidades y la seguridad en los encuentros entre vecinos.",
      },
      { property: "og:title", content: "Términos de uso — Vecinos de Cali" },
      { property: "og:type", content: "website" },
    ],
  }),
});

function Terminos() {
  return (
    <PaginaLegal titulo="Términos de uso" actualizado="25 de agosto de 2026">
      <Apartado titulo="1. Qué es esto">
        <p>
          Vecinos de Cali es una plataforma gratuita y sin ánimo de lucro que permite a personas de
          Cali publicar objetos que quieren regalar y ponerse en contacto con quienes los necesitan,
          a raíz del terremoto de agosto de 2026.
        </p>
      </Apartado>

      <Apartado titulo="2. Qué NO es">
        <p>
          <strong className="text-foreground">
            Vecinos de Cali es únicamente un punto de encuentro.
          </strong>{" "}
          No somos parte de ningún acuerdo entre vecinos. No verificamos la identidad de las
          personas más allá de su cuenta de correo. No inspeccionamos, almacenamos, transportamos ni
          entregamos ningún artículo. No verificamos el estado, el funcionamiento ni la seguridad de
          lo publicado. No verificamos la necesidad real de quien solicita.
        </p>
      </Apartado>

      <Apartado titulo="3. Tus responsabilidades">
        <p>Al usar la plataforma te comprometés a:</p>
        <Lista
          items={[
            "Dar información veraz sobre vos y sobre lo que publicás.",
            "Regalar únicamente cosas que te pertenezcan y que estén en el estado que describiste.",
            "No pedir ni ofrecer dinero, permutas, servicios ni contraprestación de ninguna clase.",
            "No publicar medicamentos, alimentos, armas, animales, ropa interior, artículos dañados ni nada ilegal.",
            "No usar los datos de otro vecino para nada distinto de coordinar una entrega.",
            "No usar la plataforma para acosar, estafar, hacer proselitismo, vender ni promocionar nada.",
            "Tratar a los demás vecinos con respeto.",
          ]}
        />
      </Apartado>

      <Apartado titulo="4. Seguridad en los encuentros">
        <p>
          Las entregas ocurren entre particulares, fuera de nuestro control y sin nuestra
          intervención. Recomendamos: acordar la entrega en la portería, la puerta o un lugar
          público, de día; no permitir el ingreso de desconocidos a la vivienda; avisarle a alguien
          de confianza; y suspender cualquier encuentro que genere desconfianza.
        </p>
        <p className="font-medium text-foreground">
          Vos asumís el riesgo de los encuentros que acordés.
        </p>
      </Apartado>

      <Apartado titulo="5. Limitación de responsabilidad">
        <p>
          En la máxima medida permitida por la ley colombiana, Juan Carlos Franco no responde por:
          daños, pérdidas, hurtos, lesiones o perjuicios de cualquier naturaleza derivados del
          contacto o del encuentro entre vecinos; el estado, funcionamiento, seguridad, procedencia
          o legalidad de los artículos; la veracidad de la información publicada por los usuarios;
          ni la conducta de los usuarios dentro o fuera de la plataforma.
        </p>
        <p>
          La plataforma se ofrece «como está», sin garantía de disponibilidad, continuidad ni
          ausencia de errores.
        </p>
      </Apartado>

      <Apartado titulo="6. Moderación">
        <p>
          Podemos retirar publicaciones y suspender cuentas que incumplan estos términos, sin aviso
          previo y a nuestro criterio. Los reportes se revisan tan pronto como sea posible, pero no
          garantizamos tiempos de respuesta.
        </p>
      </Apartado>

      <Apartado titulo="7. Contenido que publicás">
        <p>
          Las fotos y textos que subís siguen siendo tuyos. Nos autorizás a mostrarlos dentro de la
          plataforma mientras la publicación esté activa.
        </p>
      </Apartado>

      <Apartado titulo="8. Duración">
        <p>
          Este es un proyecto de emergencia. Puede cerrarse en cualquier momento. Si eso pasa, se
          avisará por correo con al menos quince días de anticipación.
        </p>
      </Apartado>

      <Apartado titulo="9. Ley aplicable">
        <p>
          Estos términos se rigen por la ley colombiana. Cualquier controversia se someterá a los
          jueces competentes de Cali, Valle del Cauca.
        </p>
      </Apartado>

      <Apartado titulo="10. Contacto">
        <p>
          <a href="mailto:hola@vecinosdecali.com" className="text-violet underline">
            hola@vecinosdecali.com
          </a>
        </p>
      </Apartado>
    </PaginaLegal>
  );
}
