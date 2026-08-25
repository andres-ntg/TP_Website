import { auth0 } from "../../../../lib/auth0";

export const GET = async (req) => {
  return auth0.middleware(req);
};
