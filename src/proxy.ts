import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

export async function proxy(request: Request) {
  const url = new URL(request.url);
  const isAuthLogin = url.pathname === "/auth/login";
  const isAuthLogout = url.pathname === "/auth/logout";
  const loginMarker = url.searchParams.get("ntgSound");

  if (isAuthLogin || isAuthLogout) {
    const currentLocale = url.searchParams.get("ui_locales");
    const needsLocale = currentLocale !== "es-419";
    const needsMarker = isAuthLogin && loginMarker !== "1";

    if (needsLocale || needsMarker) {
      if (needsLocale) {
        url.searchParams.set("ui_locales", "es-419");
      }

      if (needsMarker) {
        url.searchParams.set("ntgSound", "1");
      }

      const redirectResponse = NextResponse.redirect(url, 307);

      if (isAuthLogin) {
        redirectResponse.cookies.set("ntg_login_sound", "1", {
          path: "/",
          sameSite: "lax",
          secure: true,
          maxAge: 60 * 10,
        });
      }

      return redirectResponse;
    }
  }

  return await auth0.middleware(request);
}

export const config = {
  matcher: ["/auth/:path*"],
};
