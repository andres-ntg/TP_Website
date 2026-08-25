import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth0 } from "@/lib/auth0";
import {
  canArchiveTarifario,
  canViewArchivedTarifario,
  getCurrentUserSub,
} from "@/lib/auth-roles";
import { getSuperAgentDb } from "@/lib/mongodb";

type TarifarioArchiveDoc = {
  userSub: string;
  tarifarioId: string;
  archivedAt: Date;
};

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canArchiveTarifario(session)) {
    return NextResponse.json(
      { error: "No tienes permiso para archivar tarifarios." },
      { status: 403 },
    );
  }

  const userSub = getCurrentUserSub(session);
  if (!userSub) {
    return NextResponse.json({ error: "Usuario inválido." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    tarifarioId?: unknown;
  };
  const tarifarioId =
    typeof body.tarifarioId === "string" ? body.tarifarioId.trim() : "";

  if (!tarifarioId || !ObjectId.isValid(tarifarioId)) {
    return NextResponse.json({ error: "tarifarioId inválido." }, { status: 400 });
  }

  const db = await getSuperAgentDb();
  const exists = await db
    .collection("tarifarios")
    .findOne({ _id: new ObjectId(tarifarioId) }, { projection: { _id: 1 } });

  if (!exists) {
    return NextResponse.json(
      { error: "Tarifario no encontrado." },
      { status: 404 },
    );
  }

  await db.collection<TarifarioArchiveDoc>("tarifario_archives").updateOne(
    { tarifarioId },
    {
      $setOnInsert: {
        userSub,
        tarifarioId,
        archivedAt: new Date(),
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ success: true, tarifarioId });
}

export async function DELETE(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canViewArchivedTarifario(session)) {
    return NextResponse.json(
      { error: "No tienes permiso para desarchivar tarifarios." },
      { status: 403 },
    );
  }

  const tarifarioId = req.nextUrl.searchParams.get("tarifarioId")?.trim() ?? "";

  if (!tarifarioId || !ObjectId.isValid(tarifarioId)) {
    return NextResponse.json({ error: "tarifarioId inválido." }, { status: 400 });
  }

  const db = await getSuperAgentDb();
  await db
    .collection<TarifarioArchiveDoc>("tarifario_archives")
    .deleteMany({ tarifarioId });

  return NextResponse.json({ success: true, tarifarioId });
}
