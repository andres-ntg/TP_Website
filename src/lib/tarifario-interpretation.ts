import {
  fetchVertexGeminiWithRetry,
  type VertexPart,
} from "@/lib/vertex-gemini";
import {
  type CatalogCountry,
  type TarifarioCountry,
  getCatalogCountries,
  normalizeCountriesFromCatalog,
  normalizeCountryKey,
} from "@/lib/catalog-countries";

const TARIFARIO_INTERPRETER_PROMPT = `Eres un analista experto de productos turisticos para una agencia de viajes.

El usuario adjunta uno o varios archivos al mismo tiempo: PDFs, imagenes, documentos, textos u hojas de calculo. Debes analizar TODAS las fuentes disponibles como un solo conjunto y consolidar la informacion en una ficha de tarifario.

Objetivo:
- Extraer la informacion completa y util para crear un producto de tarifario.
- No inventes datos. Si un dato no aparece, deja el campo vacio.
- Si hay informacion repetida entre archivos, consolida la version mas completa.
- Si hay contradicciones, conserva la informacion mas confiable y menciona la contradiccion en notas.
- Las tarifas pueden contener precios por persona, por ocupacion, suplementos, vigencias, impuestos, condiciones o moneda. Incluye esos detalles en "rates".
- El itinerario debe quedar ordenado por dia o por etapa cuando la fuente lo permita.
- Si el itinerario contiene dias, llena "itineraryDays" con un objeto por cada dia detectado.
- Si no hay dias claros, deja "itineraryDays" como arreglo vacio y usa "itinerary" como texto consolidado.
- "includes" debe contener lo incluido en el paquete.
- "notIncludes" debe contener unicamente lo que el documento diga explicitamente que NO incluye, no esta incluido, exclusiones o gastos por cuenta del pasajero. Si no existe una seccion explicita de no incluye/exclusiones, dejalo vacio.
- "hotelsDetails" debe contener hoteles, categorias, regimen de comidas, habitaciones y cualquier detalle operativo relevante.
- Siempre intenta convertir tarifas a "rateTables", incluso si vienen como texto plano.
- "rateTables" debe preservar secciones separadas de tarifas. Por ejemplo:
  - una tabla por bloque de salidas con columnas Single, Double, Triple, etc.
  - una tabla de cabinas con columnas Cabina, Adulto, Niño.
  - texto como "CABINA INTERIOR: adulto $2,750 / niño $1,420" debe convertirse a columnas ["Cabina", "Adulto", "Niño"] y una fila por cabina.
  - texto como "Single 3225, Double 2195, Triple 1845" debe convertirse a columnas de ocupacion y una fila con los importes.
  - suplementos, condiciones o notas deben ir en "notes" de la tabla si no son filas.
- Si una tarifa tiene varias vigencias/fechas agrupadas con un mismo precio, NO crees filas vacias con guiones. Agrupa todas esas vigencias en la misma celda de vigencia de la fila que contiene los precios, separadas por saltos de linea. Ejemplo: si 02/07/2026-10/07/2026, 02/08/2026-22/08/2026 y 01/12/2026-15/12/2026 comparten SGL/DBL/TPL, deben ser una sola fila con esas tres vigencias en la primera celda.
- Solo deja "rateTables" vacio cuando sea demasiado ambiguo para identificar columnas y valores. Si hay al menos 2 conceptos comparables o una lista de precios con etiquetas claras, construye tabla.
- Determina "priceFrom" como el precio mas bajo disponible en acomodacion doble (DBL, Doble, Double u ocupacion doble). Debe incluir moneda o simbolo si aparece o se puede inferir, por ejemplo "$970", "Q 2,500", "MXN 8,990". Si no hay precios claros en acomodacion doble, usa el precio mas bajo claro del paquete. Si no hay precios claros, dejalo vacio.
- Extrae "countries" como arreglo de paises asociados al paquete cuando aplique. Usa UNICAMENTE nombres exactos del catalogo proporcionado; si el pais no esta en el catalogo o no estas seguro, omitelo. No inventes variantes ni traducciones.

Responde UNICAMENTE JSON valido con esta forma exacta:
{
  "title": "string",
  "dates": "string",
  "destinations": "string",
  "countries": ["string"],
  "itinerary": "string",
  "itineraryDays": [
    {
      "title": "Día 1",
      "content": "string"
    }
  ],
  "includes": "string",
  "notIncludes": "string",
  "hotelsDetails": "string",
  "notes": "string",
  "rates": "string",
  "priceFrom": "string",
  "rateTables": [
    {
      "title": "string",
      "subtitle": "string",
      "columns": ["string"],
      "rows": [["string"]],
      "notes": ["string"]
    }
  ]
}`;

