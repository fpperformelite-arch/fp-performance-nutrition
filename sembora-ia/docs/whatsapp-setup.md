# Configurar WhatsApp Cloud API (paso a paso)

Ya tienes un número verificado con Meta, así que partimos de ahí. Esto lo
haces **tú directamente en Meta for Developers** — el código de este repo
solo consume lo que configures aquí.

## Paso 0 — Qué vas a necesitar al final

Al terminar esta guía tendrás estos valores:

| Valor | Dónde se usa | Alcance |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` (token permanente) | Variables de entorno de Vercel | Plataforma (uno solo, para todos los negocios) |
| `WHATSAPP_APP_SECRET` | Variables de entorno de Vercel | Plataforma — el webhook lo usa para verificar que cada mensaje entrante realmente venga de Meta |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (lo inventas tú) | Variables de entorno de Vercel | Plataforma |
| `phone_number_id` | `bora_configs.whatsapp_phone_number_id` | Por negocio (uno por número de WhatsApp) |
| `whatsapp_business_account_id` (WABA ID) | `bora_configs.whatsapp_business_account_id` | Por negocio (aunque el valor se repite: es tu misma cuenta) |

**Importante para el modelo multi-tenant:** el webhook identifica a qué
negocio pertenece cada mensaje leyendo el `phone_number_id` que Meta manda
en cada notificación. Eso significa que **cada negocio necesita su propio
número de WhatsApp**, aunque todos cuelguen de tu misma app y tu misma
cuenta de empresa (WABA) — dos negocios NUNCA deben compartir un
`phone_number_id` (de hecho, `supabase/migrations/0002_production_hardening.sql`
agrega una restricción en la base de datos que lo impide directamente).

La buena noticia: agregar números adicionales a tu misma WABA **no tiene
costo** y no requiere verificación de negocio para el piloto — cada número
solo pasa por una verificación rápida por SMS o llamada (un código de 6
dígitos), igual que cuando diste de alta tu primer número.

## Paso 1 — Crear la app en Meta for Developers

1. Entra a [developers.facebook.com/apps](https://developers.facebook.com/apps).
2. **Crear app** → tipo **"Business"**.
3. Ponle un nombre (ej. "SEMBORA IA").
4. En el dashboard de la app, busca el producto **WhatsApp** y da **Configurar**.

## Paso 2 — Vincular tu número (9932197862) y los de futuros negocios

1. Dentro de WhatsApp → **Configuración de la API → Números de teléfono**
   → **Añadir número de teléfono**, da de alta **9932197862**.
2. Copia el **Phone number ID** que aparece ahí — es un número largo
   (ej. `109876543210987`), distinto del número de teléfono en sí. Este es
   el valor que va en `bora_configs.whatsapp_phone_number_id` para el
   negocio que va a usar este número.
3. Copia también el **WhatsApp Business Account ID (WABA ID)**, visible en
   la misma pantalla o en **Configuración de la empresa → Cuentas → Cuentas
   de WhatsApp** — este es el mismo para todos los negocios que agregues
   después (es tu cuenta de empresa).
4. Cuando agregues un negocio nuevo al piloto, repites "Añadir número de
   teléfono" con el número de teléfono de ESE negocio — nunca reutilices el
   mismo `phone_number_id` para dos negocios (Paso 9).

## Paso 3 — Obtener el App Secret (necesario para producción, no opcional)

El webhook de este proyecto **verifica la firma de cada petición** antes de
tocar la base de datos (`X-Hub-Signature-256`), para que nadie pueda
enviarle mensajes falsos suplantando a Meta. Sin este valor configurado, el
webhook rechaza todo tráfico a propósito.

1. En el dashboard de tu app → **Configuración → Básica** (Settings → Basic).
2. Copia el campo **Clave secreta de la aplicación (App Secret)** — Meta te
   pide reautenticarte con tu contraseña para mostrarlo.
3. Este es tu `WHATSAPP_APP_SECRET`.

## Paso 4 — Generar un token de acceso permanente (System User)

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

## Paso 5 — Desplegar el proyecto para tener una URL pública

Meta necesita una URL HTTPS pública para el webhook — no puede apuntar a tu
`localhost`.

1. Sube este proyecto a Vercel (ver `README.md` → sección Deploy).
2. En **Settings → Environment Variables** de Vercel, agrega TODAS las
   variables de `.env.example`, incluyendo las tres de este documento
   (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`,
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN`).
3. Anota la URL que te da Vercel, ej. `https://sembora-ia.vercel.app`.
   El endpoint del webhook será:
   `https://sembora-ia.vercel.app/api/whatsapp/webhook`.

## Paso 6 — Configurar el Webhook en Meta

