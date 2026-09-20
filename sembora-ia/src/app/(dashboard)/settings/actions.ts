"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { requireOwnerContext } from "@/lib/auth/business-context";

export async function updateBoraConfig(formData: FormData) {
  const { business } = await requireOwnerContext();

  await db
    .updateTable("bora_configs")
    .set({
      assistant_name: String(formData.get("assistant_name") ?? "Bora"),
      tone: String(formData.get("tone") ?? "amigable_profesional"),
      welcome_message: String(formData.get("welcome_message") ?? ""),
      whatsapp_phone_number_id: String(formData.get("whatsapp_phone_number_id") ?? "") || null,
      whatsapp_business_account_id:
        String(formData.get("whatsapp_business_account_id") ?? "") || null,
      reminder_hours_before: Number(formData.get("reminder_hours_before") ?? 24),
      is_active: formData.get("is_active") === "on",
    })
    .where("business_id", "=", business.id)
    .execute();

  revalidatePath("/settings");
}

// Los precios se capturan en pesos (más natural para el dueño del negocio)
// y se guardan en centavos, que es como vive `price_cents` en la base de
// datos (evita errores de redondeo con floats en dinero).
function pesosToCents(formData: FormData): number | null {
  const raw = formData.get("price_pesos");
  if (raw === null || raw === "") return null;
  const pesos = Number(raw);
  if (Number.isNaN(pesos)) return null;
  return Math.round(pesos * 100);
}

export async function addService(formData: FormData) {
  const { business } = await requireOwnerContext();

  await db
    .insertInto("services")
    .values({
      business_id: business.id,
      name: String(formData.get("name")),
      duration_minutes: Number(formData.get("duration_minutes") ?? 30),
      price_cents: pesosToCents(formData),
    })
    .execute();

  revalidatePath("/settings");
}

export async function updateService(formData: FormData) {
  const { business } = await requireOwnerContext();

  const serviceId = String(formData.get("service_id"));

  await db
    .updateTable("services")
    .set({
      name: String(formData.get("name")),
      duration_minutes: Number(formData.get("duration_minutes") ?? 30),
      price_cents: pesosToCents(formData),
    })
    .where("id", "=", serviceId)
    .where("business_id", "=", business.id)
    .execute();

  revalidatePath("/settings");
}

export async function deleteService(formData: FormData) {
  const { business } = await requireOwnerContext();

  const serviceId = String(formData.get("service_id"));

  await db
    .deleteFrom("services")
    .where("id", "=", serviceId)
    .where("business_id", "=", business.id)
    .execute();

  revalidatePath("/settings");
}

export async function addFaq(formData: FormData) {
  const { business } = await requireOwnerContext();

  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  await db
    .insertInto("faqs")
    .values({
      business_id: business.id,
      question: String(formData.get("question")),
      answer: String(formData.get("answer")),
      keywords,
    })
    .execute();

  revalidatePath("/settings");
}
