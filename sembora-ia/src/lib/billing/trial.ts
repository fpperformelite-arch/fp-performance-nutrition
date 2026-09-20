import type { Business } from "@/types/database";

export const TRIAL_DAYS = 7;

// Único lugar que decide si un negocio tiene derecho a que Bora responda
// mensajes de WhatsApp. Nunca se calcula "a mano" en otro archivo — si el
// número de días de prueba cambia algún día, este es el único sitio que se
// toca.
export function hasActiveAccess(business: Pick<Business, "status" | "trial_ends_at">): boolean {
  if (business.status === "active") return true;
  if (business.status !== "trial") return false; // paused, cancelled
  if (!business.trial_ends_at) return false; // negocio viejo sin trial_ends_at asignado
  return new Date(business.trial_ends_at).getTime() > Date.now();
}

export function trialDaysRemaining(
  business: Pick<Business, "status" | "trial_ends_at">
): number {
  if (business.status !== "trial" || !business.trial_ends_at) return 0;
  const remainingMs = new Date(business.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}

export function isTrialExpired(business: Pick<Business, "status" | "trial_ends_at">): boolean {
  return business.status === "trial" && !hasActiveAccess(business);
}
