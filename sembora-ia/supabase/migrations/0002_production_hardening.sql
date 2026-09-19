-- Endurecimiento para producción: constraints que la aplicación ya
-- asume pero que hasta ahora solo se respetaban por convención en el
-- código. Se agregan como constraints reales de base de datos porque son
-- invariantes de negocio, no detalles de implementación — deben sostenerse
-- aunque el código de la app tenga un bug.

-- Un mismo mensaje de WhatsApp (wa_message_id) nunca debe registrarse dos
-- veces. Meta puede reintentar la entrega del webhook; el código ya hace
-- una verificación de idempotencia antes de procesar, esta constraint es
-- la red de seguridad a nivel de datos. Postgres permite múltiples NULL en
-- una columna UNIQUE, así que no afecta mensajes sin wa_message_id (por
-- ejemplo, si el envío saliente falló antes de obtener un ID de Meta).
alter table messages
  add constraint messages_wa_message_id_key unique (wa_message_id);

-- Dos negocios NUNCA deben compartir el mismo phone_number_id de WhatsApp:
-- el webhook usa ese campo para decidir a qué tenant pertenece cada
-- mensaje, así que si dos configs lo compartieran, los mensajes de un
-- negocio podrían mezclarse con los de otro. Mismo razonamiento sobre
-- NULLs: no afecta negocios que aún no han conectado WhatsApp.
alter table bora_configs
  add constraint bora_configs_whatsapp_phone_number_id_key unique (whatsapp_phone_number_id);
