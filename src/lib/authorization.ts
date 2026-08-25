import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export function redirectUnauthorized() {
  redirect("/unauthorized");
}

function expectsHtml(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  const secFetchMode = request.headers.get("sec-fetch-mode") ?? "";
  const secFetchDest = request.headers.get("sec-fetch-dest") ?? "";

  return (
    accept.includes("text/html") ||
    secFetchMode === "navigate" ||
    secFetchDest === "document"
  );
}

export function unauthorizedApiResponse(
  request: Request | NextRequest,
  message = "No autorizado",
) {
  if (expectsHtml(request)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url), 307);
  }

  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenApiResponse(
  request: Request | NextRequest,
  message = "No tienes permiso para acceder a este recurso.",
) {
  if (expectsHtml(request)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url), 307);
  }

  return NextResponse.json({ error: message }, { status: 403 });
}
