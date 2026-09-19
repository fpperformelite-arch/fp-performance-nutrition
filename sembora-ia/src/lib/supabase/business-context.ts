import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Business, BusinessUser } from "@/types/database";

// Resuelve el negocio del usuario logueado. Para el MVP asumimos que cada
// usuario pertenece a un solo negocio (dueño o staff); si en el futuro un
// usuario administra varios negocios, aquí es el único lugar que cambia
// (agregar selector de negocio activo).
export async function requireBusinessContext(): Promise<{
  business: Business;
  membership: BusinessUser;
}> {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_users")
    .select("*")
    .eq("user_id", user!.id)
    .single<BusinessUser>();

  if (!membership) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", membership.business_id)
    .single<Business>();

  if (!business) redirect("/login");

  return { business, membership };
}
