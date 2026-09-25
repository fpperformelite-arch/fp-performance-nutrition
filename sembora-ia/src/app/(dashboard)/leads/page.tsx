import { db } from "@/lib/db/client";
import { requireBusinessContext } from "@/lib/auth/business-context";
import type { Lead } from "@/types/database";
import { LeadsKanbanBoard } from "./kanban-board";

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
      <h1 className="mb-1 font-bold text-2xl text-ink">Leads y conversaciones</h1>
      <p className="mb-6 text-sm text-stone-500">
        Arrastra una tarjeta para mover a un lead de etapa.
      </p>
      <LeadsKanbanBoard initialLeads={leads} />
    </div>
  );
}
