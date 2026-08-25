import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getCurrentUserSub } from "@/lib/auth-roles";
import { createTarifarioInterpretJob } from "@/lib/tarifario-interpret-jobs";
import { processTarifarioInterpretJob } from "@/lib/tarifario-interpret-worker";

export const runtime = "nodejs";

async function triggerBackgroundJob(req: NextRequest, jobId: string, secret: string) {
  const backgroundUrl = new URL(
    "/api/tarifario/interpret/background",
    req.nextUrl.origin,
  );
  const response = await fetch(backgroundUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, secret }),
  });

  if (!response.ok && response.status !== 202) {
    throw new Error(`No se pudo iniciar el procesamiento (${response.status}).`);
  }
}

function shouldUseBackgroundJob(req: NextRequest) {
  return (
    process.env.NETLIFY === "true" ||
    req.nextUrl.hostname.endsWith(".netlify.app")
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    const userSub = getCurrentUserSub(session);

    if (!session?.user || !userSub) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);
    const job = await createTarifarioInterpretJob({ userSub, files });

    if (shouldUseBackgroundJob(req)) {
      await triggerBackgroundJob(req, job.jobId, job.secret);

      return NextResponse.json(
        { jobId: job.jobId, status: "queued" },
        { status: 202 },
      );
    }

    await processTarifarioInterpretJob(job);

    return NextResponse.json({ jobId: job.jobId, status: "done" });
  } catch (error) {
    console.error("[tarifario interpret start]", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo iniciar la interpretación.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
