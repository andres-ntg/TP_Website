import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth0 } from "@/lib/auth0";
import { getSuperAgentDb } from "@/lib/mongodb";
import type { Page } from "puppeteer-core";
import { getPdfBrowser } from "@/lib/pdf-browser";
import {
  renderTarifarioPdfHtml,
  safeTarifarioPdfFileName,
  type TarifarioPdfPayload,
  type TarifarioPdfRateTable,
} from "@/lib/tarifario-pdf-template";

type TarifarioCountry = {
  nombre: string;
  codigo: string;
};

type TarifarioRegion = {
  nombre: string;
  codigo: string;
};

export const runtime = "nodejs";

type TarifarioDoc = {
  _id: ObjectId;
  type?: "Paquete" | "Tarifario";
  title?: string;
  dates?: string;
  validity?: string;
  destinations?: string;
  countries?: Array<string | TarifarioCountry>;
  regions?: Array<string | TarifarioRegion>;
  itinerary?: string;
  itineraryDays?: Array<{
    title?: string;
    content?: string;
  }>;
  includes?: string;
  notIncludes?: string;
  hotelsDetails?: string;
  notes?: string;
  rates?: string;
  priceFrom?: string;
  rateTables?: TarifarioPdfRateTable[];
  images?: Array<{
    url?: string;
  }>;
};

const TARIFARIO_PDF_FALLBACK_HERO_IMAGE_URL =
  "https://www.flyingmag.com/wp-content/uploads/2022/06/AdobeStock_249454423-scaled-1.jpeg";

const FALLBACK_IMAGE_DATA_URI =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwMCIgaGVpZ2h0PSI5MDAiIHZpZXdCb3g9IjAgMCAxNjAwIDkwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwMCIgaGVpZ2h0PSI5MDAiIGZpbGw9IiNGOEZBRkMiLz48cGF0aCBkPSJNMCA2ODBDMjYwIDU3MCA0MDAgNjcwIDY0MCA1ODBDODQwIDUwNSAxMDQwIDMxMCAxMjgwIDM5MEMxNDIwIDQzNiAxNTAwIDUyMCAxNjAwIDQ3MFY5MDBIMFoiIGZpbGw9IiNFN0VBRUUiLz48cGF0aCBkPSJNMCA1OTBDMTcwIDQzMCAzNjAgNDcwIDU1MCAzODBDNzQwIDI5MCA5MjAgMTMwIDExMTAgMjIwQzEzMjAgMzIwIDE0NDAgMjIwIDE2MDAgMTQwVjkwMEgweiIgZmlsbD0iI0Q5RERFNSIvPjxjaXJjbGUgY3g9IjEyNjAiIGN5PSIyMTAiIHI9IjkwIiBmaWxsPSIjRjFDNDBGIi8+PHBhdGggZD0iTTI0MCA2MTBIMTM2MEwxMjYwIDcyMEgzNDBMMjQwIDYxMFoiIGZpbGw9IiNGRkZGRkYiIGZpbGwtb3BhY2l0eT0iMC41NSIvPjwvc3ZnPg==";

const FALLBACK_LOGO_DATA_URI =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

async function imageUrlToDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la imagen hero: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = await response.arrayBuffer();

  return `data:${contentType};base64,${Buffer.from(buffer).toString("base64")}`;
}

async function loadLogoDataUri() {
  try {
    const logoPath = path.join(process.cwd(), "public", "imgs", "tp_logo.png");
    const buffer = await readFile(logoPath);

    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("[tarifario pdf logo]", error);
    return FALLBACK_LOGO_DATA_URI;
  }
}

async function resolveHeroImageDataUri(tarifario: TarifarioDoc) {
  const heroUrl =
    tarifario.images?.map((image) => image.url?.trim()).find(Boolean) ??
    TARIFARIO_PDF_FALLBACK_HERO_IMAGE_URL;

  try {
    return await imageUrlToDataUri(heroUrl);
  } catch (error) {
    console.error("[tarifario pdf hero]", error);
    return FALLBACK_IMAGE_DATA_URI;
  }
}

function buildPayload(
  tarifario: TarifarioDoc,
  heroImageDataUri: string,
  logoDataUri: string,
): TarifarioPdfPayload {
  return {
    id: tarifario._id.toString(),
    type: tarifario.type === "Tarifario" ? "Tarifario" : "Paquete",
    title: tarifario.title ?? "",
    dates: tarifario.dates ?? "",
    validity: tarifario.validity ?? "No aplica",
    destinations: tarifario.destinations ?? "",
    countries: tarifario.countries ?? [],
    regions: tarifario.regions ?? [],
    itinerary: tarifario.itinerary ?? "",
    itineraryDays: tarifario.itineraryDays?.map((day) => ({
      title: day.title ?? "",
      content: day.content ?? "",
    })),
    includes: tarifario.includes ?? "",
    notIncludes: tarifario.notIncludes ?? "",
    hotelsDetails: tarifario.hotelsDetails ?? "",
    notes: tarifario.notes ?? "",
    rates: tarifario.rates ?? "",
    priceFrom: tarifario.priceFrom ?? "",
    rateTables: tarifario.rateTables ?? [],
    heroImageDataUri,
    logoDataUri,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let page: Page | null = null;

  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const disposition =
      searchParams.get("disposition") === "attachment"
        ? "attachment"
        : "inline";

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const db = await getSuperAgentDb();
    const tarifario = (await db.collection("tarifarios").findOne({
      _id: new ObjectId(id),
    })) as TarifarioDoc | null;

    if (!tarifario) {
      return NextResponse.json(
        { error: "Tarifario no encontrado." },
        { status: 404 },
      );
    }

    const payload = buildPayload(
      tarifario,
      await resolveHeroImageDataUri(tarifario),
      await loadLogoDataUri(),
    );
    const renderedHtml = renderTarifarioPdfHtml(payload);

    const browser = await getPdfBrowser();
    page = await browser.newPage();
    await page.setContent(renderedHtml, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    await page.close();
    page = null;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${safeTarifarioPdfFileName(payload.title)}-${payload.id}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    if (page) {
      await page.close().catch(() => undefined);
    }

    const details = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json(
      { error: "Fallo al generar PDF del tarifario.", details },
      { status: 500 },
    );
  }
}
