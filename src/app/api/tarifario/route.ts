import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { auth0 } from "@/lib/auth0";
import {
  forbiddenApiResponse,
  unauthorizedApiResponse,
} from "@/lib/authorization";
import {
  canArchiveTarifario,
  canCreateTarifario,
  canDeleteTarifario,
  canManageTarifario,
  canViewArchivedTarifario,
  getNtgBranchId,
} from "@/lib/auth-roles";
import { getSuperAgentDb } from "@/lib/mongodb";
import {
  type TarifarioCountry,
  getCatalogCountries,
  normalizeCountriesFromCatalog,
} from "@/lib/catalog-countries";
import {
  type TarifarioRegion,
  getCatalogRegions,
  normalizeRegionsFromCatalog,
} from "@/lib/catalog-regions";
import { notifyNonTpUsersOfNewTarifario } from "@/lib/tarifario-notifications";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

class TarifarioValidationError extends Error {}

type TarifarioImage = {
  name: string;
  type: string;
  size: number;
  url: string;
};

type TarifarioRateTable = {
  title: string;
  subtitle: string;
  columns: string[];
  rows: string[][];
  notes: string[];
};

type TarifarioDoc = {
  type: "Paquete" | "Tarifario";
  title: string;
  dates: string;
  validity: string;
  destinations: string;
  countries: TarifarioCountry[];
  regions: TarifarioRegion[];
  itinerary: string;
  itineraryDays: Array<{
    key?: string;
    title: string;
    content: string;
  }>;
  includes: string;
  notIncludes: string;
  hotelsDetails: string;
  notes: string;
  rates: string;
  priceFrom: string;
  rateTables: TarifarioRateTable[];
  images: TarifarioImage[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  createdByUser: {
    sub?: string;
    name?: string;
    email?: string;
    picture?: string;
  } | null;
  branchId?: string | null;
};

type TarifarioArchiveDoc = {
  userSub: string;
  tarifarioId: string;
  archivedAt: Date;
};

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildCreatorFromSessionUser(user: Record<string, unknown> | undefined) {
  if (!user) return null;

  const sub = getOptionalString(user.sub);
  const name = getOptionalString(user.name) || getOptionalString(user.nickname);
  const email = getOptionalString(user.email);
  const picture = getOptionalString(user.picture);

  if (!sub && !name && !email) return null;

  return { sub, name, email, picture };
}

function getRequiredText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTarifarioType(
  value: FormDataEntryValue | null,
): TarifarioDoc["type"] {
  return value === "Tarifario" ? "Tarifario" : "Paquete";
}

function parseItineraryDays(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    const days: Array<{ key?: string; title: string; content: string }> = [];

    parsed.forEach((item) => {
      if (!item || typeof item !== "object") return;

      const day = item as Record<string, unknown>;
      const title = getOptionalString(day.title);
      const content = getOptionalString(day.content);
      const key = getOptionalString(day.key);
      if (!title || !content) return;

      days.push({
        ...(key ? { key } : {}),
        title,
        content,
      });
    });

    return days;
  } catch {
    return [];
  }
}

function parseExistingImages(value: FormDataEntryValue | null): TarifarioImage[] {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const image = item as Record<string, unknown>;
        const url = getOptionalString(image.url);
        if (!url) return null;

        return {
          name: getOptionalString(image.name) ?? "imagen",
          type: getOptionalString(image.type) ?? "image/*",
          size:
            typeof image.size === "number" && Number.isFinite(image.size)
              ? image.size
              : 0,
          url,
        };
      })
      .filter((image): image is TarifarioImage => Boolean(image));
  } catch {
    return [];
  }
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map(normalizeText).filter(Boolean);
}

function isEmptyPriceCell(value: string) {
  return ["", "-", "—", "–", "n/a", "na", "no aplica"].includes(
    value.trim().toLowerCase(),
  );
}

function looksLikeDateRange(value: string) {
  return /\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\s*[-–—]\s*\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?/i.test(
    value,
  );
}

