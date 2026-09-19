import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";
import type { Business, BusinessUser } from "@/types/database";

// Resuelve el negocio del usuario logueado. Para el MVP asumimos que cada
// usuario pertenece a un solo negocio (dueño o staff); si en el futuro un
// usuario administra varios negocios, aquí es el único lugar que cambia
// (agregar selector de negocio activo).
//
// Sin Row Level Security (eso lo daba Supabase), ESTE helper es el punto
// central de aislamiento entre tenants: toda página/acción del panel debe
// obtener `business.id` de aquí y nunca de un parámetro que venga del
// cliente (formulario, query string, etc.).
export async function requireBusinessContext(): Promise<{
  business: Business;
  membership: BusinessUser;
}> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await db
    .selectFrom("business_users")
    .selectAll()
    .where("user_id", "=", user.id)
    .executeTakeFirst();

  if (!membership) redirect("/login");

  const business = await db
    .selectFrom("businesses")
    .selectAll()
    .where("id", "=", membership.business_id)
    .executeTakeFirst();

  if (!business) redirect("/login");

  return { business: business as Business, membership: membership as BusinessUser };
}

// Para Server Actions que solo el dueño del negocio debe poder ejecutar
// (configuración de Bora, facturación). La UI ya oculta esos enlaces a
// staff, pero una Server Action es un endpoint alcanzable directamente —
// sin esta verificación, un staff podría invocarla sin pasar por la UI.
export async function requireOwnerContext(): Promise<{
  business: Business;
  membership: BusinessUser;
}> {
  const { business, membership } = await requireBusinessContext();

  if (membership.role !== "owner") {
    throw new Error("Solo el dueño del negocio puede realizar esta acción.");
  }

  return { business, membership };
}
