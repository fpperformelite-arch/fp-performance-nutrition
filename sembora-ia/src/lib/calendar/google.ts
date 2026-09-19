import { google } from "googleapis";

// Integración genérica con Google Calendar: cada negocio conecta SU propio
// calendario (OAuth) y guarda el refresh_token de forma segura (ver
// ARCHITECTURE.md, sección "Secretos por tenant"). Aquí solo se modela la
// interacción con la API — la lógica de negocio (duración de servicio,
// horarios, buffers) viene de bora_configs/services y se pasa como parámetro.

interface FreeBusyParams {
  refreshToken: string;
  calendarId: string;
  timeMinISO: string;
  timeMaxISO: string;
}

function getOAuthClient(refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function getBusySlots({
  refreshToken,
  calendarId,
  timeMinISO,
  timeMaxISO,
}: FreeBusyParams) {
  const auth = getOAuthClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMinISO,
      timeMax: timeMaxISO,
      items: [{ id: calendarId }],
    },
  });

  return res.data.calendars?.[calendarId]?.busy ?? [];
}

interface CreateEventParams {
  refreshToken: string;
  calendarId: string;
  summary: string;
  description?: string;
  startISO: string;
  endISO: string;
  timezone: string;
  attendeeEmail?: string;
}

export async function createCalendarEvent({
  refreshToken,
  calendarId,
  summary,
  description,
  startISO,
  endISO,
  timezone,
  attendeeEmail,
}: CreateEventParams) {
  const auth = getOAuthClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      start: { dateTime: startISO, timeZone: timezone },
      end: { dateTime: endISO, timeZone: timezone },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
    },
  });

  return res.data;
}
