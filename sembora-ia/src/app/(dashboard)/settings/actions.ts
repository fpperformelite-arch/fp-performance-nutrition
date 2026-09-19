"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/supabase/business-context";

export async function updateBoraConfig(formData: FormData) {
  const { business } = await requireBusinessContext();
  const supabase = createServerSupabaseClient();

  await supabase
    .from("bora_configs")
    .update({
      assistant_name: String(formData.get("assistant_name") ?? "Bora"),
      tone: String(formData.get("tone") ?? "amigable_profesional"),
      welcome_message: String(formData.get("welcome_message") ?? ""),
      whatsapp_phone_number_id: String(formData.get("whatsapp_phone_number_id") ?? "") || null,
      google_calendar_id: String(formData.get("google_calendar_id") ?? "") || null,
    })
    .eq("business_id", business.id);

  revalidatePath("/settings");
}

export async function addService(formData: FormData) {
  const { business } = await requireBusinessContext();
  const supabase = createServerSupabaseClient();

  await supabase.from("services").insert({
    business_id: business.id,
    name: String(formData.get("name")),
    duration_minutes: Number(formData.get("duration_minutes") ?? 30),
  });

  revalidatePath("/settings");
}

export async function addFaq(formData: FormData) {
  const { business } = await requireBusinessContext();
  const supabase = createServerSupabaseClient();

  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  await supabase.from("faqs").insert({
    business_id: business.id,
    question: String(formData.get("question")),
    answer: String(formData.get("answer")),
    keywords,
  });

  revalidatePath("/settings");
}
