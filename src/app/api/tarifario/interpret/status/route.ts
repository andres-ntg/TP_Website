import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getCurrentUserSub } from "@/lib/auth-roles";
import { getTarifarioInterpretJobForUser } from "@/lib/tarifario-interpret-jobs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    const userSub = getCurrentUserSub(session);

    if (!session?.user || !userSub) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const jobId = req.nextUrl.searchParams.get("jobId") ?? "";
    const job = await getTarifarioInterpretJobForUser({ jobId, userSub });

    if (!job) {
      return NextResponse.json(
        { error: "Interpretación no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      jobId,
      status: job.status,
      error: job.error ?? null,
      result: job.result ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[tarifario interpret status]", error);
    return NextResponse.json(
      { error: "No se pudo consultar la interpretación." },
      { status: 500 },
    );
  }
}
