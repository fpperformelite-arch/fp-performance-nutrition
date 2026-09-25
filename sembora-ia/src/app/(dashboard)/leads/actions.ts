"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { requireBusinessContext } from "@/lib/auth/business-context";
import type { LeadStatus } from "@/types/database";

const VALID_STATUSES: LeadStatus[] = ["new", "contacted", "scheduled", "customer", "lost"];

// Se llama directo desde el tablero Kanban (arrastrar y soltar), no desde un
// <form>. El filtro por business_id es lo que evita que alguien manipule el
// leadId en el cliente y mueva un lead de otro negocio.
export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  if (!VALID_STATUSES.includes(status)) return;

  const { business } = await requireBusinessContext();

  await db
    .updateTable("leads")
    .set({ status })
    .where("id", "=", leadId)
    .where("business_id", "=", business.id)
    .execute();

  revalidatePath("/leads");
}
