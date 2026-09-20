import { db } from "@/lib/db/client";
import { requireBusinessContext } from "@/lib/auth/business-context";
import type { BoraConfig, Faq, Service } from "@/types/database";
import { addFaq, addService, deleteService, updateBoraConfig, updateService } from "./actions";
import { MessageCircle, CalendarDays, Bot, ListChecks, HelpCircle, CheckCircle2 } from "lucide-react";

// Esta página es, literalmente, la razón por la que Bora funciona igual
// para un gimnasio que para un consultorio dental: todo lo que un dueño de
// negocio configura aquí es lo que el motor (src/lib/bora/engine.ts) lee en
// tiempo real, sin ningún despliegue ni cambio de código de por medio.
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { google?: string; whatsapp?: string };
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
  const whatsappConnected = Boolean(config?.whatsapp_phone_number_id) && Boolean(config?.is_active);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-4 font-bold text-2xl text-ink">Configurar Bora</h1>
        <div className="flex flex-col gap-2">
          {searchParams.google === "connected" && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-green-700 text-sm">
              Google Calendar conectado correctamente.
            </p>
          )}
          {searchParams.google === "error" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700 text-sm">
              No se pudo conectar Google Calendar. Intenta de nuevo.
            </p>
          )}
          {searchParams.whatsapp === "connected" && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-green-700 text-sm">
              WhatsApp conectado correctamente. Bora ya puede responder mensajes.
            </p>
          )}
          {searchParams.whatsapp === "error" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700 text-sm">
              No se pudo conectar WhatsApp. Intenta de nuevo.
            </p>
          )}
        </div>
      </div>

      <section className="card">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petroleum/10 text-petroleum">
            <MessageCircle size={18} strokeWidth={1.75} />
          </span>
          <h2 className="section-title">WhatsApp</h2>
        </div>
        {whatsappConnected ? (
          <p className="flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle2 size={16} strokeWidth={2} />
            Conectado (Phone Number ID: {config?.whatsapp_phone_number_id}). Bora está
            respondiendo en este número.
          </p>
        ) : (
          <p className="text-sm text-stone-500">
            Sin conectar — Bora no puede responder mensajes hasta que conectes un número de
            WhatsApp Business.
          </p>
        )}
        <a href="/api/kapso/setup" className="btn-secondary mt-3">
          {whatsappConnected ? "Reconectar WhatsApp" : "Conectar WhatsApp"}
        </a>
        <p className="mt-2 max-w-lg text-stone-400 text-xs">
          Te va a pedir iniciar sesión con tu Facebook/WhatsApp Business — nosotros nunca vemos
          esas credenciales, solo recibimos la confirmación de que quedó conectado.
        </p>
      </section>

      <section className="card">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petroleum/10 text-petroleum">
            <Bot size={18} strokeWidth={1.75} />
          </span>
          <h2 className="section-title">Asistente Bora</h2>
        </div>
        <form action={updateBoraConfig} className="flex max-w-lg flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="label">Nombre del asistente</span>
            <input name="assistant_name" defaultValue={config?.assistant_name} className="input" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Mensaje de bienvenida</span>
            <textarea
              name="welcome_message"
              defaultValue={config?.welcome_message}
              rows={3}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Tono de conversación</span>
            <select name="tone" defaultValue={config?.tone} className="input">
              <option value="amigable_profesional">Amigable y profesional</option>
              <option value="formal">Formal</option>
              <option value="cercano">Cercano / informal</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Phone Number ID de WhatsApp</span>
            <input
              name="whatsapp_phone_number_id"
              defaultValue={config?.whatsapp_phone_number_id ?? ""}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">WhatsApp Business Account ID (WABA)</span>
            <input
              name="whatsapp_business_account_id"
              defaultValue={config?.whatsapp_business_account_id ?? ""}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Recordatorio de cita (horas antes, 0 = desactivado)</span>
            <input
              name="reminder_hours_before"
              type="number"
              min={0}
              defaultValue={config?.reminder_hours_before ?? 24}
              className="input"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={config?.is_active} />
            Bora está activo (responde mensajes de WhatsApp)
          </label>
          <button className="btn-primary mt-1 w-fit">Guardar</button>
        </form>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petroleum/10 text-petroleum">
            <CalendarDays size={18} strokeWidth={1.75} />
          </span>
          <h2 className="section-title">Google Calendar</h2>
        </div>
        {googleConnected ? (
          <p className="flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle2 size={16} strokeWidth={2} />
            Conectado (calendario: {config?.google_calendar_id ?? "primary"}). Vuelve a
            conectar si quieres cambiar de cuenta.
          </p>
        ) : (
          <p className="text-sm text-stone-500">
            Sin conectar — Bora no podrá revisar disponibilidad real ni crear citas hasta que
            conectes un calendario.
          </p>
        )}
        <a href="/api/google/connect" className="btn-secondary mt-3">
          {googleConnected ? "Reconectar Google Calendar" : "Conectar Google Calendar"}
        </a>
      </section>

      <section className="card">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petroleum/10 text-petroleum">
            <ListChecks size={18} strokeWidth={1.75} />
          </span>
          <h2 className="section-title">Servicios</h2>
        </div>
        <ul className="mb-5 flex flex-col gap-2">
          {services.map((s) => (
            <li key={s.id} className="rounded-xl border border-stone-200 p-3">
              <form action={updateService} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="service_id" value={s.id} />
                <input name="name" defaultValue={s.name} required className="input flex-1" />
                <input
                  name="duration_minutes"
                  type="number"
                  defaultValue={s.duration_minutes}
                  className="input w-20"
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
                  className="input w-24"
                  aria-label="Precio en pesos"
                />
                <span className="text-stone-500 text-xs">MXN</span>
                <button className="btn-secondary px-3 py-1.5 text-xs">Guardar</button>
              </form>
              <form action={deleteService} className="mt-1.5">
                <input type="hidden" name="service_id" value={s.id} />
                <button className="btn-danger-ghost">Borrar</button>
              </form>
            </li>
          ))}
        </ul>
        <p className="mb-2 font-medium text-sm text-stone-600">Agregar nuevo servicio</p>
        <form action={addService} className="flex max-w-lg flex-wrap gap-2">
          <input name="name" placeholder="Nombre del servicio" required className="input flex-1" />
          <input
            name="duration_minutes"
            type="number"
            defaultValue={30}
            placeholder="Min"
            className="input w-20"
          />
          <input
            name="price_pesos"
            type="number"
            step="0.01"
            min="0"
            placeholder="Precio MXN"
            className="input w-28"
          />
          <button className="btn-primary">Agregar</button>
        </form>
      </section>

      <section className="card">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petroleum/10 text-petroleum">
            <HelpCircle size={18} strokeWidth={1.75} />
          </span>
          <h2 className="section-title">Preguntas frecuentes</h2>
        </div>
        <ul className="mb-5 flex flex-col gap-2">
          {faqs.map((f) => (
            <li key={f.id} className="rounded-xl border border-stone-200 p-3 text-sm">
              <p className="font-medium text-ink">{f.question}</p>
              <p className="text-stone-600">{f.answer}</p>
              <p className="text-stone-400 text-xs">keywords: {f.keywords.join(", ")}</p>
            </li>
          ))}
        </ul>
        <form action={addFaq} className="flex max-w-lg flex-col gap-2">
          <input name="question" placeholder="Pregunta" required className="input" />
          <textarea name="answer" placeholder="Respuesta" required rows={2} className="input" />
          <input
            name="keywords"
            placeholder="Palabras clave separadas por coma (ej. precio, costo, cuanto)"
            className="input"
          />
          <button className="btn-primary w-fit">Agregar FAQ</button>
        </form>
      </section>
    </div>
  );
}
