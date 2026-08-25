import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getCatalogRegions } from "@/lib/catalog-regions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const regions = await getCatalogRegions();

    return NextResponse.json({
      regions: regions.map((region) => ({
        name: region.name,
        codigo: region.code,
      })),
    });
  } catch (error) {
    console.error("[catalogs regiones GET]", error);
    return NextResponse.json(
      { error: "No se pudo cargar el catálogo de regiones." },
      { status: 500 },
    );
  }
}
