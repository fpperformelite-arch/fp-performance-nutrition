import Link from "next/link";

export const metadata = {
  title: "Aviso de Privacidad — SEMBORA IA",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="mb-8 inline-block font-bold text-lg text-petroleum">
        SEMBORA IA
      </Link>
      <h1 className="mb-2 font-bold text-3xl text-ink">Aviso de Privacidad</h1>
      <p className="mb-10 text-sm text-stone-500">Última actualización: septiembre de 2026</p>

      <div className="flex flex-col gap-6 text-stone-700 leading-relaxed">
        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">1. Responsable del tratamiento de datos</h2>
          <p>
            SEMBORA IA es un producto operado por <strong>FP Performance &amp; Nutrition</strong>{" "}
            (&quot;nosotros&quot;), responsable del tratamiento de tus datos personales conforme a la
            Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
            Puedes contactarnos en{" "}
            <a href="mailto:fpperformelite@gmail.com" className="text-petroleum underline">
              fpperformelite@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">2. Datos que recabamos</h2>
          <p className="mb-2">Dependiendo de cómo uses SEMBORA IA, podemos recabar:</p>
          <ul className="ml-5 flex list-disc flex-col gap-1">
            <li>
              <strong>Datos del dueño del negocio:</strong> nombre del negocio, correo electrónico y
              contraseña (almacenada de forma cifrada).
            </li>
            <li>
              <strong>Datos de configuración del negocio:</strong> servicios, precios, horarios y
              preguntas frecuentes que tú mismo capturas en el panel.
            </li>
            <li>
              <strong>Datos de tus clientes finales (leads):</strong> nombre, número de WhatsApp, y el
              contenido de las conversaciones que sostienen con nuestro asistente (Bora), incluyendo
              citas agendadas.
            </li>
            <li>
              <strong>Datos de pago:</strong> procesados directamente por Stripe; nosotros no
              almacenamos números de tarjeta.
            </li>
            <li>
              <strong>Datos de conexión:</strong> tokens de acceso de WhatsApp Business (vía Kapso) y
              de Google Calendar, necesarios para operar el servicio en tu nombre.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">3. Finalidades del tratamiento</h2>
          <p className="mb-2">Usamos estos datos para:</p>
          <ul className="ml-5 flex list-disc flex-col gap-1">
            <li>Operar el asistente Bora: responder mensajes de WhatsApp y agendar citas en tu Google Calendar.</li>
            <li>Administrar tu cuenta, tu plan y tu facturación.</li>
            <li>Enviarte notificaciones operativas relacionadas con el servicio (ej. estado de tu prueba gratis, pagos).</li>
            <li>Dar soporte y corregir fallas técnicas.</li>
            <li>Cumplir con obligaciones legales aplicables.</li>
          </ul>
          <p className="mt-2">No usamos tus datos ni los de tus clientes para fines de mercadotecnia sin tu consentimiento expreso.</p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">4. Terceros con quienes compartimos datos</h2>
          <p className="mb-2">
            Para operar SEMBORA IA usamos proveedores de servicios que procesan datos en nuestro
            nombre, únicamente para los fines descritos arriba:
          </p>
          <ul className="ml-5 flex list-disc flex-col gap-1">
            <li><strong>Kapso / Meta (WhatsApp Business Platform):</strong> envío y recepción de mensajes de WhatsApp.</li>
            <li><strong>Google (Google Calendar API):</strong> consulta de disponibilidad y creación de citas.</li>
            <li><strong>Stripe:</strong> procesamiento de pagos y suscripciones.</li>
            <li><strong>Vercel / Neon:</strong> hospedaje de la aplicación y de la base de datos.</li>
          </ul>
          <p className="mt-2">No vendemos ni rentamos tus datos personales a terceros.</p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">5. Derechos ARCO</h2>
          <p>
            Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte (ARCO) al tratamiento de tus
            datos personales, así como a revocar tu consentimiento. Para ejercer estos derechos,
            escríbenos a{" "}
            <a href="mailto:fpperformelite@gmail.com" className="text-petroleum underline">
              fpperformelite@gmail.com
            </a>{" "}
            indicando tu solicitud; te responderemos en un plazo razonable conforme a la ley aplicable.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">6. Seguridad y conservación</h2>
          <p>
            Implementamos medidas técnicas razonables (cifrado de contraseñas, conexiones seguras
            HTTPS, control de acceso por negocio) para proteger tus datos. Conservamos tus datos
            mientras tu cuenta esté activa y, después de la cancelación, por el tiempo necesario para
            cumplir obligaciones legales o fiscales.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-lg text-ink">7. Cambios a este aviso</h2>
          <p>
            Podemos actualizar este aviso de privacidad. Publicaremos cualquier cambio en esta misma
            página con su fecha de actualización.
          </p>
        </section>
      </div>
    </main>
  );
}
