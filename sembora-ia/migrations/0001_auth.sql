-- Auth propia sobre Neon/Postgres plano (sin Supabase Auth).
-- Sesiones respaldadas en base de datos (no JWT stateless) para poder
-- revocar sesiones (logout, "cerrar sesión en todos los dispositivos")
-- sin depender de un secreto compartido ni de expiración ciega.

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id text primary key,                  -- token aleatorio de 256 bits (hex), es lo que va en la cookie
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_user on sessions(user_id);
create index if not exists idx_sessions_expires on sessions(expires_at);
