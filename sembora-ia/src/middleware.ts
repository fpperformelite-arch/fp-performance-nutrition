import { NextResponse, type NextRequest } from "next/server";

// El middleware corre en el runtime Edge, que no puede abrir conexiones TCP
// a Postgres (pg/Kysely necesitan Node.js runtime). Por eso aquí solo se
// hace una verificación barata — "¿existe la cookie de sesión?" — para
// evitar el flash de una página protegida antes del redirect. La
// verificación real y autoritativa (¿la sesión sigue siendo válida en la
// tabla `sessions`?) ocurre en requireBusinessContext(), que corre en cada
// Server Component / Server Action con acceso completo a la base de datos.
const SESSION_COOKIE = "sembora_session";

export function middleware(request: NextRequest) {
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/onboarding");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isPublicRoute = request.nextUrl.pathname === "/";
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && !isAuthRoute && !isApiRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
