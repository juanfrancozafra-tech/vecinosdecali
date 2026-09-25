import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Camera,
  Users,
  MessageCircle,
  MapPin,
  FileText,
  Bell,
  Shield,
  UserCheck,
  Award,
  Flag,
  EyeOff,
  Check,
  X,
  ImageOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { empezarARegalar } from "@/components/FranjaSuperior";
import { guardarRolElegido, useAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { urlAbsoluta } from "@/lib/sitio";
import { fotoTransformada } from "@/lib/imagenes";
import type { ArticuloPublico, Categoria, CondicionArticulo } from "@/lib/database.types";

const ETIQUETA_CONDICION: Record<CondicionArticulo, string> = {
  nuevo: "Nuevo",
  como_nuevo: "Como nuevo",
  buen_estado: "Buen estado",
  usado_con_detalles: "Usado con detalles",
};

// Anchos del prototipo: 640 en móvil, 760 desde 600px, 1040 desde 960px.
const CONT = "mx-auto w-full max-w-[640px] px-4 sm:max-w-[760px] lg:max-w-[1040px] lg:px-8";
// Las secciones de lectura seguida se mantienen angostas a propósito.
const CONT_ANGOSTO = "mx-auto w-full max-w-[640px] px-4 sm:max-w-[760px] lg:max-w-[800px] lg:px-8";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => {
    const imagen = urlAbsoluta("/og-image.jpg");
    return {
      meta: [
        { title: "Vecinos de Cali" },
        { name: "description", content: "Lo que a vos te sobra, a un vecino le cambia el día." },
        { property: "og:title", content: "Vecinos de Cali" },
        {
          property: "og:description",
          content: "Lo que a vos te sobra, a un vecino le cambia el día.",
        },
        { property: "og:image", content: imagen },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Vecinos de Cali" },
        {
          name: "twitter:description",
          content: "Lo que a vos te sobra, a un vecino le cambia el día.",
        },
        { name: "twitter:image", content: imagen },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
      ],
    };
  },
});

const pasosRegalar = [
  {
    icon: Camera,
    title: "Tomale una foto",
    text: "Un mueble, ropa, ollas, una nevera. Lo que ya no usás y a alguien le sirve.",
  },
  {
    icon: Users,
    title: "Elegí a quién",
    text: "Te llegan hasta cinco solicitudes. Vos ves quién es cada uno y decidís.",
  },
  {
    icon: MessageCircle,
    title: "Escribile y entregalo",
    text: "Vos elegís y vos le escribís por WhatsApp. Acuerdan dónde y cuándo, y después confirmás la entrega.",
  },
];

const pasosRecibir = [
  {
    icon: MapPin,
    title: "Mirá el catálogo",
    text: "Filtrá por barrio y por categoría. No necesitás cuenta para ver.",
  },
  {
    icon: FileText,
    title: "Solicitá lo que te sirve",
    text: "Contás una vez tu situación y ya.",
  },
  {
    icon: Bell,
    title: "Esperá y recogelo",
    text: "Si te elige, esa persona te escribe por WhatsApp.",
  },
];

// Son cinco, no cuatro, y cada una tiene título propio. Lovable las había
// fundido en frases corridas sin titular y se había saltado entera "sin cuenta
// no se ve a nadie", que es justamente la que explica por qué el catálogo es
// público pero las personas no.
const proteccionItems = [
  {
    icon: Shield,
    title: "Nunca publicamos tu dirección ni tu teléfono",
    text: "Nadie puede escribirte porque sí. Quien regala elige a una persona y le escribe por WhatsApp; ahí, y solo ahí, se abre el contacto.",
  },
  {
    icon: EyeOff,
    title: "Sin cuenta no se ve a nadie",
    text: "Cualquiera puede mirar el catálogo, pero para ver quién regala cada cosa hay que iniciar sesión. Nadie puede navegar de forma anónima haciendo una lista de casas.",
  },
  {
    icon: UserCheck,
    title: "Vos elegís a quién le das",
    text: "Ves quién es cada persona que solicita: hace cuánto está en la app, cuántas cosas ha recibido, qué dicen otros vecinos de ella.",
  },
  {
    icon: Award,
    title: "La confianza se gana en la vida real",
    text: "Un vecino sube de nivel cuando otro vecino confirma que se vieron y se entregaron algo. No se compra ni se declara.",
  },
  {
    icon: Flag,
    title: "Si algo se sale de lugar, avisanos",
    text: "Cada publicación y cada perfil tiene un botón para reportar. Lo revisamos.",
  },
];

