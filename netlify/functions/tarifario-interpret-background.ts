import { processTarifarioInterpretJob } from "../../src/lib/tarifario-interpret-worker";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    jobId?: unknown;
    secret?: unknown;
  };
  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  const secret = typeof body.secret === "string" ? body.secret : "";

  if (!jobId || !secret) {
    return Response.json({ error: "Payload inválido." }, { status: 400 });
  }

  await processTarifarioInterpretJob({ jobId, secret });

  return Response.json({ ok: true });
}

export const config = {
  background: true,
  path: "/api/tarifario/interpret/background",
};
