// Franja superior. Va en todas las pantallas y es la única barra de arriba:
// las pantallas ya no traen encabezado propio, su título vive en el contenido.
//
// A la derecha cambia según quién esté mirando. Sin sesión: la puerta de
// entrada de quien da y el acceso de quien ya tiene cuenta. Con sesión: el
// menú de siempre.
//
// No es fija. En móvil ya hay barras fijas abajo —los dos botones en la
// landing, la navegación de quien recibe— y dos elementos fijos dejan poca
// pantalla. En un teléfono lo que importa va abajo, donde llega el pulgar.
import { Link, useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { MenuVecino } from "@/components/Pendientes";
import { guardarRolElegido, guardarRutaOrigen, useAuth } from "@/lib/auth";

const ENLACES = [
  { href: "#catalogo", texto: "Catálogo" },
  { href: "#como", texto: "Cómo funciona" },
  { href: "#reglas", texto: "Reglas" },
  { href: "#preguntas", texto: "Preguntas" },
];

/**
 * Deja marcado el rol y el destino antes de mandar a entrar. Quien toca
 * "quiero regalar algo" no quiere una pantalla de bienvenida al terminar:
 * quiere publicar la cosa que tiene en la mano.
 */
export function empezarARegalar() {
  guardarRolElegido("doy");
  guardarRutaOrigen("/publicar");
}

export function FranjaSuperior() {
  const { usuario, perfil } = useAuth();
  const ruta = useRouterState({ select: (s) => s.location.pathname });
  const enLanding = ruta === "/";
  // En las pantallas de entrar y de completar el perfil no va nada que saque a
  // la persona del trámite que está haciendo.
  const enTramite = ruta.startsWith("/entrar") || ruta.startsWith("/completar-perfil");

  // A quien viene a recibir no se le ofrece publicar. No puede —los roles
  // están separados en la base— y proponérselo a alguien que acaba de salir
  // de su casa suena mal.
  //
  // En la landing tampoco aparece: el hero ya tiene ese mismo botón, grande y
  // junto a su par. Repetirlo arriba no agrega un camino, agrega ruido al lado
  // de la única decisión que la portada tiene que dejar clara.
  const ofrecerRegalar = !usuario && !enLanding && !enTramite;

  // 9 · Quien ya tiene cuenta para regalar ve su acción principal siempre a
  // mano, en vez de tenerla escondida detrás de la hamburguesa. No aparece en
  // /publicar, que es donde ya está.
  const ofrecerPublicar =
    perfil?.rol_principal === "doy" && !ruta.startsWith("/publicar") && !enTramite;

  return (
    <div className="border-b border-border bg-white">
      <div className="mx-auto flex min-h-[60px] w-full max-w-[640px] items-center gap-4 px-4 sm:max-w-[760px] lg:max-w-[1040px] lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-[9px]">
          <Logo className="h-[26px] w-[26px] shrink-0" />
          <span className="whitespace-nowrap text-body font-semibold text-violet-dark">
            Vecinos de Cali
          </span>
        </Link>

        {/* Los enlaces de sección solo existen en la landing, y solo desde
            600px: cuatro enlaces más el acceso no caben en 390 sin apretarse,
            y quien llega por primera vez no viene a navegar secciones. */}
        {enLanding ? (
          <nav className="ml-auto hidden gap-5 lg:flex">
            {ENLACES.map((e) => (
              <a
                key={e.href}
                href={e.href}
                className="whitespace-nowrap text-chip text-muted-foreground hover:text-foreground"
              >
                {e.texto}
              </a>
            ))}
          </nav>
        ) : null}

        <div className={`flex items-center gap-3 ${enLanding ? "ml-auto lg:ml-4" : "ml-auto"}`}>
          {usuario ? (
            <>
              {ofrecerPublicar ? (
                // Violeta, no contorneada: es la acción principal de quien
                // regala, la misma que en la landing invita a entrar. Que
                // cambie de peso al iniciar sesión hacía parecer que era otra
                // cosa.
                <Button asChild size="sm" className="shrink-0">
                  <Link to="/publicar">
                    <span className="sm:hidden">Publicar</span>
                    <span className="hidden sm:inline">Publicar algo</span>
                  </Link>
                </Button>
              ) : null}
              <MenuVecino />
            </>
          ) : (
            <>
              {ofrecerRegalar ? (
                // En móvil las etiquetas se acortan. Con los textos largos la
                // franja mide 441px en una pantalla de 390 y empuja la página
                // entera hacia el costado.
                <Button asChild size="sm" className="shrink-0">
                  <Link to="/entrar" onClick={empezarARegalar}>
                    <span className="sm:hidden">Regalar algo</span>
                    <span className="hidden sm:inline">Quiero regalar algo</span>
                  </Link>
                </Button>
              ) : null}
              {!enTramite ? (
                <Link
                  to="/entrar"
                  className="shrink-0 text-chip font-medium text-violet hover:underline"
                >
                  <span className="sm:hidden">Entrar</span>
                  <span className="hidden sm:inline">Ya tengo cuenta</span>
                </Link>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