// Las catorce preguntas y sus respuestas salen de 05-landing-page.md, en el
// mismo orden que landing.html. La decimoquinta, "¿Quién está detrás de esto?",
// se arma aparte al final del acordeón porque lleva foto y nombre adentro.
const faqs = [
  {
    question: "¿Esto es gratis?",
    answer:
      "Sí, todo. Nadie cobra nada y la app tampoco cobra. Si alguien te pide plata, reportalo.",
  },
  {
    question: "¿Quién puede pedir?",
    answer:
      "Cualquier vecino de Cali que lo necesite. No pedimos certificados ni papeles: la Alcaldía hace su censo aparte y esa información no es pública. Acá quien da es quien decide, con la información que ve del perfil.",
  },
  {
    question: "¿Y si alguien pide sin necesitarlo?",
    answer:
      "Puede pasar, y no te lo vamos a negar. Por eso el vecino que da ve todo el historial de quien pide —cuántas cosas ha recibido, hace cuánto entró, qué dicen otros— y elige. Además nadie puede tener dos solicitudes activas de la misma categoría.",
  },
  {
    question: "¿Puedo regalar y pedir cosas con la misma cuenta?",
    answer:
      "No. Al entrar elegís si venís a regalar o a recibir, y la cuenta queda de ese lado. Es a propósito: mantiene los dos flujos simples y claros. Si te equivocaste o cambió tu situación, podés cambiarlo en Mi cuenta.",
  },
  {
    question: "¿Necesito cuenta para mirar?",
    answer:
      "No para ver el catálogo. Sí para ver quién regala cada cosa y para solicitar. Protegemos así a los vecinos que están regalando: nadie puede navegar de forma anónima anotando qué hay y en qué barrio.",
  },
  {
    question: "¿Quién escribe primero?",
    answer:
      "Siempre quien regala. Cuando elige a una persona de las que le solicitaron, la app le abre WhatsApp hacia ella con un mensaje ya escrito. Quien recibe no puede escribirle a nadie: solo espera a que lo elijan. Así nadie recibe mensajes de desconocidos.",
  },
  {
    question: "¿Mi número queda público?",
    answer:
      "No. Nunca aparece en tus publicaciones ni en tu perfil ni en ningún listado. Solo se le muestra a la otra persona en el momento en que quien regala elige a quién entregarle y le abre la conversación de WhatsApp.",
  },
  {
    question: "¿Quién lleva las cosas?",
    answer:
      "Quien recibe va y recoge. La app no transporta nada. Si es algo grande, ponelo en la descripción para que el vecino llegue preparado.",
  },
  {
    question: "¿Y si acepto a alguien y no aparece?",
    answer:
      "A las 48 horas tu artículo vuelve solo al catálogo y las otras solicitudes se reabren. No tenés que hacer nada.",
  },
  {
    question: "Acepté a uno pero terminé dándoselo a otro. ¿Qué hago?",
    answer:
      "Al confirmar la entrega la app te pregunta a quién se lo diste, y ahí elegís de la lista. También podés decir que se lo diste a alguien que no está en la app.",
  },
  {
    question: "¿Puedo darle varias cosas a la misma persona?",
    answer:
      "Sí, y es lo ideal. Cuando aceptás a alguien, la app le muestra las otras cosas que tenés publicadas para que se lleve todo en un solo viaje.",
  },
  {
    question: "¿Qué datos guardan de mí?",
    answer:
      "Tu nombre, tu foto y tu correo de Google, y tu número de WhatsApp. Si vas a regalar cosas, también tu barrio, para que un vecino sepa si le queda cerca. Si venís a recibir, no te pedimos dónde vivís. Nada más. No los vendemos, no los compartimos, no los usamos para publicidad. Podés pedir que los borremos cuando quieras escribiendo a hola@vecinosdecali.com. Detalles en la política de tratamiento de datos.",
  },
  {
    question: "¿Quién responde si algo sale mal?",
    answer:
      "Vecinos de Cali conecta vecinos, no participa en la entrega ni responde por el estado de los artículos ni por lo que ocurra entre las personas. Usá el sentido común y los consejos de seguridad.",
  },
  {
    question: "¿Esto va a seguir después de la emergencia?",
    answer: "Nació por el terremoto. Si sigue sirviendo, seguirá.",
  },
];