function mergeGroupedDateRows(rows: string[][]) {
  const merged: string[][] = [];

  rows.forEach((row) => {
    const firstCell = row[0] ?? "";
    const hasOnlyDate =
      looksLikeDateRange(firstCell) && row.slice(1).every(isEmptyPriceCell);
    const previous = merged[merged.length - 1];
    const previousHasPrices = previous
      ?.slice(1)
      .some((cell) => !isEmptyPriceCell(cell));

    if (hasOnlyDate && previous && previousHasPrices) {
      previous[0] = [previous[0], firstCell].filter(Boolean).join("\n");
      return;
    }

    merged.push(row);
  });

  return merged;
}

function parseRateTables(value: FormDataEntryValue | null): TarifarioRateTable[] {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;

        const table = item as Record<string, unknown>;
        const columns = normalizeStringArray(table.columns);
        const rawRows = Array.isArray(table.rows) ? table.rows : [];
        const rows = rawRows
          .map((row) => normalizeStringArray(row))
          .filter((row) => row.length > 0);

        if (columns.length === 0 || rows.length === 0) return null;

        return {
          title: normalizeText(table.title),
          subtitle: normalizeText(table.subtitle),
          columns,
          rows: mergeGroupedDateRows(
            rows.map((row) =>
              columns.map((_, index) => normalizeText(row[index] ?? "")),
            ),
          ),
          notes: normalizeStringArray(table.notes),
        };
      })
      .filter((table): table is TarifarioRateTable => Boolean(table));
  } catch {
    return [];
  }
}

function parseCatalogValues(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(/[,;\n]+/);
  }
}

function inferCurrency(source: string) {
  if (/\bMXN\b/i.test(source)) return "MXN";
  if (/\bUSD\b/i.test(source)) return "$";
  if (/\bEUR\b/i.test(source)) return "EUR";
  if (/\bGTQ\b/i.test(source)) return "Q";
  if (/\bQ\s*[\d,.]+/.test(source)) return "Q";
  if (/\$\s*[\d,.]+/.test(source)) return "$";
  if (/€\s*[\d,.]+/.test(source)) return "€";
  return "";
}

