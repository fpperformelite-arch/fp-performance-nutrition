import { db } from "@/lib/db/client";
import { requireBusinessContext } from "@/lib/auth/business-context";
import type { BoraConfig, Faq, Service } from "@/types/database";
import { addFaq, addService, deleteService, updateBoraConfig, updateService } from "./actions";

// Esta página es, literalmente, la razón por la que Bora funciona igual
// para un gimnasio que para un consultorio dental: todo lo que un dueño de
// negocio configura aquí es lo que el motor (src/lib/bora/engine.ts) lee en
// tiempo real, sin ningún despliegue ni cambio de código de por medio.
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { google?: string };
}) {
  const { business } = await requireBusinessContext();

  const [config, services, faqs] = await Promise.all([
    db
      .selectFrom("bora_configs")
      .selectAll()
      .where("business_id", "=", business.id)
      .executeTakeFirst() as Promise<BoraConfig | undefined>,
    db.selectFrom("services").selectAll().where("business_id", "=", business.id).execute() as Promise<
      Service[]
    >,
    db.selectFrom("faqs").selectAll().where("business_id", "=", business.id).execute() as Promise<Faq[]>,
  ]);

  const googleConnected = Boolean(config?.google_refresh_token);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-4 font-bold text-2xl">Configurar Bora</h1>
        {searchParams.google === "connected" && (
          <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-green-700 text-sm">
            Google Calendar conectado correctamente.
          </p>
        )}
        {searchParams.google === "error" && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-red-700 text-sm">
            No se pudo conectar Google Calendar. Intenta de nuevo.
          </p>
        )}
        <form action={updateBoraConfig} className="flex max-w-lg flex-col gap-3">
          <label className="text-sm">
            Nombre del asistente
            <input
              name="assistant_name"
              defaultValue={config?.assistant_name}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Mensaje de bienvenida
            <textarea
              name="welcome_message"
              defaultValue={config?.welcome_message}
              rows={3}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Tono de conversación
            <select
              name="tone"
              defaultValue={config?.tone}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              <option value="amigable_profesional">Amigable y profesional</option>
              <option value="formal">Formal</option>
              <option value="cercano">Cercano / informal</option>
            </select>
          </label>
          <label className="text-sm">
            Phone Number ID de WhatsApp
            <input
              name="whatsapp_phone_number_id"
              defaultValue={config?.whatsapp_phone_number_id ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            WhatsApp Business Account ID (WABA)
            <input
              name="whatsapp_business_account_id"
              defaultValue={config?.whatsapp_business_account_id ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Recordatorio de cita (horas antes, 0 = desactivado)
            <input
              name="reminder_hours_before"
              type="number"
              min={0}
              defaultValue={config?.reminder_hours_before ?? 24}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={config?.is_active} />
            Bora está activo (responde mensajes de WhatsApp)
          </label>
          <button className="mt-2 w-fit rounded-lg bg-petroleum px-4 py-2 text-white">
            Guardar
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 font-bold text-xl">Google Calendar</h2>
        {googleConnected ? (
          <p className="text-sm text-green-700">
            Conectado (calendario: {config?.google_calendar_id ?? "primary"}). Vuelve a
            conectar si quieres cambiar de cuenta.
          </p>
        ) : (
          <p className="text-sm text-stone-500">
            Sin conectar — Bora no podrá revisar disponibilidad real ni crear citas hasta que
            conectes un calendario.
          </p>
        )}
        <a
          href="/api/google/connect"
          className="mt-2 inline-block rounded-lg border border-petroleum px-4 py-2 text-sm text-petroleum"
        >
          {googleConnected ? "Reconectar Google Calendar" : "Conectar Google Calendar"}
        </a>
      </section>

      <section>
        <h2 className="mb-4 font-bold text-xl">Servicios</h2>
        <ul className="mb-4 flex flex-col gap-2 text-sm">
          {services.map((s) => (
            <li key={s.id} className="rounded-lg border border-stone-200 p-3">
              <form action={updateService} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="service_id" value={s.id} />
                <input
                  name="name"
                  defaultValue={s.name}
                  required
                  className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <input
                  name="duration_minutes"
                  type="number"
                  defaultValue={s.duration_minutes}
                  className="w-20 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  aria-label="Duración en minutos"
                />
                <span className="text-stone-500 text-xs">min</span>
                <span className="text-stone-500 text-xs">$</span>
                <input
                  name="price_pesos"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={s.price_cents != null ? (s.price_cents / 100).toString() : ""}
                  placeholder="Precio"
                  className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  aria-label="Precio en pesos"
                />
                <span className="text-stone-500 text-xs">MXN</span>
                <button className="rounded-lg bg-petroleum px-3 py-2 text-white text-xs">
                  Guardar
                </button>
              </form>
              <form action={deleteService} className="mt-1">
                <input type="hidden" name="service_id" value={s.id} />
                <button className="text-red-600 text-xs underline">Borrar</button>
              </form>
            </li>
          ))}
        </ul>
        <p className="mb-2 font-medium text-sm text-stone-600">Agregar nuevo servicio</p>
        <form action={addService} className="flex max-w-lg flex-wrap gap-2">
          <input
            name="name"
            placeholder="Nombre del servicio"
            required
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            name="duration_minutes"
            type="number"
            defaultValue={30}
            placeholder="Min"
            className="w-20 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            name="price_pesos"
            type="number"
            step="0.01"
            min="0"
            placeholder="Precio MXN"
            className="w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-petroleum px-4 py-2 text-sm text-white">
            Agregar
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 font-bold text-xl">Preguntas frecuentes</h2>
        <ul className="mb-4 flex flex-col gap-2 text-sm">
          {faqs.map((f) => (
            <li key={f.id} className="rounded-lg border border-stone-200 p-3">
              <p className="font-medium">{f.question}</p>
              <p className="text-stone-600">{f.answer}</p>
              <p className="text-stone-400 text-xs">keywords: {f.keywords.join(", ")}</p>
            </li>
          ))}
        </ul>
        <form action={addFaq} className="flex max-w-lg flex-col gap-2">
          <input
            name="question"
            placeholder="Pregunta"
            required
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <textarea
            name="answer"
            placeholder="Respuesta"
            required
            rows={2}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            name="keywords"
            placeholder="Palabras clave separadas por coma (ej. precio, costo, cuanto)"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button className="w-fit rounded-lg bg-petroleum px-4 py-2 text-sm text-white">
            Agregar FAQ
          </button>
        </form>
      </section>
    </div>
  );
}
