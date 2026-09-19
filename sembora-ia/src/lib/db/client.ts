import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { DB } from "./schema";

// Conexión a Neon/Postgres. Usa un Pool pequeño porque en Vercel
// (serverless) cada instancia de función abre su propio pool — con Neon
// conviene usar la connection string "pooled" (la que trae `-pooler` en el
// host) para no agotar conexiones directas a Postgres. Ver README.
const connectionString = process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var __semboraPgPool: Pool | undefined;
}

function createPool(): Pool {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL no está configurado. Copia .env.example a .env.local y define tu connection string de Neon."
    );
  }

  return new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    max: 5,
  });
}

// En desarrollo, Next.js recarga módulos en caliente; cachear el pool en
// `global` evita abrir decenas de conexiones nuevas por cada recarga.
const pool =
  process.env.NODE_ENV === "production" ? createPool() : (global.__semboraPgPool ??= createPool());

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
});
