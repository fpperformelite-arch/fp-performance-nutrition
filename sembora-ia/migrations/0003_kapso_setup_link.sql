-- Guarda el customer_id que Kapso asigna a cada negocio, para poder
-- generar Setup Links (onboarding de WhatsApp self-service) sin crear un
-- cliente de Kapso duplicado cada vez que el dueño le da a "Conectar
-- WhatsApp". Ver src/app/api/kapso/setup/route.ts.
alter table bora_configs add column if not exists kapso_customer_id text;
