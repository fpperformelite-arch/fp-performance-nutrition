import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/supabase/business-context";
import type { BoraConfig, Faq, Service } from "@/types/database";
import { addFaq, addService, updateBoraConfig } from "./actions";

// Esta página es, literalmente, la razón por la que Bora funciona igual
// para un gimnasio que para un consultorio dental: todo lo que un dueño de
// negocio configura aquí es lo que el motor (src/lib/bora/engine.ts) lee en
// tiempo real, sin ningún despliegue ni cambio de código de por medio.
export default async function SettingsPage() {
  const { business } = await requireBusinessContext();
  const supabase = createServerSupabaseClient();

  const [{ data: config }, { data: services }, { data: faqs }] = await Promise.all([
    supabase.from("bora_configs").select("*").eq("business_id", business.id).single<BoraConfig>(),
    supabase.from("services").select("*").eq("business_id", business.id).returns<Service[]>(),
    supabase.from("faqs").select("*").eq("business_id", business.id).returns<Faq[]>(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-4 font-bold text-2xl">Configurar Bora</h1>
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
            ID de Google Calendar
            <input
              name="google_calendar_id"
              defaultValue={config?.google_calendar_id ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <button className="mt-2 w-fit rounded-lg bg-petroleum px-4 py-2 text-white">
            Guardar
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 font-bold text-xl">Servicios</h2>
        <ul className="mb-4 flex flex-col gap-1 text-sm">
          {(services ?? []).map((s) => (
            <li key={s.id}>
              {s.name} — {s.duration_minutes} min
            </li>
          ))}
        </ul>
        <form action={addService} className="flex max-w-lg gap-2">
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
            className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-petroleum px-4 py-2 text-sm text-white">
            Agregar
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 font-bold text-xl">Preguntas frecuentes</h2>
        <ul className="mb-4 flex flex-col gap-2 text-sm">
          {(faqs ?? []).map((f) => (
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
