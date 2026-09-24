import Link from "next/link";

export const metadata = {
  title: "Términos de Uso — SEMBORA IA",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="mb-8 inline-block font-bold text-lg text-petroleum">
        SEMBORA IA
      </Link>
      <h1 className="mb-2 font-bold text-3xl text-ink">Términos de Uso</h1>
      <p className="mb-10 text-sm text-stone-500">Última actualización: septiembre de 2026</p>

      <div className="flex flex-col gap-6 text-stone-700 leading-relaxed">
        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">1. Aceptación de los términos</h2>
          <p>
            Al crear una cuenta en SEMBORA IA (&quot;el Servicio&quot;), operado por{" "}
            <strong>FP Performance &amp; Nutrition</strong> (&quot;nosotros&quot;), aceptas estos
            Términos de Uso y nuestro{" "}
            <Link href="/privacidad" className="text-petroleum underline">
              Aviso de Privacidad
            </Link>
            . Si no estás de acuerdo, no debes usar el Servicio.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">2. Descripción del Servicio</h2>
          <p>
            SEMBORA IA es una plataforma que conecta tu número de WhatsApp Business con un asistente
            automatizado (&quot;Bora&quot;) para responder preguntas frecuentes, capturar leads y
            agendar citas directamente en tu Google Calendar, según la configuración que tú mismo
            defines (servicios, precios, horarios y preguntas frecuentes).
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">3. Cuenta, prueba gratis y plan</h2>
          <ul className="ml-5 flex list-disc flex-col gap-1">
            <li>Al registrarte obtienes una prueba gratuita de 7 días, sin necesidad de tarjeta.</li>
            <li>Al terminar la prueba, Bora deja de responder mensajes automáticamente hasta que actives tu plan de pago.</li>
            <li>El plan tiene un costo de $599.00 MXN al mes, facturado de forma recurrente a través de Stripe.</li>
            <li>Puedes cancelar tu suscripción en cualquier momento desde el panel; la cancelación aplica al final del periodo ya pagado.</li>
            <li>Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad realizada desde tu cuenta.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">4. Uso de WhatsApp y Google Calendar</h2>
          <p>
            Al conectar tu número de WhatsApp Business y tu cuenta de Google Calendar, nos autorizas a
            enviar y recibir mensajes, y a consultar disponibilidad y crear eventos en tu calendario,
            exclusivamente para operar el Servicio en tu nombre. Eres responsable de que el uso de tu
            número de WhatsApp Business cumpla con las políticas de Meta / WhatsApp Business, y de que
            la información que cargas (servicios, precios, respuestas) sea veraz y esté actualizada.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">5. Uso aceptable</h2>
          <p className="mb-2">No debes usar el Servicio para:</p>
          <ul className="ml-5 flex list-disc flex-col gap-1">
            <li>Enviar mensajes no solicitados (spam) o contenido ilegal, engañoso u ofensivo.</li>
            <li>Intentar vulnerar la seguridad de la plataforma o acceder a datos de otros negocios.</li>
            <li>Usar el Servicio para actividades que violen la ley aplicable en México.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">6. Limitación de responsabilidad</h2>
          <p>
            El Servicio se ofrece &quot;tal cual&quot;. Bora es un asistente automatizado y puede no
            responder correctamente en todos los casos; no garantizamos disponibilidad ininterrumpida
            del Servicio ni de terceros de los que dependemos (WhatsApp/Meta, Google, Stripe). En la
            medida permitida por la ley, no somos responsables por pérdidas indirectas derivadas del
            uso o imposibilidad de uso del Servicio.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">7. Terminación</h2>
          <p>
            Podemos suspender o cancelar tu acceso al Servicio si incumples estos Términos. Puedes
            cancelar tu cuenta en cualquier momento; al hacerlo, dejaremos de procesar tus mensajes de
            WhatsApp y podremos eliminar tus datos conforme a nuestro Aviso de Privacidad.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">8. Cambios a estos términos</h2>
          <p>
            Podemos actualizar estos Términos de Uso ocasionalmente. Publicaremos cualquier cambio en
            esta misma página con su fecha de actualización. El uso continuo del Servicio después de un
            cambio implica tu aceptación de los nuevos términos.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">9. Ley aplicable y contacto</h2>
          <p>
            Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para dudas o
            aclaraciones, escríbenos a{" "}
            <a href="mailto:fpperformelite@gmail.com" className="text-petroleum underline">
              fpperformelite@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
