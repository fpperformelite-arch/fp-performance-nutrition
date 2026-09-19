-- Plantilla para dar de alta UN negocio real conectado a un número de
-- WhatsApp real. Cópiala, reemplaza los placeholders `<...>` y córrela en
-- el SQL Editor de tu proyecto de Supabase (no se ejecuta automáticamente:
-- solo tú tienes los valores reales, así que nadie más puede rellenarla
-- por ti).
--
-- Antes de correr esto necesitas haber completado docs/whatsapp-setup.md
-- hasta el Paso 2 para tu número (obtener su phone_number_id) — sin eso,
-- Bora no podrá recibir ni enviar mensajes de este negocio.

-- 1. El negocio
insert into businesses (name, slug, industry_label, timezone)
values (
  '<Nombre real del negocio>',
  '<slug-unico-sin-espacios>',        -- ej. 'fp-performance-nutrition'
  '<Etiqueta libre, ej. "Entrenamiento personal">',
  'America/Mexico_City'
)
returning id;
-- ↑ copia el id que regresa esta consulta, lo necesitas en los siguientes pasos.

-- 2. Configuración de Bora para ese negocio
insert into bora_configs (
  business_id,
  assistant_name,
  welcome_message,
  whatsapp_phone_number_id,          -- el que Meta te dio al registrar 9932197862
  whatsapp_business_account_id,      -- tu WABA ID (el mismo para todos tus negocios)
  is_active
)
values (
  '<business_id del paso 1>',
  'Bora',
  '<Mensaje de bienvenida personalizado para este negocio>',
  '<phone_number_id de Meta para 9932197862>',
  '<whatsapp_business_account_id (WABA ID)>',
  true
);

-- 3. El dueño debe haber entrado UNA VEZ a /login (con su correo) para que
--    exista en auth.users. Búscalo así:
select id, email from auth.users where email = '<correo del dueño>';

-- 4. Vincula al dueño con el negocio
insert into business_users (business_id, user_id, role, full_name)
values (
  '<business_id del paso 1>',
  '<user_id del paso 3>',
  'owner',
  '<Nombre del dueño>'
);

-- 5. (Opcional pero recomendado) da de alta al menos un servicio y una FAQ
--    para que Bora tenga algo que ofrecer desde el primer mensaje —
--    también se pueden agregar desde el panel en /settings.
insert into services (business_id, name, duration_minutes)
values ('<business_id del paso 1>', '<Nombre del servicio>', 30);

insert into faqs (business_id, question, answer, keywords)
values (
  '<business_id del paso 1>',
  '<Pregunta frecuente, ej. "¿Cuánto cuesta?">',
  '<Respuesta>',
  array['precio', 'costo', 'cuanto']
);
