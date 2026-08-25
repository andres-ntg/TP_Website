import { getMongoDb } from "@/lib/mongodb";

export type CatalogRegion = {
  name: string;
  code: string;
  aliases: string[];
};

export type TarifarioRegion = {
  nombre: string;
  codigo: string;
};

const CATALOG_DB_NAME = "Catalogs";
const REGIONS_COLLECTION = "regiones";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeRegionKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function getFirstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = normalizeText(record[key]);
    if (value) return value;
  }

  return "";
}

function getAliases(record: Record<string, unknown>) {
  const rawAliases = [
    record.aliases,
    record.alias,
    record.sinonimos,
    record.synonyms,
    record.nombres,
  ];
  const aliases = new Set<string>();

  rawAliases.forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const alias = normalizeText(item);
        if (alias) aliases.add(alias);
      });
      return;
    }

    const alias = normalizeText(value);
    if (alias) aliases.add(alias);
  });

  return [...aliases];
}

function toCatalogRegion(value: unknown): CatalogRegion | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const name = getFirstString(record, [
    "nombre",
    "name",
    "regionName",
    "region",
    "label",
    "Nombre",
    "Name",
  ]);
  const code = getFirstString(record, [
    "codigo",
    "code",
    "regionCode",
    "region_codigo",
    "Codigo",
    "Code",
  ]).toUpperCase();

  if (!name || !code) return null;

  return {
    name,
    code,
    aliases: getAliases(record),
  };
}

export async function getCatalogRegions(): Promise<CatalogRegion[]> {
  const db = await getMongoDb(CATALOG_DB_NAME);
  const docs = await db
    .collection(REGIONS_COLLECTION)
    .find({})
    .project({
      nombre: 1,
      name: 1,
      regionName: 1,
      region: 1,
      label: 1,
      Nombre: 1,
      Name: 1,
      codigo: 1,
      code: 1,
      regionCode: 1,
      region_codigo: 1,
      Codigo: 1,
      Code: 1,
      aliases: 1,
      alias: 1,
      sinonimos: 1,
      synonyms: 1,
      nombres: 1,
    })
    .toArray();

  const byCode = new Map<string, CatalogRegion>();
  docs.forEach((doc) => {
    const region = toCatalogRegion(doc);
    if (!region) return;

    const key = normalizeRegionKey(region.code);
    if (!key || byCode.has(key)) return;
    byCode.set(key, region);
  });

  return [...byCode.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}

export function normalizeRegionsFromCatalog(
  value: unknown,
  catalog: CatalogRegion[],
) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;\n]+/)
      : [];
  const lookup = new Map<string, TarifarioRegion>();

  catalog.forEach((region) => {
    const value = {
      nombre: region.name,
      codigo: region.code,
    };
    lookup.set(normalizeRegionKey(region.name), value);
    lookup.set(normalizeRegionKey(region.code), value);
    region.aliases.forEach((alias) => {
      lookup.set(normalizeRegionKey(alias), value);
    });
  });

  const seen = new Set<string>();
  const regions: TarifarioRegion[] = [];

  values.forEach((item) => {
    const record =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : null;
    const lookupValue = record
      ? normalizeText(record.codigo) ||
        normalizeText(record.code) ||
        normalizeText(record.nombre) ||
        normalizeText(record.name)
      : String(item ?? "");
    const region = lookup.get(normalizeRegionKey(lookupValue));
    if (!region) return;

    const key = normalizeRegionKey(region.codigo);
    if (!key || seen.has(key)) return;

    seen.add(key);
    regions.push(region);
  });

  return regions;
}