const siRules = [
  "Muebles",
  "Camas",
  "Electrodomésticos que funcionen",
  "Ropa y calzado en buen estado",
  "Ollas y cosas de cocina",
  "Juguetes y útiles escolares",
  "Herramientas y cosas de aseo",
];

const noRules = [
  "Nada con precio, ni ventas ni permutas ni “una colaboración”",
  "Dinero, arriendos, empleos ni servicios",
  "Medicamentos ni alimentos",
  "Ropa interior",
  "Cosas dañadas o que no sirvan",
];

function StepCard({
  icon: Icon,
  title,
  text,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  index: number;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-violet">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-body font-semibold text-foreground">
          {index}. {title}
        </h4>
        <p className="mt-1 text-body text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function ProtectionCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  text: string;
}) {
  return (
    <div className="mb-[22px] flex gap-[13px] last:mb-0">
      <Icon className="mt-0.5 h-7 w-7 shrink-0 text-violet" strokeWidth={1.5} />
      <div>
        <h3 className="text-body font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-suave leading-[1.5] text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function useScrolledPastHero() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0.05, rootMargin: "0px" },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return visible;
}

function Index() {
  const showFixedBar = useScrolledPastHero();
  const navigate = useNavigate();
  const { usuario, perfilCompleto } = useAuth();

  // Quien viene a regalar sí necesita cuenta antes de nada: no se puede
  // publicar sin barrio ni sin WhatsApp. Termina en /publicar, que es lo que
  // en realidad quería hacer.
  function empezarADar() {
    empezarARegalar();
    if (!usuario) {
      navigate({ to: "/entrar" });
      return;
    }
    navigate({ to: perfilCompleto ? "/publicar" : "/completar-perfil" });
  }

  // Quien viene a recibir va derecho al catálogo. Crear una cuenta antes de
  // ver si hay algo que le sirva es fricción puesta en el peor momento: la
  // cuenta tiene sentido cuando ya encontró algo y quiere pedirlo.
  function empezarARecibir() {
    guardarRolElegido("recibo");
    navigate({ to: "/articulos" });
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* SECCIÓN 1 — Hero.
          Alineado a la izquierda y con la promesa como título, siguiendo
          landing.html. El violeta cubre la sección entera: antes se cortaba a
          dos tercios y la costura pasaba por la mitad de los botones. */}
      <header
        id="hero"
        className="border-b border-violet-border bg-violet-light py-14 sm:py-[68px] lg:py-[76px]"
      >
        <div className={CONT}>
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-14">
            <h1 className="text-[36px] font-semibold leading-[1.18] tracking-[-0.02em] text-violet-dark sm:text-[42px] lg:col-start-1 lg:row-start-1 lg:text-[48px]">
              Lo que a vos te sobra,
              <br />a un vecino le cambia el día.
            </h1>

            <p className="mb-5 mt-2.5 max-w-[42ch] text-body text-muted-foreground lg:col-start-1 lg:row-start-2">
              Después del terremoto, muchas familias salieron de sus casas sin poder llevarse nada.
              Acá los vecinos que tienen algo para regalar se encuentran con los vecinos que lo
              necesitan.
            </p>

            <img
              src="/hero.png"
              width={800}
              height={632}
              fetchPriority="high"
              decoding="async"
              alt="Dos vecinos de pie, de frente y a la misma altura, sostienen juntos una caja con una manta, una olla y una lámpara. A su alrededor hay una olla, una silla y dos cajas."
              className="mx-auto mb-6 block aspect-[800/632] w-full sm:max-w-[480px] lg:col-start-2 lg:row-start-1 lg:row-end-5 lg:m-0 lg:max-w-[400px] lg:self-center"
            />

            <div className="flex flex-col gap-2.5 sm:flex-row lg:col-start-1 lg:row-start-3">
              <Button
                onClick={empezarADar}
                className="w-full bg-violet text-white hover:bg-violet-deep sm:max-w-[280px]"
              >
                Quiero regalar algo
              </Button>
              <Button
                variant="outline"
                onClick={empezarARecibir}
                className="w-full border-border bg-white text-foreground hover:bg-neutral-bg sm:max-w-[280px]"
              >
                Necesito algo
              </Button>
            </div>

            <p className="mt-3.5 text-center text-small text-violet-deep sm:text-left lg:col-start-1 lg:row-start-4">
              Gratis siempre. Acá nada tiene precio.
            </p>
          </div>
        </div>
      </header>

      {/* SECCIÓN 2 — Vista previa del catálogo.
          Va antes de "Cómo funciona" a propósito: la mayoría llega por un
          enlace de WhatsApp y viene a ver si hay algo que le sirva, no a que
          le expliquen el trato. */}
      <VistaPreviaCatalogo />

      {/* SECCIÓN 3 — Cómo funciona */}
      <section id="como" className="bg-neutral-bg py-16">
        <div className={CONT}>
          <h2 className="text-title font-semibold tracking-[-0.01em] text-foreground">
            Cómo funciona
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* Regalar */}
            <div className="rounded-2xl border border-violet-border bg-violet-light p-6">
              <h3 className="text-[1.3125rem] font-semibold text-violet-dark">
                Si tenés algo para regalar
              </h3>
              <div className="mt-6 space-y-6">
                {pasosRegalar.map((paso, i) => (
                  <StepCard key={paso.title} {...paso} index={i + 1} />
                ))}
              </div>
            </div>

            {/* Recibir */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-[1.3125rem] font-semibold text-foreground">Si necesitás algo</h3>
              <div className="mt-6 space-y-6">
                {pasosRecibir.map((paso, i) => (
                  <StepCard key={paso.title} {...paso} index={i + 1} />
                ))}
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-small text-muted-foreground">
            Quien regala es SIEMPRE quien escribe primero. Quien recibe nunca puede iniciar el
            contacto.
          </p>
        </div>
      </section>

      {/* SECCIÓN 3 — Cómo cuidamos a los dos lados.
          Lista vertical, no rejilla de cuatro columnas: metidas en la medida
          angosta que pide el prototipo, cuatro columnas dejaban renglones de
          dos palabras. */}
      <section id="seguridad" className="border-y border-border bg-white py-16">
        <div className={CONT_ANGOSTO}>
          <h2 className="mb-[22px] text-title font-semibold tracking-[-0.01em] text-foreground">
            Cómo cuidamos a los dos lados
          </h2>
          <div>
            {proteccionItems.map((item) => (
              <ProtectionCard key={item.title} {...item} />
            ))}
          </div>
          <div className="mt-[26px] rounded-xl bg-violet-light p-5 text-violet-dark">
            <p className="text-topbar font-semibold">Un consejo de vecino</p>
            <p className="mt-1 text-suave leading-[1.55]">
              Entregá y recibí en la portería o en la puerta, de día. No dejés entrar a desconocidos
              a tu casa. Si algo te da mala espina, no lo hagás.
            </p>
          </div>
        </div>
      </section>

      {/* SECCIÓN 4 — Las reglas son cortas */}
      <section id="reglas" className="bg-neutral-bg py-16">
        <div className={CONT}>
          <h2 className="text-title font-semibold tracking-[-0.01em] text-foreground">
            Las reglas son cortas
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl bg-si-bg p-[22px] text-si-fg lg:p-6">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 shrink-0" strokeWidth={2} />
                <h3 className="text-lead font-semibold">Sí</h3>
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-body">
                {siRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-no-bg p-[22px] text-no-fg lg:p-6">
              <div className="flex items-center gap-2">
                <X className="h-5 w-5 shrink-0" strokeWidth={2} />
                <h3 className="text-lead font-semibold">No</h3>
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-body">
                {noRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-center text-body text-muted-foreground">
            Si algo está usado pero sirve, contá en la descripción cómo está y dejá que el vecino
            decida.
          </p>
        </div>
      </section>

      {/* SECCIÓN 5 — Preguntas frecuentes.
          "Quién está detrás" ya no es sección propia: es la última pregunta del
          acordeón, con la foto y el nombre adentro. */}
      <section id="preguntas" className="border-y border-border bg-white py-16">
        <div className={CONT_ANGOSTO}>
          <h2 className="text-title font-semibold tracking-[-0.01em] text-foreground">
            Preguntas frecuentes
          </h2>
          <Accordion
            type="single"
            collapsible
            className="mt-6 rounded-xl border border-border bg-card px-5"
          >
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b last:border-b-0"
              >
                <AccordionTrigger className="text-left text-body font-medium text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-body text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}

            <AccordionItem value="quien-esta-detras" className="border-b last:border-b-0">
              <AccordionTrigger className="text-left text-body font-medium text-foreground hover:no-underline">
                ¿Quién está detrás de esto?
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-light text-body font-semibold text-violet"
                    aria-hidden="true"
                  >
                    JC
                  </div>
                  <div>
                    <p className="text-body font-semibold text-foreground">Juan Carlos Franco</p>
                    <p className="mt-1 text-body text-muted-foreground">
                      Soy caleño. Después del terremoto vi que en mi casa había cosas que a alguien
                      le podían servir hoy mismo, y que no tenía cómo hacerlas llegar. Hice esta
                      página en unos días para resolver eso, para mí y para cualquiera que esté
                      igual.
                    </p>
                    <p className="mt-3 text-body text-muted-foreground">
                      Esto no es una empresa ni una fundación: es un vecino con una página. Si algo
                      no funciona o tenés una idea, escribime a{" "}
                      <a href="mailto:hola@vecinosdecali.com" className="text-violet hover:underline">
                        hola@vecinosdecali.com
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Pie. El nombre propio queda visible acá a propósito: al meter "quién
          está detrás" en un acordeón se pierde esa señal de confianza. */}
      <footer className="border-t border-border bg-background py-10">
        <div
          className={`${CONT} flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left`}
        >
          <div className="flex flex-wrap items-center justify-center gap-4 text-small text-muted-foreground">
            <a href="#reglas" className="hover:text-foreground">
              Reglas
            </a>
            <a href="#preguntas" className="hover:text-foreground">
              Preguntas frecuentes
            </a>
            <Link
              to="/datos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Tratamiento de datos
            </Link>
            <Link
              to="/terminos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Términos
            </Link>
          </div>
          <div className="text-small text-muted-foreground">
            <p>
              Hecho por Juan Carlos Franco ·{" "}
              <a href="mailto:hola@vecinosdecali.com" className="hover:text-foreground">
                hola@vecinosdecali.com
              </a>
            </p>
            <p className="mt-1">Hecho en Cali, para Cali.</p>
          </div>
        </div>
      </footer>

      {/* Barra fija abajo */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white px-5 py-4 transition-transform duration-300 ease-out sm:px-6 ${
          showFixedBar ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-3xl justify-center gap-3">
          <Button
            onClick={empezarADar}
            className="flex-1 bg-violet text-white hover:bg-violet-deep sm:max-w-[260px]"
          >
            Quiero regalar algo
          </Button>
          <Button
            variant="outline"
            onClick={empezarARecibir}
            className="flex-1 border-border bg-white text-foreground hover:bg-neutral-bg sm:max-w-[260px]"
          >
            Necesito algo
          </Button>
        </div>
      </div>
    </div>
  );
}

const CUANTOS = 8;

/**
 * Vista previa del catálogo en la landing.
 *
 * Muestra solo datos del artículo: foto, título, barrio y condición. Nunca
 * quién lo regala. El catálogo es público justamente para que un enlace
 * compartido por WhatsApp abra y funcione; las personas detrás, no.
 */
function VistaPreviaCatalogo() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [items, setItems] = useState<ArticuloPublico[] | null>(null);

  useEffect(() => {
    let activo = true;
    db.from("categorias")
      .select("*")
      .order("orden", { ascending: true })
      .then(({ data }) => {
        if (activo && data) setCategorias(data as Categoria[]);
      });
    db.from("articulos_publicos")
      .select("*")
      .eq("estado", "disponible")
      .order("creado_en", { ascending: false })
      .limit(CUANTOS)
      .then(({ data }) => {
        if (activo) setItems((data ?? []) as ArticuloPublico[]);
      });
    return () => {
      activo = false;
    };
  }, []);

  const vacio = items !== null && items.length === 0;

  return (
    <section id="catalogo" className="bg-neutral-bg py-16">
      <div className={CONT}>
        <h2 className="mb-[18px] text-title font-semibold tracking-[-0.01em] text-foreground">
          Mirá lo que hay ahora
        </h2>

        {/* Los chips saltan al catálogo con el filtro ya puesto. Se quedan
            también cuando no hay nada publicado: son la forma más rápida de
            llegar al catálogo, y eso no depende de que hoy haya cosas. */}
        <div className="-mx-4 mb-4 flex gap-[7px] overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:-mx-8 lg:px-8">
          <Chip to="/articulos" activo>
            Todo
          </Chip>
          {categorias.map((c) => (
            <Chip key={c.id} to="/articulos" search={{ categoria: c.slug }}>
              {c.nombre}
            </Chip>
          ))}
        </div>

        {items === null ? (
          <Rejilla>
            {Array.from({ length: CUANTOS }).map((_, i) => (
              <Skeleton
                key={i}
                className={`aspect-square w-full rounded-xl ${i > 3 ? "hidden sm:block" : ""}`}
              />
            ))}
          </Rejilla>
        ) : vacio ? (
          <div className="rounded-xl border border-border bg-card px-5 py-7 text-center">
            <p className="text-suave text-muted-foreground">
              Todavía no hay nada publicado. Volvé en un rato, que los vecinos están subiendo sus
              cosas.
            </p>
            <p className="mt-3 text-suave text-muted-foreground">
              ¿Vos tenés algo para regalar?{" "}
              <Link to="/entrar" onClick={empezarARegalar} className="text-violet underline">
                Empezá acá
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <Rejilla>
              {items.map((a, i) => (
                <TarjetaPrevia key={a.id} articulo={a} oculta={i > 3} />
              ))}
            </Rejilla>
            <div className="mt-[18px]">
              <Button asChild className="mx-auto flex w-full max-w-[320px]">
                <Link to="/articulos">Ver todo el catálogo</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Rejilla({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>;
}

function Chip({
  to,
  search,
  activo = false,
  children,
}: {
  to: string;
  search?: { categoria: string };
  activo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      search={search ?? {}}
      className={`shrink-0 rounded-full border px-3.5 py-2 text-chip transition-colors ${
        activo
          ? "border-violet bg-violet text-white"
          : "border-border bg-white text-foreground hover:border-[#d6d3d1]"
      }`}
    >
      {children}
    </Link>
  );
}

/** Ocho tarjetas en móvil son cuatro filas antes de "Cómo funciona". Se
 *  muestran cuatro, y el resto aparece cuando hay ancho para dos filas. */
function TarjetaPrevia({ articulo, oculta }: { articulo: ArticuloPublico; oculta: boolean }) {
  const foto = fotoTransformada(articulo.foto_portada, 400);
  return (
    <Link
      to="/articulos/$id"
      params={{ id: articulo.id }}
      className={`group block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-[#d6d3d1] ${
        oculta ? "hidden sm:block" : ""
      }`}
    >
      <div className="flex aspect-square w-full items-center justify-center bg-violet-light text-violet-mid">
        {foto ? (
          <img src={foto} alt={articulo.titulo} loading="lazy" className="size-full object-cover" />
        ) : (
          <ImageOff className="size-7" />
        )}
      </div>
      <div className="px-2.5 pb-[11px] pt-[9px]">
        <h3 className="line-clamp-2 text-tarjeta font-medium leading-[1.32] text-foreground">
          {articulo.titulo}
        </h3>
        <p className="mt-1 text-small leading-[1.35] text-muted-foreground">
          {articulo.barrio}
          <br />
          {ETIQUETA_CONDICION[articulo.condicion]}
        </p>
      </div>
    </Link>
  );
}
