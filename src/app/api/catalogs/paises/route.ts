import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getCatalogCountries } from "@/lib/catalog-countries";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const countries = await getCatalogCountries();

    return NextResponse.json({
      countries: countries.map((country) => ({
        name: country.name,
        codigo: country.code,
        regionCodigo: country.regionCode,
      })),
    });
  } catch (error) {
    console.error("[catalogs paises GET]", error);
    return NextResponse.json(
      { error: "No se pudo cargar el catálogo de países." },
      { status: 500 },
    );
  }
}
