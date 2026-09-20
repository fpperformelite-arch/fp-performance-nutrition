"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Transaction } from "kysely";
import { db } from "@/lib/db/client";
import type { DB } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { TRIAL_DAYS } from "@/lib/billing/trial";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Correo o contraseña inválidos." };
  }

  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("email", "=", parsed.data.email.toLowerCase())
    .executeTakeFirst();

  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return { error: "Correo o contraseña incorrectos." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const registerSchema = z.object({
  businessName: z.string().min(2, "El nombre del negocio es muy corto."),
  email: z.string().email("Correo inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export async function registerAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = registerSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { businessName, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const existing = await db
    .selectFrom("users")
    .select("id")
    .where("email", "=", email)
    .executeTakeFirst();

  if (existing) {
    return { error: "Ya existe una cuenta con ese correo. Inicia sesión en su lugar." };
  }

  const baseSlug = slugify(businessName) || "negocio";
  let slug = baseSlug;
  let attempt = 0;

  const passwordHash = await hashPassword(password);

  const newUserId = await db.transaction().execute(async (trx: Transaction<DB>) => {
    // Reintenta con un sufijo si el slug ya existe — evita una carrera
    // perfecta con SELECT-antes-de-INSERT, pero es suficiente para el
    // volumen de altas de negocio esperado (no es un flujo de alta frecuencia).
    let business;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        business = await trx
          .insertInto("businesses")
          .values({ name: businessName, slug, trial_ends_at: trialEndsAt.toISOString() })
          .returningAll()
          .executeTakeFirstOrThrow();
        break;
      } catch (err) {
        attempt += 1;
        if (attempt > 5) throw err;
        slug = `${baseSlug}-${attempt}`;
      }
    }

    const user = await trx
      .insertInto("users")
      .values({ email, password_hash: passwordHash })
      .returningAll()
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("business_users")
      .values({ business_id: business.id, user_id: user.id, role: "owner", full_name: null })
      .execute();

    await trx
      .insertInto("bora_configs")
      .values({
        business_id: business.id,
        welcome_message: `¡Hola! Soy Bora, el asistente de ${businessName} 🤖`,
      })
      .execute();

    return user.id;
  });

  // La sesión se crea DESPUÉS de que la transacción confirmó — createSession
  // usa la conexión global `db`, no `trx`, así que insertarla dentro de la
  // transacción podría violar la FK a `users` si corre antes del commit.
  await createSession(newUserId);

  redirect("/dashboard");
}
