# Configurar WhatsApp Cloud API (paso a paso)

Ya tienes un número verificado con Meta, así que partimos de ahí. Esto lo
haces **tú directamente en Meta for Developers** — el código de este repo
solo consume lo que configures aquí.

## Paso 0 — Qué vas a necesitar al final

Al terminar esta guía tendrás 4 valores que van a variables de entorno /
configuración por negocio:

| Valor | Dónde se usa |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` (token permanente) | `.env` del proyecto (compartido, plataforma) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (lo inventas tú) | `.env` del proyecto |
| `phone_number_id` | `bora_configs.whatsapp_phone_number_id` (por negocio) |
| `whatsapp_business_account_id` (WABA ID) | `bora_configs.whatsapp_business_account_id` (por negocio) |

**Importante para el modelo multi-tenant:** el webhook identifica a qué
negocio pertenece cada mensaje leyendo el `phone_number_id` que Meta manda
en cada notificación (ver `bora_configs.whatsapp_phone_number_id`). Eso
significa que **cada negocio necesita su propio número de WhatsApp**, aunque
todos cuelguen de tu misma app y tu misma cuenta de empresa (WABA) — dos
negocios NUNCA deben compartir un `phone_number_id`, o Bora no podrá saber
a cuál de los dos le está hablando el lead.

La buena noticia: agregar números adicionales a tu misma WABA **no tiene
costo** y no requiere verificación de negocio para el piloto — cada número
solo pasa por una verificación rápida por SMS o llamada (un código de 6
dígitos), igual que cuando diste de alta tu primer número. Así que para
cada negocio del piloto:

1. Pide un número de teléfono que ese negocio pueda usar exclusivamente
   para WhatsApp (puede ser un número de VoIP/eSIM barato o el fijo del
   negocio, siempre que pueda recibir el SMS/llamada de verificación).
2. Dalo de alta en tu misma app de Meta (paso 2 abajo), lo que te da un
   `phone_number_id` distinto por negocio.
3. Ese `phone_number_id` es lo único que cambia entre negocios en la tabla
   `bora_configs` — el resto de la configuración (token, webhook, código)
   es compartido para toda la plataforma.

## Paso 1 — Crear la app en Meta for Developers

1. Entra a [developers.facebook.com/apps](https://developers.facebook.com/apps).
2. **Crear app** → tipo **"Business"**.
3. Ponle un nombre (ej. "SEMBORA IA").
4. En el dashboard de la app, busca el producto **WhatsApp** y da **Configurar**.

## Paso 2 — Vincular tu número verificado (y uno por cada negocio del piloto)

1. Dentro de WhatsApp → **Configuración de la API → Números de teléfono**
   → **Añadir número de teléfono**, da de alta tu número ya verificado.
2. Copia el **Phone number ID** que aparece ahí — es un número largo
   (ej. `109876543210987`). Este es el valor que va en
   `bora_configs.whatsapp_phone_number_id` **para ese negocio en particular**.
3. Copia también el **WhatsApp Business Account ID (WABA ID)**, visible en
   la misma pantalla o en **Configuración de la empresa → Cuentas → Cuentas
   de WhatsApp** — este SÍ es el mismo para todos los negocios (es tu cuenta).
4. Repite "Añadir número de teléfono" por cada negocio del piloto, usando
   el número de teléfono de ESE negocio. Cada uno te da un
   `phone_number_id` distinto — anótalos, los vas a necesitar en el Paso 8.

## Paso 3 — Generar un token de acceso permanente (System User)

El token temporal de 24h que Meta te da por defecto en "Primeros pasos" NO
sirve para producción. Necesitas un token permanente:

1. Ve a [business.facebook.com/settings](https://business.facebook.com/settings)
   (Meta Business Suite → Configuración del negocio).
2. **Usuarios → Usuarios del sistema** → **Añadir** → crea un usuario de
   sistema con rol **Administrador**.
3. **Añadir activos** → selecciona tu app de WhatsApp y tu WABA → dales
   permiso de **Control total**.
4. En el usuario de sistema, **Generar nuevo token**:
   - App: la que creaste en el paso 1.
   - Permisos: marca `whatsapp_business_messaging` y
     `whatsapp_business_management`.
   - Expiración: **Nunca**.
5. Copia ese token — es tu `WHATSAPP_ACCESS_TOKEN`. Solo se muestra una vez,
   guárdalo ya en tu gestor de contraseñas y en las variables de entorno de
   Vercel (nunca lo subas al repo).

## Paso 4 — Desplegar el proyecto para tener una URL pública

Meta necesita una URL HTTPS pública para el webhook — no puede apuntar a tu
`localhost`. Antes de configurar el webhook:

1. Sube este proyecto a Vercel (ver `README.md` → sección Deploy).
2. Configura ahí las variables de entorno (`.env.example` tiene la lista).
3. Anota la URL que te da Vercel, ej. `https://sembora-ia.vercel.app`.
   El endpoint del webhook será:
   `https://sembora-ia.vercel.app/api/whatsapp/webhook`.