const MAX_INCLUDES_AUDIT_PASSES = 3;
const MIN_INCLUDES_AUDIT_PASSES = 2;

const TARIFARIO_INCLUDES_AUDIT_PROMPT = `Eres un auditor de extraccion de tarifarios. Tu unica tarea es revisar TODOS los archivos adjuntos y extraer con maxima cobertura los campos "includes" y "notIncludes".

Reglas obligatorias:
- Haz una lectura especifica de encabezados, tablas, bullets, notas pequeñas y parrafos relacionados con:
  - Incluye, incluido, servicios incluidos, el paquete incluye, package includes, your package includes.
  - No incluye, no incluido, exclusiones, excluded, not included, gastos personales, por cuenta del pasajero, no contempla, no se incluye.
- No resumas si la fuente lista varios puntos. Conserva todos los items utiles.
- No inventes datos. Para "notIncludes", solo usa elementos explicitamente marcados como no incluidos, exclusiones, gastos por cuenta del pasajero o equivalentes.
- Si hay varias fuentes, consolida sin duplicar y conserva la version mas completa.
- Si una seccion esta partida entre paginas o imagenes, reconstruyela completa.
- Devuelve los campos como texto con saltos de linea cuando haya varios items.

Responde UNICAMENTE JSON valido con esta forma exacta:
{
  "includes": "string",
  "notIncludes": "string"
}`;

type TarifarioRateTable = {
  title: string;
  subtitle: string;
  columns: string[];
  rows: string[][];
  notes: string[];
};

export type TarifarioInterpretation = {
  title: string;
  dates: string;
  destinations: string;
  countries: TarifarioCountry[];
  itinerary: string;
  itineraryDays: Array<{
    key: string;
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
};

type IncludesAuditResult = {
  includes: string;
  notIncludes: string;
};

function cleanJson(raw: string): string {
  return raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
}

function removeTrailingJsonCommas(value: string) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      output += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      output += char;
      inString = !inString;
      continue;
    }

    if (!inString && char === ",") {
      let nextIndex = index + 1;
      while (/\s/.test(value[nextIndex] ?? "")) {
        nextIndex += 1;
      }

      if (value[nextIndex] === "}" || value[nextIndex] === "]") {
        continue;
      }
    }

    output += char;
  }

  return output;
}

function isLikelyJsonStringTerminator(value: string, quoteIndex: number) {
  let nextIndex = quoteIndex + 1;
  while (/\s/.test(value[nextIndex] ?? "")) {
    nextIndex += 1;
  }

  const next = value[nextIndex];
  if (!next) return true;
  if (next === ":" || next === "}" || next === "]") return true;

  if (next !== ",") return false;

  let afterCommaIndex = nextIndex + 1;
  while (/\s/.test(value[afterCommaIndex] ?? "")) {
    afterCommaIndex += 1;
  }

  const afterComma = value[afterCommaIndex];
  return (
    !afterComma ||
    afterComma === '"' ||
    afterComma === "{" ||
    afterComma === "[" ||
    afterComma === "}" ||
    afterComma === "]" ||
    afterComma === "-" ||
    /\d|t|f|n/.test(afterComma)
  );
}

function escapeLikelyUnescapedJsonStringQuotes(value: string) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      output += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      if (inString && !isLikelyJsonStringTerminator(value, index)) {
        output += '\\"';
        continue;
      }

      output += char;
      inString = !inString;
      continue;
    }

    output += char;
  }

  return output;
}

function parseVertexJsonText(text: string) {
  const cleanedText = cleanJson(text);
  const withoutTrailingCommas = removeTrailingJsonCommas(cleanedText);
  const repairedQuotes = escapeLikelyUnescapedJsonStringQuotes(
    withoutTrailingCommas,
  );
  const attempts = Array.from(
    new Set([cleanedText, withoutTrailingCommas, repairedQuotes]),
  );
  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt) as unknown;
    } catch (error) {
      lastError = error;
    }
  }

  console.error("[tarifario interpret vertex raw text]", text);
  console.error("[tarifario interpret vertex cleaned json]", cleanedText);
  console.error("[tarifario interpret vertex repaired json]", repairedQuotes);
  throw lastError;
}

