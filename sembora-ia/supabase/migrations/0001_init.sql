-- SEMBORA IA — esquema inicial multi-tenant
-- Diseño: TODA la lógica del asistente "Bora" se controla por configuración
-- (bora_configs, services, faqs) por negocio. Nunca se debe bifurcar el
-- código de la aplicación por tipo de industria: si un gimnasio necesita
-- algo distinto de un consultorio, la diferencia vive en filas de estas
-- tablas, no en un "if industry === 'gym'" en el código.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- 1. NEGOCIOS (tenants)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,                 -- usado en URLs internas, subdominios futuros
  industry_label text,                       -- solo texto informativo/UI (ej. "Gimnasio"), NUNCA usado por la lógica del bot
  timezone text not null default 'America/Mexico_City',
  status text not null default 'trial'       -- trial | active | paused | cancelled
    check (status in ('trial','active','paused','cancelled')),
  plan text not null default 'pilot'         -- pilot | starter | pro (mapea a precios de Stripe después)
    check (plan in ('pilot','starter','pro')),
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. USUARIOS DEL NEGOCIO (roles) — vincula auth.users de Supabase a un tenant
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists business_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','staff')),
  full_name text,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists idx_business_users_user on business_users(user_id);
create index if not exists idx_business_users_business on business_users(business_id);

-- Helper: negocios a los que pertenece el usuario autenticado actual.
-- Se usa en TODAS las políticas RLS de abajo.
create or replace function auth_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from business_users where user_id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. CONFIGURACIÓN DE "BORA" POR NEGOCIO (1:1)
--    Aquí vive todo lo que hace que Bora se comporte distinto por cliente.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists bora_configs (
  business_id uuid primary key references businesses(id) on delete cascade,
  assistant_name text not null default 'Bora',
  tone text not null default 'amigable_profesional', -- etiqueta libre para el prompt del LLM
  welcome_message text not null default '¡Hola! Soy Bora 🤖, el asistente virtual. ¿En qué puedo ayudarte hoy?',
  language text not null default 'es',
  business_hours jsonb not null default '{
    "mon": [["09:00","18:00"]], "tue": [["09:00","18:00"]], "wed": [["09:00","18:00"]],
    "thu": [["09:00","18:00"]], "fri": [["09:00","18:00"]], "sat": [], "sun": []
  }'::jsonb,
  booking_buffer_minutes int not null default 15,   -- colchón entre citas
  min_notice_minutes int not null default 60,       -- no agendar citas con menos de X min de anticipación
  max_days_ahead int not null default 30,            -- horizonte de agendado
  requires_confirmation boolean not null default false, -- si true, staff debe confirmar manualmente
  -- Integraciones (los tokens reales NUNCA se guardan en texto plano aquí en producción;
  -- ver nota de seguridad en ARCHITECTURE.md — para el piloto se referencian por Supabase Vault
  -- o variables de entorno por negocio, aquí solo guardamos IDs no sensibles).
  whatsapp_phone_number_id text,
  whatsapp_business_account_id text,
  whatsapp_verify_token text,
  google_calendar_id text,
  -- Para el MVP se guarda aquí; en cuanto haya presupuesto, mover a
  -- Supabase Vault (`vault.create_secret`) y guardar solo el ID del secreto.
  google_refresh_token text,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. SERVICIOS ofrecidos por el negocio (genérico: aplica a cualquier giro)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,                 -- "Consulta inicial", "Plan mensual", "Corte + barba"
  description text,
  duration_minutes int not null default 30,
  price_cents int,
  currency text not null default 'MXN',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_services_business on services(business_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. PREGUNTAS FRECUENTES configurables por negocio
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  question text not null,
  answer text not null,
  keywords text[] not null default '{}',  -- palabras clave para el matcher del bot
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_faqs_business on faqs(business_id);
create index if not exists idx_faqs_keywords on faqs using gin(keywords);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. LEADS (contactos capturados por Bora u otros canales)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  full_name text,
  phone text not null,
  email text,
  interest text,                         -- qué servicio le interesa (texto libre o service_id)
  service_id uuid references services(id),
  status text not null default 'new'
    check (status in ('new','contacted','scheduled','customer','lost')),
  source text not null default 'whatsapp',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone)
);

