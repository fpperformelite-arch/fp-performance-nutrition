import { google } from "googleapis";

export const GOOGLE_CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"];

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}
