import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/supabase/business-context";

// Métricas básicas del MVP: conversaciones, citas agendadas, conversión.
// Se calculan al vuelo con consultas simples; si el volumen crece, esto se
// puede mover a una vista materializada sin cambiar la interfaz de la página.
export default async function DashboardPage() {
  const { business } = await requireBusinessContext();
  const supabase = createServerSupabaseClient();

  const [{ count: conversationsCount }, { count: appointmentsCount }, { count: leadsCount }] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id),
    ]);

  const conversion =
    leadsCount && appointmentsCount ? Math.round((appointmentsCount / leadsCount) * 100) : 0;

  const metrics = [
    { label: "Conversaciones", value: conversationsCount ?? 0 },
    { label: "Leads capturados", value: leadsCount ?? 0 },
    { label: "Citas agendadas", value: appointmentsCount ?? 0 },
    { label: "Conversión lead → cita", value: `${conversion}%` },
  ];

  return (
    <div>
      <h1 className="mb-6 font-bold text-2xl">Métricas</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-stone-200 p-4">
            <p className="text-sm text-stone-500">{m.label}</p>
            <p className="font-bold text-2xl text-petroleum">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
