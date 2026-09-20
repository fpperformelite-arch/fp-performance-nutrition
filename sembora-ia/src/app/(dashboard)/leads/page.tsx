import { db } from "@/lib/db/client";
import { requireBusinessContext } from "@/lib/auth/business-context";
import type { Lead } from "@/types/database";
import { MessagesSquare } from "lucide-react";

const STATUS_LABEL: Record<Lead["status"], string> = {
  new: "Nuevo",
  contacted: "Contactado",
  scheduled: "Agendado",
  customer: "Cliente",
  lost: "Perdido",
};

const STATUS_COLOR: Record<Lead["status"], string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  scheduled: "bg-purple-100 text-purple-700",
  customer: "bg-green-100 text-green-700",
  lost: "bg-stone-200 text-stone-600",
};

export default async function LeadsPage() {
  const { business } = await requireBusinessContext();

  const leads = (await db
    .selectFrom("leads")
    .selectAll()
    .where("business_id", "=", business.id)
    .orderBy("created_at", "desc")
    .execute()) as Lead[];

  return (
    <div>
      <h1 className="mb-6 font-bold text-2xl text-ink">Leads y conversaciones</h1>
      <div className="card overflow-hidden !p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Teléfono</th>
              <th className="px-5 py-3 font-medium">Interés</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Creado</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-stone-100 last:border-0">
                <td className="px-5 py-3 text-ink">{lead.full_name ?? "—"}</td>
                <td className="px-5 py-3 text-stone-600">{lead.phone}</td>
                <td className="px-5 py-3 text-stone-600">{lead.interest ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[lead.status]}`}>
                    {STATUS_LABEL[lead.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-stone-500">
                  {new Date(lead.created_at).toLocaleDateString("es-MX")}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-stone-400">
                  <div className="flex flex-col items-center gap-2">
                    <MessagesSquare size={28} strokeWidth={1.5} className="text-stone-300" />
                    Aún no hay leads. En cuanto alguien escriba a tu WhatsApp, aparecerá aquí.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