function extractTextFromGeminiResponse(payload: unknown): string {
  const parts = (
    payload as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    }
  )?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function normalizeText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .join("\n");
  }

  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value).trim();
}

function normalizeItineraryDays(
  value: unknown,
): TarifarioInterpretation["itineraryDays"] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      const record =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      const content = normalizeText(record.content);
      if (!content) return null;

      return {
        key: `day-${index + 1}`,
        title: normalizeText(record.title) || `Día ${index + 1}`,
        content,
      };
    })
    .filter((item): item is TarifarioInterpretation["itineraryDays"][number] =>
      Boolean(item),
    );
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0);
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
    const hasOnlyDate = looksLikeDateRange(firstCell) &&
      row.slice(1).every(isEmptyPriceCell);
    const previous = merged[merged.length - 1];
    const previousHasPrices = previous?.slice(1).some((cell) => !isEmptyPriceCell(cell));

    if (hasOnlyDate && previous && previousHasPrices) {
      previous[0] = [previous[0], firstCell].filter(Boolean).join("\n");
      return;
    }

    merged.push(row);
  });

  return merged;
}

function normalizeRateTables(value: unknown): TarifarioRateTable[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const table = item as Record<string, unknown>;
      const columns = normalizeStringArray(table.columns);
      const rawRows = Array.isArray(table.rows) ? table.rows : [];
      const rows = rawRows
        .map((row) => normalizeStringArray(row))
        .filter((row) => row.length > 0);

      if (columns.length === 0 || rows.length === 0) return null;
      const normalizedRows = rows.map((row) =>
        columns.map((_, index) => normalizeText(row[index] ?? "")),
      );

      return {
        title: normalizeText(table.title),
        subtitle: normalizeText(table.subtitle),
        columns,
        rows: mergeGroupedDateRows(normalizedRows),
        notes: normalizeStringArray(table.notes),
      };
    })
    .filter((table): table is TarifarioRateTable => Boolean(table));
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|\s)([a-záéíóúñ])/g, (match) => match.toUpperCase());
}

function inferRateTablesFromRates(rates: string): TarifarioRateTable[] {
  const lines = rates
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const parsedRows: Array<{
    concept: string;
    values: Record<string, string>;
  }> = [];
  const notes: string[] = [];
  const labels: string[] = [];

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (!match) {
      if (/\d/.test(line)) notes.push(line);
      continue;
    }

    const concept = match[1].trim();
    const details = match[2].trim();
    const values: Record<string, string> = {};

    Array.from(
      details.matchAll(
        /([A-Za-zÁÉÍÓÚáéíóúÑñ ]+?)\s*\$?\s*([\d,]+(?:\.\d+)?)/g,
      ),
    ).forEach((valueMatch) => {
      const label = titleCase(valueMatch[1].trim());
      if (!label) return;

      values[label] = `$${valueMatch[2].trim()}`;
      if (!labels.includes(label)) labels.push(label);
    });

    if (Object.keys(values).length === 0) {
      notes.push(line);
      continue;
    }

    parsedRows.push({ concept: titleCase(concept), values });
  }

  const columns = ["Concepto", ...labels];
  if (columns.length < 2 || parsedRows.length === 0) return [];

  return [
    {
      title: "Tabla de tarifas",
      subtitle: "",
      columns,
      rows: parsedRows.map((row) => [
        row.concept,
        ...labels.map((label) => row.values[label] ?? ""),
      ]),
      notes,
    },
  ];
}

