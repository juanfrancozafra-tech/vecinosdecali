import { createFileRoute } from "@tanstack/react-router";
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
  Check,
  X,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const OG_IMAGE_URL = "/og-image.jpg";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Vecinos de Cali" },
      { name: "description", content: "Lo que a vos te sobra, a un vecino le cambia el día." },
      { property: "og:title", content: "Vecinos de Cali" },
      { property: "og:description", content: "Lo que a vos te sobra, a un vecino le cambia el día." },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Vecinos de Cali" },
      { name: "twitter:description", content: "Lo que a vos te sobra, a un vecino le cambia el día." },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
  }),
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
    title: "Buscá por barrio",
    text: "Mirá lo que hay cerca. No necesitás cuenta para ver.",
  },
  {
    icon: FileText,
    title: "Solicitá lo que te sirve",
    text: "Contás una vez tu situación y ya.",
  },
  {
    icon: Bell,
    title: "Esperá y recogelo",
    text: "Si te elige, esa persona te escribe por WhatsApp. Vos no tenés que buscar a nadie.",
  },
];

const proteccionItems = [
  {
    icon: Shield,
    text: "Nunca publicamos tu dirección ni tu teléfono. Nadie puede escribirte porque sí: quien regala elige a una persona y le escribe por WhatsApp; ahí, y solo ahí, se abre el contacto.",
  },
  {
    icon: UserCheck,
    text: "Vos elegís a quién le das. Ves hace cuánto está cada persona en la app, cuántas cosas ha recibido y qué dicen otros vecinos.",
  },
  {
    icon: Award,
    text: "La confianza se gana en la vida real. Se sube de nivel cuando otro vecino confirma que se vieron y se entregaron algo.",
  },
  {
    icon: Flag,
    text: "Si algo se sale de lugar, avisanos. Cada publicación tiene botón de reportar.",
  },
];

const faqs = [
  { question: "¿Necesito cuenta para ver lo que publican?", answer: "Placeholder" },
  { question: "¿Quién puede publicar cosas para regalar?", answer: "Placeholder" },
  { question: "¿Cómo se elige a quién le doy algo?", answer: "Placeholder" },
  { question: "¿Quién escribe primero por WhatsApp?", answer: "Placeholder" },
  { question: "¿Qué pasa si no me contestan?", answer: "Placeholder" },
  { question: "¿Puedo pedir más de una cosa a la vez?", answer: "Placeholder" },
  { question: "¿Cómo se que la persona de verdad existe?", answer: "Placeholder" },
  { question: "¿Se puede regalar dinero o comida?", answer: "Placeholder" },
  { question: "¿Qué hago si una publicación me parece rara?", answer: "Placeholder" },
  { question: "¿La app se queda con algo?", answer: "Placeholder" },
];

const siRules = [
  "muebles",
  "camas",
  "electrodomésticos que funcionen",
  "ropa y calzado en buen estado",
  "ollas y cosas de cocina",
  "juguetes y útiles escolares",
  "herramientas y cosas de aseo",
];