1. En tu app → **WhatsApp → Configuración**.
2. Sección **Webhook** → **Editar**.
3. **URL de devolución de llamada (Callback URL)**:
   `https://sembora-ia.vercel.app/api/whatsapp/webhook`
4. **Token de verificación**: escribe el mismo valor que pusiste en
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN` en Vercel (invéntate un string largo y
   aleatorio, ej. con `openssl rand -hex 32`).
5. Da clic en **Verificar y guardar**. Meta hace un `GET` a tu endpoint con
   `hub.mode=subscribe` — nuestro código responde el `hub.challenge` si el
   token coincide. Si falla, revisa que la variable de entorno esté bien
   puesta en Vercel y que hayas vuelto a desplegar después de agregarla.
6. En **Campos del webhook (Webhook fields)**, suscríbete al campo
   **`messages`** (es el único que necesitamos para el MVP).

## Paso 7 — Probar el flujo completo

1. Desde tu celular, mándale un WhatsApp a 9932197862.
2. En los logs de Vercel (`vercel logs` o el dashboard) deberías ver la
   petición `POST` entrando a `/api/whatsapp/webhook`.
3. Revisa en Supabase (tabla `messages`) que se haya guardado el mensaje
   entrante y la respuesta de Bora.
4. Deberías recibir la respuesta de Bora en tu WhatsApp en segundos.

Si no llega nada:
- Revisa los logs de Vercel: si ves `"Invalid signature"`, el
  `WHATSAPP_APP_SECRET` en Vercel no coincide con el de Meta — cópialo de
  nuevo del Paso 3.
- Si ves `"Server misconfigured"`, falta `WHATSAPP_APP_SECRET` o
  `WHATSAPP_ACCESS_TOKEN` en las variables de entorno de Vercel.
- Verifica que el negocio tenga una fila en `bora_configs` con
  `whatsapp_phone_number_id` exactamente igual al de Meta y `is_active = true`.
- Revisa que el `WHATSAPP_ACCESS_TOKEN` sea el del usuario de sistema con
  expiración "Nunca", no el token de prueba de 24h.
- Meta reintenta webhooks que no respondan `200` — el código ya es
  idempotente ante reintentos (no va a duplicar la respuesta), pero si el
  primer intento falló por un error real, revisa el `console.error` del
  route handler en los logs de Vercel.

## Paso 8 — Límites y costos que debes conocer

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

## Paso 9 — Cuando agregues un negocio nuevo al piloto

Por cada negocio nuevo:

1. Da de alta su número de teléfono en tu WABA (Paso 2) y anota su
   `phone_number_id` propio.
2. Usa `supabase/seed/onboard_business_template.sql` para crear su fila en
   `businesses`, `bora_configs` (con ESE `phone_number_id`), vincular al
   dueño y cargar sus primeros servicios/FAQs.
3. El dueño termina de configurar tono, horarios, servicios y FAQs desde el
   panel (`/settings`).

El `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` y el webhook son
compartidos por toda la plataforma (una sola app de Meta) — nunca cambian
por negocio.

---

## Checklist concreto para tu número (9932197862)

Esto es exactamente lo que falta de tu lado para dejar la integración
funcionando en producción con este número:

1. **`WHATSAPP_APP_SECRET`** → Meta for Developers → tu app → Configuración
   → Básica → "Clave secreta de la aplicación" → pégalo en Vercel
   (Settings → Environment Variables) como `WHATSAPP_APP_SECRET`.
2. **`WHATSAPP_ACCESS_TOKEN`** → generado en el Paso 4 (usuario de sistema)
   → pégalo en Vercel como `WHATSAPP_ACCESS_TOKEN`.
3. **`WHATSAPP_WEBHOOK_VERIFY_TOKEN`** → lo inventas tú (ej.
   `openssl rand -hex 32` en tu terminal) → pégalo en Vercel Y en el campo
   "Token de verificación" del webhook en Meta (Paso 6).
4. **`phone_number_id` de 9932197862** → obtenido en el Paso 2 → pégalo en
   Supabase, columna `bora_configs.whatsapp_phone_number_id`, en la fila
   del negocio que vas a conectar (usa
   `supabase/seed/onboard_business_template.sql` si aún no existe esa fila).
5. **`whatsapp_business_account_id` (WABA ID)** → obtenido en el Paso 2 →
   mismo lugar, columna `bora_configs.whatsapp_business_account_id`.
6. Confirma que esa fila de `bora_configs` tenga `is_active = true` — si
   no, el webhook la ignora a propósito.

En cuanto tengas esos 5 valores pegados en su lugar y hayas corrido las dos
migraciones SQL (`0001_init.sql` y `0002_production_hardening.sql`), el
sistema queda funcionando de extremo a extremo: alguien le escribe a
9932197862 por WhatsApp, Bora responde usando la configuración de ese
negocio, y todo queda registrado en `leads`/`conversations`/`messages`.