function inferCurrency(source: string) {
  if (/\bMXN\b/i.test(source)) return "MXN";
  if (/\bUSD\b/i.test(source) || /\busd\b/i.test(source)) return "$";
  if (/\bEUR\b/i.test(source)) return "EUR";
  if (/\bGTQ\b/i.test(source)) return "Q";
  if (/\bQ\s*[\d,.]+/.test(source)) return "Q";
  if (/\$\s*[\d,.]+/.test(source)) return "$";
  if (/€\s*[\d,.]+/.test(source)) return "€";
  return "";
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

function parseAmount(value: string) {
  const cleaned = value.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(/,/g, "");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : null;
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
  explicitPriceFrom = "",
) {
  if (explicitPriceFrom.trim()) return explicitPriceFrom.trim();

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

function textContainsCatalogCountry(sourceKey: string, country: CatalogCountry) {
  const candidates = [country.name, ...country.aliases]
    .map(normalizeCountryKey)
    .filter((value) => value.length >= 4);

  return candidates.some((candidate) => {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(sourceKey);
  });
}

function inferCountriesFromInterpretationText(
  record: Record<string, unknown>,
  catalog: CatalogCountry[],
) {
  const sourceKey = normalizeCountryKey(
    [
      record.title,
      record.dates,
      record.destinations,
      record.itinerary,
      record.includes,
      record.notIncludes,
      record.hotelsDetails,
      record.notes,
      record.rates,
      record.priceFrom,
    ]
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .join("\n"),
  );

  if (!sourceKey) return [];

  return catalog
    .filter((country) => textContainsCatalogCountry(sourceKey, country))
    .map((country) => country.name);
}

function mergeCountriesFromCatalog(
  primary: unknown,
  fallback: unknown,
  catalog: CatalogCountry[],
) {
  const countries = normalizeCountriesFromCatalog(primary, catalog);
  const fallbackCountries = normalizeCountriesFromCatalog(fallback, catalog);
  const seen = new Set(countries.map((country) => country.codigo || country.nombre));

  fallbackCountries.forEach((country) => {
    const key = country.codigo || country.nombre;
    if (!key || seen.has(key)) return;
    seen.add(key);
    countries.push(country);
  });

  return countries;
}

function normalizeInterpretation(
  value: unknown,
  countryCatalog: CatalogCountry[],
): TarifarioInterpretation {
  const source = value && typeof value === "object" ? value : {};
  const record = source as Record<string, unknown>;
  const rates = normalizeText(record.rates);
  const rateTables = normalizeRateTables(record.rateTables);
  const normalizedRateTables =
    rateTables.length > 0 ? rateTables : inferRateTablesFromRates(rates);
  const inferredCountries = inferCountriesFromInterpretationText(
    record,
    countryCatalog,
  );

  return {
    title: normalizeText(record.title),
    dates: normalizeText(record.dates),
    destinations: normalizeText(record.destinations),
    countries: mergeCountriesFromCatalog(
      record.countries,
      inferredCountries,
      countryCatalog,
    ),
    itinerary: normalizeText(record.itinerary),
    itineraryDays: normalizeItineraryDays(record.itineraryDays),
    includes: normalizeText(record.includes),
    notIncludes: normalizeText(record.notIncludes),
    hotelsDetails: normalizeText(record.hotelsDetails),
    notes: normalizeText(record.notes),
    rates,
    priceFrom:
      inferPriceFrom(rates, normalizedRateTables) ||
      normalizeText(record.priceFrom),
    rateTables: normalizedRateTables,
  };
}

function normalizeForComparison(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function splitContentItems(value: string) {
  return value
    .split(/\r?\n|(?:\s+-\s+)|(?:\s+•\s+)|(?:\s+\*\s+)/)
    .map((item) => item.trim().replace(/^[\-•*]\s*/, ""))
    .filter(Boolean);
}

function mergeTextBlocks(current: string, incoming: string) {
  const currentItems = splitContentItems(current);
  const incomingItems = splitContentItems(incoming);
  const merged = [...currentItems];

  for (const item of incomingItems) {
    const normalizedItem = normalizeForComparison(item);
    if (!normalizedItem) continue;

    const alreadyIncluded = merged.some((existing) => {
      const normalizedExisting = normalizeForComparison(existing);
      return (
        normalizedExisting === normalizedItem ||
        normalizedExisting.includes(normalizedItem) ||
        normalizedItem.includes(normalizedExisting)
      );
    });

    if (!alreadyIncluded) merged.push(item);
  }

  return merged.join("\n").trim();
}

function hasMeaningfulNewContent(current: string, incoming: string) {
  const merged = mergeTextBlocks(current, incoming);
  return normalizeForComparison(merged) !== normalizeForComparison(current);
}

async function extractTextJsonFromGemini(args: {
  apiKey: string;
  parts: VertexPart[];
  maxOutputTokens?: number;
}) {
  const bodyText = await fetchVertexGeminiWithRetry({
    apiKey: args.apiKey,
    body: {
      contents: [
        {
          role: "user",
          parts: args.parts,
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: args.maxOutputTokens ?? 8192,
        responseMimeType: "application/json",
      },
    },
  });

  const payload = JSON.parse(bodyText) as unknown;
  const text = extractTextFromGeminiResponse(payload);
  if (!text) throw new Error("Vertex no devolvio informacion interpretada.");

  return parseVertexJsonText(text);
}

function normalizeIncludesAudit(value: unknown): IncludesAuditResult {
  const source = value && typeof value === "object" ? value : {};
  const record = source as Record<string, unknown>;

  return {
    includes: normalizeText(record.includes),
    notIncludes: normalizeText(record.notIncludes),
  };
}

async function auditIncludesAndNotIncludes(args: {
  apiKey: string;
  files: File[];
  fileParts: VertexPart[];
  interpretation: TarifarioInterpretation;
}) {
  let includes = args.interpretation.includes;
  let notIncludes = args.interpretation.notIncludes;

  for (let pass = 1; pass <= MAX_INCLUDES_AUDIT_PASSES; pass += 1) {
    const parsed = await extractTextJsonFromGemini({
      apiKey: args.apiKey,
      maxOutputTokens: 4096,
      parts: [
        { text: TARIFARIO_INCLUDES_AUDIT_PROMPT },
        {
          text: `Pasada de auditoria: ${pass} de ${MAX_INCLUDES_AUDIT_PASSES}.

Archivos recibidos:
${args.files.map((file, index) => `${index + 1}. ${file.name}`).join("\n")}

Extraccion actual de includes:
${includes || "(vacio)"}

Extraccion actual de notIncludes:
${notIncludes || "(vacio)"}

Revisa otra vez los archivos completos. Devuelve la version mas completa de ambos campos, agregando cualquier item que falte.`,
        },
        ...args.fileParts,
      ],
    });
    const audit = normalizeIncludesAudit(parsed);
    const nextIncludes = mergeTextBlocks(includes, audit.includes);
    const nextNotIncludes = mergeTextBlocks(notIncludes, audit.notIncludes);
    const changed =
      hasMeaningfulNewContent(includes, audit.includes) ||
      hasMeaningfulNewContent(notIncludes, audit.notIncludes);

    includes = nextIncludes;
    notIncludes = nextNotIncludes;

    if (!changed && pass >= MIN_INCLUDES_AUDIT_PASSES) break;
  }

  return {
    ...args.interpretation,
    includes,
    notIncludes,
  };
}

export type TarifarioSourceFile = {
  name: string;
  type: string;
  size: number;
};

export type TarifarioInterpretationResult = {
  interpretation: TarifarioInterpretation;
  files: TarifarioSourceFile[];
};

async function fileToVertexPart(file: File): Promise<VertexPart | null> {
  if (file.size <= 0) return null;
  if (file.size > 20 * 1024 * 1024) {
    throw new Error(`El archivo ${file.name} supera 20 MB.`);
  }

  const lowerName = file.name.toLowerCase();
  const supported =
    file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    file.type.startsWith("text/") ||
    file.type === "application/msword" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/vnd.ms-excel" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    [".csv", ".txt", ".rtf", ".doc", ".docx", ".xls", ".xlsx"].some((ext) =>
      lowerName.endsWith(ext),
    );

  if (!supported) {
    throw new Error(`Tipo de archivo no soportado: ${file.name}`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    inlineData: {
      mimeType: file.type || "application/octet-stream",
      data: buffer.toString("base64"),
    },
  };
}

export async function interpretTarifarioFiles(args: {
  apiKey: string;
  files: File[];
}): Promise<TarifarioInterpretationResult> {
  const { apiKey, files } = args;

  if (files.length === 0) {
    throw new Error("Adjunta al menos un archivo para interpretar.");
  }

  const fileParts = await Promise.all(files.map(fileToVertexPart));
  const validFileParts = fileParts.filter(
    (part): part is VertexPart => Boolean(part),
  );
  const countryCatalog = await getCatalogCountries();
  const countryCatalogText = countryCatalog
    .map((country) => country.name)
    .join("\n");

  const parsed = await extractTextJsonFromGemini({
    apiKey,
    parts: [
      { text: TARIFARIO_INTERPRETER_PROMPT },
      {
        text: `Catalogo canonico de paises permitidos para "countries". Debes copiar los nombres exactamente como aparecen aqui y no devolver paises fuera de esta lista:\n${countryCatalogText || "(catalogo vacio)"}`,
      },
      {
        text: `Archivos recibidos:\n${files
          .map((file, index) => `${index + 1}. ${file.name}`)
          .join("\n")}`,
      },
      ...validFileParts,
    ],
  });

  const interpretation = normalizeInterpretation(parsed, countryCatalog);
  const auditedInterpretation = await auditIncludesAndNotIncludes({
    apiKey,
    files,
    fileParts: validFileParts,
    interpretation,
  });

  return {
    interpretation: auditedInterpretation,
    files: files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
    })),
  };
}
