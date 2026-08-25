import { getMongoDb } from "@/lib/mongodb";

export type CatalogCountry = {
  name: string;
  code: string;
  regionCode: string;
  aliases: string[];
};

export type TarifarioCountry = {
  nombre: string;
  codigo: string;
};

const CATALOG_DB_NAME = "Catalogs";
const COUNTRIES_COLLECTION = "paises";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeCountryKey(value: string) {
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

function toCatalogCountry(value: unknown): CatalogCountry | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const name = getFirstString(record, [
    "nombre",
    "name",
    "pais",
    "país",
    "Pais",
    "País",
    "nombrePais",
    "countryName",
    "country",
    "label",
    "Nombre",
    "Name",
  ]);

  if (!name) return null;

  return {
    name,
    code: getFirstString(record, [
      "codigo",
      "code",
      "iso2",
      "isoCode",
      "countryCode",
      "Codigo",
      "Code",
    ]).toUpperCase(),
    regionCode: getFirstString(record, [
      "region_codigo",
      "regionCode",
      "region_code",
      "codigo_region",
      "region",
    ]).toUpperCase(),
    aliases: getAliases(record),
  };
}

export async function getCatalogCountries(): Promise<CatalogCountry[]> {
  const db = await getMongoDb(CATALOG_DB_NAME);
  const docs = await db
    .collection(COUNTRIES_COLLECTION)
    .find({})
    .project({
      nombre: 1,
      name: 1,
      pais: 1,
      país: 1,
      Pais: 1,
      País: 1,
      nombrePais: 1,
      countryName: 1,
      country: 1,
      label: 1,
      Nombre: 1,
      Name: 1,
      codigo: 1,
      code: 1,
      iso2: 1,
      isoCode: 1,
      countryCode: 1,
      Codigo: 1,
      Code: 1,
      region_codigo: 1,
      regionCode: 1,
      region_code: 1,
      codigo_region: 1,
      region: 1,
      aliases: 1,
      alias: 1,
      sinonimos: 1,
      synonyms: 1,
      nombres: 1,
    })
    .toArray();

  const byKey = new Map<string, CatalogCountry>();
  docs.forEach((doc) => {
    const country = toCatalogCountry(doc);
    if (!country) return;

    const key = normalizeCountryKey(country.name);
    if (!key || byKey.has(key)) return;
    byKey.set(key, country);
  });

  return [...byKey.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}

export function normalizeCountriesFromCatalog(
  value: unknown,
  catalog: CatalogCountry[],
) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;\n]+/)
      : [];
  const lookup = new Map<string, TarifarioCountry>();

  catalog.forEach((country) => {
    const value = {
      nombre: country.name,
      codigo: country.code,
    };
    lookup.set(normalizeCountryKey(country.name), value);
    if (country.code) {
      lookup.set(normalizeCountryKey(country.code), value);
    }
    country.aliases.forEach((alias) => {
      lookup.set(normalizeCountryKey(alias), value);
    });
  });

  const seen = new Set<string>();
  const countries: TarifarioCountry[] = [];

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
    const country = lookup.get(normalizeCountryKey(lookupValue));
    if (!country) return;

    const key = normalizeCountryKey(country.codigo || country.nombre);
    if (!key || seen.has(key)) return;

    seen.add(key);
    countries.push(country);
  });

  return countries;
}
