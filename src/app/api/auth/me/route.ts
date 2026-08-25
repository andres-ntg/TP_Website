import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export const runtime = "nodejs";

// Reemplaza el /auth/profile auto-montado del SDK: ese endpoint entra en un
// loop de redirects (bug conocido de @auth0/nextjs-auth0 v4 con Turbopack,
// ver https://github.com/auth0/nextjs-auth0/discussions relacionadas a
// trailing slash en rutas auto-montadas). auth0.getSession() ya es el
// mecanismo confiable que usa el resto de la app.
export async function GET() {
  const session = await auth0.getSession();

  if (!session?.user) {
    return NextResponse.json(null, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(session.user, {
    headers: { "Cache-Control": "no-store" },
  });
}
