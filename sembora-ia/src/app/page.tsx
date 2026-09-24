import Link from "next/link";

// Página pública de venta de SEMBORA IA. El precio se define aparte (en
// /pricing o directamente en el checkout de Stripe cuando esté configurado);
// mientras tanto el CTA principal manda a /onboarding, que ya crea la cuenta
// del negocio sin depender de facturación.
export default function HomePage() {
  return (
    <main className="flex flex-col">
      <Nav />
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <SocialProof />
      <FinalCta />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
      <span className="font-bold text-lg text-petroleum">SEMBORA IA</span>
      <Link
        href="/login"
        className="text-sm text-stone-600 hover:text-petroleum"
      >
        Entrar al panel
      </Link>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-24">
      <span className="rounded-full bg-petroleum/10 px-4 py-1 text-petroleum text-sm font-medium">
        Para gimnasios, nutriólogos, entrenadores, consultorios y spas
      </span>
      <h1 className="max-w-2xl font-bold text-4xl text-ink leading-tight sm:text-5xl">
        Deja que <span className="text-petroleum">Bora</span> conteste tu WhatsApp
        y agende tus citas, 24/7
      </h1>
      <p className="max-w-xl text-lg text-stone-600">
        Bora responde preguntas, captura leads y agenda citas directo en tu
        Google Calendar — sin que tú o tu staff tengan que estar pegados al
        celular todo el día.
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/onboarding"
          className="rounded-full bg-petroleum px-8 py-3 font-medium text-white shadow-lg shadow-petroleum/20"
        >
          Empieza gratis
        </Link>
        <a
          href="mailto:fpperformelite@gmail.com?subject=Quiero%20una%20demo%20de%20SEMBORA%20IA"
          className="rounded-full border border-stone-300 px-8 py-3 font-medium text-ink"
        >
          Agenda una demo
        </a>
      </div>
    </section>
  );
}

function Problem() {
  const points = [
    "Un lead te escribe a las 11pm y para cuando contestas ya reservó con la competencia.",
    "Tú o tu staff pierden horas al día respondiendo las mismas preguntas de precio y horarios.",
    "Agendar por WhatsApp a mano significa dobles citas, olvidos y horarios que no cuadran con tu calendario real.",
  ];
  return (
    <section className="bg-stone-50 py-16">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="mb-8 text-center font-bold text-2xl text-ink">
          Si tu negocio agenda citas, esto te suena
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {points.map((p) => (
            <div key={p} className="rounded-xl bg-white p-5 text-sm text-stone-600 shadow-sm">
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "Conecta tu WhatsApp",
      body: "Bora recibe los mensajes de tu número de negocio, no del tuyo personal.",
    },
    {
      title: "Configura a Bora en minutos",
      body: "Tus servicios, precios, preguntas frecuentes y horarios — sin tocar código.",
    },
    {
      title: "Bora atiende y agenda",
      body: "Responde dudas, captura el lead y agenda la cita directo en tu Google Calendar.",
    },
  ];
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <h2 className="mb-10 text-center font-bold text-2xl text-ink">Cómo funciona</h2>
      <div className="grid gap-8 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="flex flex-col items-center text-center">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-petroleum font-bold text-white">
              {i + 1}
            </span>
            <h3 className="mb-2 font-semibold text-ink">{s.title}</h3>
            <p className="text-sm text-stone-600">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    ["Respuestas automáticas", "Bora contesta preguntas frecuentes con tus propias respuestas, al instante."],
    ["Captura de leads", "Cada conversación queda guardada — nunca más pierdes el contacto de un prospecto."],
    ["Agenda en tu calendario real", "Conecta Google Calendar y Bora solo ofrece horarios que de verdad tienes libres."],
    ["Recordatorios de citas", "Bora le recuerda al cliente su cita para reducir las inasistencias."],
    ["Configurable a tu negocio", "Tono, servicios, precios y horarios — tú decides, sin depender de un programador."],
    ["Un panel para todo", "Ve tus leads, conversaciones y citas agendadas en un solo lugar."],
  ];
  return (
    <section className="bg-stone-50 py-16">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="mb-10 text-center font-bold text-2xl text-ink">Todo lo que necesitas</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, body]) => (
            <div key={title} className="rounded-xl bg-white p-5 shadow-sm">
              <h3 className="mb-1 font-semibold text-ink">{title}</h3>
              <p className="text-sm text-stone-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-coral">Caso real</p>
      <h2 className="mt-2 mb-4 font-bold text-2xl text-ink">
        Ya está corriendo en un negocio de verdad
      </h2>
      <p className="text-stone-600">
        Bora atiende hoy el WhatsApp de <strong>FP Performance &amp; Nutrition</strong>,
        respondiendo dudas y agendando sesiones directo en Google Calendar —
        no es una maqueta ni un demo armado para vender, es la misma
        plataforma que te vamos a configurar a ti.
      </p>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-petroleum py-16 text-center text-white">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="mb-4 font-bold text-2xl">¿Listo para dejar de perder leads?</h2>
        <p className="mb-8 text-petroleum-50/90">
          Crea tu cuenta gratis y empieza a configurar a Bora hoy mismo.
        </p>
        <Link
          href="/onboarding"
          className="inline-block rounded-full bg-white px-8 py-3 font-medium text-petroleum"
        >
          Empieza gratis
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-6 py-10 text-center text-sm text-stone-400">
      <span>SEMBORA IA — un producto de FP Performance &amp; Nutrition</span>
      <a href="mailto:fpperformelite@gmail.com" className="hover:text-petroleum">
        fpperformelite@gmail.com
      </a>
      <div className="flex gap-4">
        <Link href="/privacidad" className="hover:text-petroleum">
          Aviso de Privacidad
        </Link>
        <Link href="/terminos" className="hover:text-petroleum">
          Términos de Uso
        </Link>
      </div>
    </footer>
  );
}