function parseAmount(value: string) {
  const cleaned = value.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  const amount = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

function formatPriceFrom(amount: number, currency: string) {
  const formatted = amount.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

  if (!currency) return formatted;
  return ["$", "Q", "€"].includes(currency)
    ? `${currency}${formatted}`
    : `${currency} ${formatted}`;
}

function isDoubleOccupancyLabel(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  return /(?:^|\s)(dbl|doble|double|ocupacion doble|acomodacion doble)(?:\s|$)/.test(
    normalized,
  );
}

function extractPositiveAmounts(value: string) {
  return Array.from(
    value.matchAll(/(?:[$Q€]|MXN|USD|EUR|GTQ)?\s*[\d][\d,.]*/gi),
  )
    .map((match) => parseAmount(match[0]))
    .filter((amount): amount is number => amount !== null && amount > 0);
}

function collectDoubleOccupancyAmounts(rateTables: TarifarioRateTable[]) {
  const amounts: number[] = [];

  rateTables.forEach((table) => {
    const doubleColumnIndexes = table.columns
      .map((column, index) => (isDoubleOccupancyLabel(column) ? index : -1))
      .filter((index) => index >= 0);

    table.rows.forEach((row) => {
      doubleColumnIndexes.forEach((index) => {
        amounts.push(...extractPositiveAmounts(row[index] ?? ""));
      });

      row.forEach((cell, index) => {
        if (!isDoubleOccupancyLabel(cell)) return;
        amounts.push(...extractPositiveAmounts(cell));
        amounts.push(...extractPositiveAmounts(row[index + 1] ?? ""));
      });
    });
  });

  return amounts;
}

function inferPriceFrom(
  rates: string,
  rateTables: TarifarioRateTable[],
  explicitPriceFrom: string,
) {
  if (explicitPriceFrom) return explicitPriceFrom;

  const tableSource = rateTables
    .flatMap((table) => [
      table.title,
      table.subtitle,
      ...table.columns,
      ...table.rows.flat(),
      ...table.notes,
    ])
    .join("\n");
  const source = [rates, tableSource].filter(Boolean).join("\n");
  const currency = inferCurrency(source);
  const doubleOccupancyAmounts = collectDoubleOccupancyAmounts(rateTables);
  const amounts =
    doubleOccupancyAmounts.length > 0
      ? doubleOccupancyAmounts
      : extractPositiveAmounts(tableSource || rates);

  if (amounts.length === 0) return "";
  return formatPriceFrom(Math.min(...amounts), currency);
}

async function uploadTarifarioImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Solo se permiten imagenes.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Cada imagen no debe superar 10 MB.");
  }

  const host = process.env.SFTP_HOST;
  const port = parseInt(process.env.SFTP_PORT ?? "22", 10);
  const username = process.env.SFTP_USER;
  const password = process.env.SFTP_PASSWORD;
  const remoteDir = process.env.SFTP_REMOTE_DIR ?? "/uploads";
  const baseUrl = process.env.FILES_BASE_URL ?? "";

  if (!host || !username || !password || !baseUrl) {
    throw new Error("Configuracion de servidor de imagenes no disponible.");
  }

  const ext = path.extname(file.name || "") || ".jpg";
  const filename = `tarifario-${Date.now()}-${crypto.randomUUID()}${ext}`;
  const remotePath = `${remoteDir}/${filename}`;
  const fileUrl = `${baseUrl}${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const SftpClient =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("ssh2-sftp-client") as typeof import("ssh2-sftp-client");
  const sftp = new SftpClient();

  await sftp.connect({ host, port, username, password });
  try {
    await sftp.put(buffer, remotePath);
  } finally {
    await sftp.end();
  }

  return {
    name: file.name,
    type: file.type,
    size: file.size,
    url: fileUrl,
  };
}

async function buildTarifarioPayload(formData: FormData) {
  const type = normalizeTarifarioType(formData.get("type"));
  const title = getRequiredText(formData, "title");
  const dates = getRequiredText(formData, "dates");
  const validity = getRequiredText(formData, "validity") || "No aplica";
  const destinations = getRequiredText(formData, "destinations");
  const [countryCatalog, regionCatalog] = await Promise.all([
    getCatalogCountries(),
    getCatalogRegions(),
  ]);
  const countries = normalizeCountriesFromCatalog(
    parseCatalogValues(formData.get("countries")),
    countryCatalog,
  );
  const regions = normalizeRegionsFromCatalog(
    parseCatalogValues(formData.get("regions")),
    regionCatalog,
  );
  const itinerary = getRequiredText(formData, "itinerary");
  const rates = getRequiredText(formData, "rates");
  const rateTables = parseRateTables(formData.get("rateTables"));
  const priceFrom = inferPriceFrom(
    rates,
    rateTables,
    getRequiredText(formData, "priceFrom"),
  );

  if (!title || !dates || !destinations) {
    throw new TarifarioValidationError("Faltan campos requeridos.");
  }

  const imageFiles = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File);
  const uploadedImages = await Promise.all(imageFiles.map(uploadTarifarioImage));

  return {
    type,
    title,
    dates,
    validity,
    destinations,
    countries,
    regions,
    itinerary,
    itineraryDays: parseItineraryDays(formData.get("itineraryDays")),
    includes: getRequiredText(formData, "includes"),
    notIncludes: getRequiredText(formData, "notIncludes"),
    hotelsDetails: getRequiredText(formData, "hotelsDetails"),
    notes: getRequiredText(formData, "notes"),
    rates,
    priceFrom,
    rateTables,
    images: [
      ...parseExistingImages(formData.get("existingImages")),
      ...uploadedImages,
    ],
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return unauthorizedApiResponse(req);
    }

    const db = await getSuperAgentDb();
    const archivedOnly = req.nextUrl.searchParams.get("archived") === "1";
    const canViewArchived = canViewArchivedTarifario(session);
    if (archivedOnly && !canViewArchived) {
      return forbiddenApiResponse(
        req,
        "No tienes permiso para visualizar archivados.",
      );
    }

    const archivedIds = new Set(
      (
        await db
          .collection<TarifarioArchiveDoc>("tarifario_archives")
          .find({})
          .project<{ tarifarioId: string }>({ tarifarioId: 1, _id: 0 })
          .toArray()
      ).map((archive) => archive.tarifarioId),
    );
    const docs = await db
      .collection<TarifarioDoc>("tarifarios")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    const visibleDocs = docs.filter((doc) =>
      archivedOnly
        ? archivedIds.has(doc._id.toString())
        : !archivedIds.has(doc._id.toString()),
    );

    return NextResponse.json({
      archived: archivedOnly,
      permissions: {
        canArchiveTarifario: canArchiveTarifario(session),
        canCreateTarifario: canCreateTarifario(session),
        canManageTarifario: canManageTarifario(session),
        canDeleteTarifario: canDeleteTarifario(session),
        canViewArchivedTarifario: canViewArchived,
      },
      tarifarios: visibleDocs.map((doc) => ({
        ...doc,
        id: doc._id?.toString(),
        _id: undefined,
      })),
    });
  } catch (err) {
    console.error("[tarifario GET]", err);
    return NextResponse.json(
      { error: "Error interno al cargar tarifarios." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return unauthorizedApiResponse(req);
    }
    if (!canCreateTarifario(session)) {
      return forbiddenApiResponse(
        req,
        "No tienes permiso para crear tarifarios.",
      );
    }

    const payload = await buildTarifarioPayload(await req.formData());
    const now = new Date();

    const doc: TarifarioDoc = {
      ...payload,
      createdAt: now,
      updatedAt: now,
      createdBy: getOptionalString(session.user.sub),
      createdByUser: buildCreatorFromSessionUser(
        session.user as Record<string, unknown> | undefined,
      ),
      branchId: getNtgBranchId(session),
    };

    const db = await getSuperAgentDb();
    await db
      .collection<TarifarioDoc>("tarifarios")
      .createIndex({ createdAt: -1 });
    const result = await db.collection<TarifarioDoc>("tarifarios").insertOne(doc);
    const tarifarioId = result.insertedId.toString();

    try {
      await notifyNonTpUsersOfNewTarifario({
        tarifarioId,
        title: doc.title,
        destinations: doc.destinations,
        dates: doc.dates,
        createdBySub: doc.createdBy ?? null,
      });
    } catch (error) {
      console.error("[tarifario POST] No se pudieron enviar notificaciones", {
        tarifarioId,
        error,
      });
    }

    return NextResponse.json(
      {
        tarifario: {
          ...doc,
          id: tarifarioId,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[tarifario POST]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error interno al guardar tarifario.",
      },
      { status: err instanceof TarifarioValidationError ? 400 : 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return unauthorizedApiResponse(req);
    }
    if (!canManageTarifario(session)) {
      return forbiddenApiResponse(
        req,
        "No tienes permiso para editar tarifarios.",
      );
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    }

    const payload = await buildTarifarioPayload(await req.formData());
    const db = await getSuperAgentDb();
    const result = await db.collection<TarifarioDoc>("tarifarios").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...payload,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Tarifario no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[tarifario PUT]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error interno al actualizar tarifario.",
      },
      { status: err instanceof TarifarioValidationError ? 400 : 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return unauthorizedApiResponse(req);
    }
    if (!canDeleteTarifario(session)) {
      return forbiddenApiResponse(
        req,
        "No tienes permiso para eliminar tarifarios.",
      );
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    }

    const db = await getSuperAgentDb();
    const result = await db
      .collection<TarifarioDoc>("tarifarios")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Tarifario no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[tarifario DELETE]", err);
    return NextResponse.json(
      { error: "Error interno al eliminar tarifario." },
      { status: 500 },
    );
  }
}
