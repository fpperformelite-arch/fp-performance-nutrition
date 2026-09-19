import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";

// Auth propia sobre Neon: la sesión es un token aleatorio guardado en la
// tabla `sessions` (no un JWT stateless), para poder revocarla en
// cualquier momento (logout) sin depender de que expire sola.
const SESSION_COOKIE = "sembora_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db
    .insertInto("sessions")
    .values({ id: token, user_id: userId, expires_at: expiresAt.toISOString() })
    .execute();

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await db.deleteFrom("sessions").where("id", "=", token).execute();
  }
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await db
    .selectFrom("sessions")
    .innerJoin("users", "users.id", "sessions.user_id")
    .select(["users.id as id", "users.email as email", "sessions.expires_at as expires_at"])
    .where("sessions.id", "=", token)
    .executeTakeFirst();

  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.deleteFrom("sessions").where("id", "=", token).execute();
    return null;
  }

  return { id: row.id, email: row.email };
}