## Paso 5 — Configurar el Webhook en Meta

1. En tu app → **WhatsApp → Configuración**.
2. Sección **Webhook** → **Editar**.
3. **URL de devolución de llamada (Callback URL)**:
   `https://sembora-ia.vercel.app/api/whatsapp/webhook`
4. **Token de verificación**: escribe el mismo valor que pusiste en
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN` en tus variables de entorno de Vercel
   (invéntate un string largo y aleatorio, ej. con
   `openssl rand -hex 32`).
5. Da clic en **Verificar y guardar**. Meta hace un `GET` a tu endpoint con
   `hub.mode=subscribe` — nuestro código en
   `src/app/api/whatsapp/webhook/route.ts` responde el `hub.challenge` si
   el token coincide. Si falla, revisa que la variable de entorno esté bien
   puesta en Vercel y que hayas vuelto a desplegar después de agregarla.
6. En **Campos del webhook (Webhook fields)**, suscríbete al campo
   **`messages`** (es el único que necesitamos para el MVP).

## Paso 6 — Probar el flujo completo

1. Desde tu celular, mándale un WhatsApp a tu número de negocio.
2. En los logs de Vercel (`vercel logs` o el dashboard) deberías ver la
   petición `POST` entrando a `/api/whatsapp/webhook`.
3. Revisa en Supabase (tabla `messages`) que se haya guardado el mensaje
   entrante y la respuesta de Bora.
4. Deberías recibir la respuesta de Bora en tu WhatsApp en segundos.

Si no llega nada:
- Verifica que el negocio de prueba tenga una fila en `bora_configs` con
  `whatsapp_phone_number_id` exactamente igual al de Meta y `is_active = true`.
- Revisa que el `WHATSAPP_ACCESS_TOKEN` no haya expirado (los tokens de
  System User con expiración "Nunca" no deberían expirar, pero revisa
  que se haya usado ese tipo y no el de "Prueba rápida").
- Meta reintenta webhooks que no respondan `200` — revisa el log de errores
  de Vercel para ver el `console.error` del route handler.

## Paso 7 — Límites y costos que debes conocer

- **Ventana de 24 horas**: solo puedes responder libremente (mensajes de
  texto normales, como hace Bora) dentro de las 24h desde el último mensaje
  del usuario. Pasado ese tiempo, para volver a escribirle primero
  necesitas un **mensaje de plantilla** aprobado por Meta — esto no está
  implementado en el MVP porque el flujo de Bora siempre responde dentro de
  esa ventana (reacciona a mensajes entrantes).
- **Costos**: las conversaciones que **inicia el usuario** (como cuando
  alguien le escribe a Bora) son gratuitas. Solo se cobran las
  conversaciones que **inicia el negocio** fuera de la ventana de 24h
  (vía plantillas) — irrelevante para el piloto tal como está diseñado.
- **Verificación de la empresa (Business Verification)**: no es
  obligatoria para probar con números limitados, pero Meta la pide para
  levantar límites de mensajería (de "Tier 1" con ~250 destinatarios/día a
  niveles superiores). Si el piloto crece, hazla en **Meta Business Suite →
  Centro de seguridad → Verificación de la empresa**.

## Paso 8 — Cuando agregues un negocio nuevo al piloto

Por cada negocio nuevo:

1. Da de alta su número de teléfono en tu WABA (Paso 2) y anota su
   `phone_number_id` propio.
2. Crea la fila en `businesses`.
3. Crea la fila en `bora_configs` con ESE `whatsapp_phone_number_id`, y
   personaliza `assistant_name`, `welcome_message`, `business_hours`, etc.
4. Da de alta sus `services` y `faqs` desde el panel (`/settings`, como
   owner de ese negocio).

El `WHATSAPP_ACCESS_TOKEN` y el webhook son compartidos por toda la
plataforma (una sola app de Meta) — nunca cambian por negocio. Cuando el
negocio quiera migrar a un número que administre él mismo (por ejemplo, ya
con verificación de empresa propia), el único cambio es actualizar su
`phone_number_id` en `bora_configs` — el código no cambia.
