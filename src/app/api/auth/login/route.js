import { auth0 } from "../../../../lib/auth0";

export const GET = async (req) => {
  return auth0.startInteractiveLogin({
    returnTo: req.nextUrl.searchParams.get("returnTo") ?? "/tarifario",
    authorizationParameters: {
      ui_locales: "es-419",
      audience: process.env.AUTH0_AUDIENCE,
    },
  });
};
