import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { interpretTarifarioFiles } from "@/lib/tarifario-interpretation";
import { getVertexGeminiPublicErrorMessage } from "@/lib/vertex-gemini";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const apiKey =
      process.env.VERTEX_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key de Vertex no configurada." },
        { status: 500 },
      );
    }

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    const result = await interpretTarifarioFiles({ apiKey, files });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[tarifario interpret]", err);
    return NextResponse.json(
      {
        error: getVertexGeminiPublicErrorMessage(err),
      },
      { status: 500 },
    );
  }
}
