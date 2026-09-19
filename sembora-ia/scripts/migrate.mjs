// Corre las migraciones SQL de migrations/*.sql contra DATABASE_URL,
// llevando registro de cuáles ya se aplicaron en la tabla `_migrations`
// (así es seguro correr este script varias veces, incluso en cada deploy).
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL no está configurado.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  await client.query(`
    create table if not exists _migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const dir = path.join(process.cwd(), "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows: applied } = await client.query("select name from _migrations");
  const appliedSet = new Set(applied.map((r) => r.name));

  let appliedCount = 0;

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    console.log(`Aplicando ${file}...`);

    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into _migrations (name) values ($1)", [file]);
      await client.query("commit");
      appliedCount++;
    } catch (err) {
      await client.query("rollback");
      console.error(`Error aplicando ${file}:`, err.message);
      await client.end();
      process.exit(1);
    }
  }

  console.log(appliedCount > 0 ? `${appliedCount} migración(es) aplicada(s).` : "Migraciones al día, nada que aplicar.");
  await client.end();
}

main();