create index if not exists idx_leads_business on leads(business_id);
create index if not exists idx_leads_status on leads(business_id, status);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. CONVERSACIONES (hilo de WhatsApp con un lead)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  channel text not null default 'whatsapp',
  status text not null default 'open' check (status in ('open','closed')),
  -- estado de la máquina de conversación de Bora (para saber en qué paso del
  -- flujo de captura/agendado va este lead). Genérico: no depende del giro.
  bot_state jsonb not null default '{"step": "greeting"}'::jsonb,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_conversations_business on conversations(business_id);
create index if not exists idx_conversations_lead on conversations(lead_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 8. MENSAJES individuales dentro de una conversación
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  sender_type text not null check (sender_type in ('lead','bora','staff')),
  content text not null,
  wa_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_messages_business on messages(business_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 9. CITAS agendadas (sincronizadas con Google Calendar)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  service_id uuid references services(id),
  staff_user_id uuid references business_users(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked'
    check (status in ('booked','confirmed','cancelled','completed','no_show')),
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_business on appointments(business_id, starts_at);
create index if not exists idx_appointments_lead on appointments(lead_id);

-- ─────────────────────────────────────────────────────────────────────────
-- TRIGGERS: updated_at automático
-- ─────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_businesses_updated before update on businesses
  for each row execute function set_updated_at();
create trigger trg_leads_updated before update on leads
  for each row execute function set_updated_at();
create trigger trg_appointments_updated before update on appointments
  for each row execute function set_updated_at();
create trigger trg_bora_configs_updated before update on bora_configs
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — aislamiento estricto entre tenants
-- ─────────────────────────────────────────────────────────────────────────
alter table businesses enable row level security;
alter table business_users enable row level security;
alter table bora_configs enable row level security;
alter table services enable row level security;
alter table faqs enable row level security;
alter table leads enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table appointments enable row level security;

-- businesses: solo miembros pueden verlo/editarlo; solo el owner puede editar datos del negocio
create policy "members can view their business" on businesses
  for select using (id in (select auth_business_ids()));
create policy "owners can update their business" on businesses
  for update using (
    id in (select business_id from business_users where user_id = auth.uid() and role = 'owner')
  );

-- business_users: los miembros del negocio pueden verse entre sí; solo el owner administra staff
create policy "members can view business_users" on business_users
  for select using (business_id in (select auth_business_ids()));
create policy "owners manage business_users" on business_users
  for all using (
    business_id in (select business_id from business_users where user_id = auth.uid() and role = 'owner')
  );

-- Tablas simples con patrón "todo miembro puede leer, staff+owner puede escribir"
create policy "members can view bora_configs" on bora_configs
  for select using (business_id in (select auth_business_ids()));
create policy "members can manage bora_configs" on bora_configs
  for all using (business_id in (select auth_business_ids()));

create policy "members can view services" on services
  for select using (business_id in (select auth_business_ids()));
create policy "members can manage services" on services
  for all using (business_id in (select auth_business_ids()));

create policy "members can view faqs" on faqs
  for select using (business_id in (select auth_business_ids()));
create policy "members can manage faqs" on faqs
  for all using (business_id in (select auth_business_ids()));

create policy "members can view leads" on leads
  for select using (business_id in (select auth_business_ids()));
create policy "members can manage leads" on leads
  for all using (business_id in (select auth_business_ids()));

create policy "members can view conversations" on conversations
  for select using (business_id in (select auth_business_ids()));
create policy "members can manage conversations" on conversations
  for all using (business_id in (select auth_business_ids()));

create policy "members can view messages" on messages
  for select using (business_id in (select auth_business_ids()));
create policy "members can manage messages" on messages
  for all using (business_id in (select auth_business_ids()));

create policy "members can view appointments" on appointments
  for select using (business_id in (select auth_business_ids()));
create policy "members can manage appointments" on appointments
  for all using (business_id in (select auth_business_ids()));

-- NOTA: las rutas de servidor que reciben el webhook de WhatsApp usan la
-- service_role key (bypassa RLS) porque no hay un usuario autenticado de
-- Supabase en ese contexto — la validan por firma de Meta, no por RLS.