const noRules = [
  "nada con precio, ni ventas ni permutas ni “una colaboración”",
  "dinero, arriendos, empleos ni servicios",
  "medicamentos ni alimentos",
  "ropa interior",
  "cosas dañadas o que no sirvan",
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
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-light text-violet">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-body text-foreground">{text}</p>
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

  return (
    <div className="relative min-h-screen bg-background">
      {/* SECCIÓN 1 — Hero */}
      <section
        id="hero"
        className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-neutral-bg px-5 py-10"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-violet-light" />
        <div className="relative z-10 mx-auto w-full max-w-3xl text-center">
          <h1 className="text-display font-semibold tracking-tight text-violet-dark">
            Vecinos de Cali
          </h1>
          <p className="mt-5 text-lead font-medium text-foreground">
            Lo que a vos te sobra, a un vecino le cambia el día.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-body text-muted-foreground">
            Después del terremoto, muchas familias salieron de sus casas sin poder llevarse nada. Acá los
            vecinos que tienen algo para regalar se encuentran con los vecinos que lo necesitan.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-xl bg-violet px-6 text-base font-medium text-white hover:bg-violet/90 sm:w-auto"
            >
              <a href="/publicar">Quiero regalar algo</a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-xl border-violet-border bg-white px-6 text-base font-medium text-violet-dark hover:bg-violet-light sm:w-auto"
            >
              <a href="/articulos">Necesito algo</a>
            </Button>
          </div>
          <p className="mt-4 text-small text-muted-foreground">Gratis siempre. Acá nada tiene precio.</p>
        </div>
      </section>

      {/* SECCIÓN 2 — Cómo funciona */}
      <section className="bg-white px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-title font-semibold text-foreground">Cómo funciona</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* Regalar */}
            <div className="rounded-2xl border border-violet-border bg-violet-light p-6">
              <h3 className="text-[1.3125rem] font-semibold text-violet-dark">Si tenés algo para regalar</h3>
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
            Quien regala es SIEMPRE quien escribe primero. Quien recibe nunca puede iniciar el contacto.
          </p>
        </div>
      </section>

      {/* SECCIÓN 3 — Cómo cuidamos a los dos lados */}
      <section className="bg-neutral-bg px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-title font-semibold text-foreground">Cómo cuidamos a los dos lados</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {proteccionItems.map((item) => (
              <ProtectionCard key={item.text.slice(0, 40)} {...item} />
            ))}
          </div>
          <div className="mt-8 rounded-2xl bg-violet-light p-5 text-violet-dark">
            <p className="font-semibold">Un consejo de vecino</p>
            <p className="mt-1 text-body">
              Entregá y recibí en la portería o en la puerta, de día. No dejés entrar a desconocidos a tu
              casa. Si algo te da mala espina, no lo hagás.
            </p>
          </div>
        </div>
      </section>

      {/* SECCIÓN 4 — Las reglas son cortas */}
      <section id="reglas" className="bg-white px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-title font-semibold text-foreground">Las reglas son cortas</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet text-white">
                  <Check className="h-4 w-4" />
                </div>
                <h3 className="text-lead font-semibold text-foreground">Sí</h3>
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-body text-muted-foreground">
                {siRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <X className="h-4 w-4" />
                </div>
                <h3 className="text-lead font-semibold text-foreground">No</h3>
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-body text-muted-foreground">
                {noRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-center text-body text-muted-foreground">
            Si algo está usado pero sirve, contá en la descripción cómo está y dejá que el vecino decida.
          </p>
        </div>
      </section>

      {/* SECCIÓN 5 — Preguntas frecuentes */}
      <section id="preguntas" className="bg-neutral-bg px-5 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-title font-semibold text-foreground">Preguntas frecuentes</h2>
          <Accordion type="single" collapsible className="mt-8 rounded-2xl border border-border bg-card px-5">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b last:border-b-0">
                <AccordionTrigger className="text-left text-body font-medium text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-body text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* SECCIÓN 6 — Quién está detrás */}
      <section className="bg-white px-5 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-title font-semibold text-foreground">Quién está detrás</h2>
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-violet-light text-violet">
              <User className="h-10 w-10" />
            </div>
            <p className="text-lead font-semibold text-foreground">Marcador de posición</p>
            <p className="max-w-lg text-body text-muted-foreground">
              Acá va el nombre y una breve historia de quienes armamos Vecinos de Cali. Texto de marcador de
              posición.
            </p>
          </div>
        </div>
      </section>

      {/* Pie */}
      <footer className="border-t border-border bg-background px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-4 text-small text-muted-foreground">
            <a href="#reglas" className="hover:text-foreground">
              Reglas
            </a>
            <a href="#preguntas" className="hover:text-foreground">
              Preguntas frecuentes
            </a>
            <a href="#datos" className="hover:text-foreground">
              Tratamiento de datos
            </a>
            <a href="#terminos" className="hover:text-foreground">
              Términos
            </a>
          </div>
          <div className="text-small text-muted-foreground">
            <p>
              <a href="mailto:hola@vecinosdecali.org" className="hover:text-foreground">
                hola@vecinosdecali.org
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
        <div className="mx-auto flex max-w-3xl gap-3">
          <Button
            asChild
            className="h-12 flex-1 rounded-xl bg-violet text-base font-medium text-white hover:bg-violet/90"
          >
            <a href="/publicar">Quiero regalar algo</a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 flex-1 rounded-xl border-violet-border bg-white text-base font-medium text-violet-dark hover:bg-violet-light"
          >
            <a href="/articulos">Necesito algo</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
