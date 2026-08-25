"use client";

import { InboxOutlined } from "@ant-design/icons";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import type { UploadFile, UploadProps } from "antd";
import {
  ConfigProvider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Tabs,
  Upload,
  message,
} from "antd";
import type { ThemeConfig } from "antd";
import type { ClipboardEvent, CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

const { Dragger } = Upload;
const REQUEST_TIMEOUT_MS = 180_000;
const INTERPRETATION_POLL_INTERVAL_MS = 3_000;
const INTERPRETATION_POLL_TIMEOUT_MS = 15 * 60_000;
const textareaClass =
  "rounded-xl px-4 py-3 text-[17px] leading-8 [&.ant-input]:text-[17px] [&.ant-input]:leading-8 [&_textarea]:text-[17px] [&_textarea]:leading-8";
const VALIDITY_DEFAULT = "No aplica";
const TARIFARIO_TYPE_DEFAULT = "Paquete";
const TARIFARIO_TYPE_OPTIONS = [
  { label: "Paquete", value: "Paquete" },
  { label: "Circuito", value: "Circuito" },
  { label: "Tarifario", value: "Tarifario" },
];
const catalogSelectStyles = {
  root: {
    width: "100%",
    minHeight: 56,
  },
  content: {
    minHeight: 38,
    display: "flex",
    alignItems: "center",
  },
  item: {
    height: 32,
    lineHeight: "30px",
    fontSize: 15,
    fontWeight: 600,
  },
  input: {
    height: 32,
    fontSize: 17,
  },
  placeholder: {
    fontSize: 15,
    lineHeight: "38px",
  },
  popup: {
    root: {
      zIndex: 1800,
    },
  },
} satisfies {
  root: CSSProperties;
  content: CSSProperties;
  item: CSSProperties;
  input: CSSProperties;
  placeholder: CSSProperties;
  popup: {
    root: CSSProperties;
  };
};
const catalogSelectTheme: ThemeConfig = {
  token: {
    controlHeightLG: 56,
    borderRadiusLG: 12,
    fontSizeLG: 17,
  },
  components: {
    Select: {
      multipleItemHeightLG: 32,
      zIndexPopup: 1800,
    },
  },
};

type NewTarifarioModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  tarifario?: TarifarioFormValue | null;
};

type TarifarioInterpretation = {
  title?: string;
  dates?: string;
  destinations?: string;
  countries?: Array<string | TarifarioCountry>;
  itinerary?: string;
  itineraryDays?: ItineraryDay[];
  includes?: string;
  notIncludes?: string;
  hotelsDetails?: string;
  notes?: string;
  rates?: string;
  priceFrom?: string;
  rateTables?: TarifarioRateTable[];
};

type TarifarioInterpretJobStatus = "queued" | "processing" | "done" | "error";

type TarifarioInterpretResult = {
  interpretation?: TarifarioInterpretation;
};

type TarifarioInterpretStartResponse = {
  jobId?: string;
  status?: TarifarioInterpretJobStatus;
  result?: TarifarioInterpretResult | null;
  error?: string;
};

type TarifarioInterpretStatusResponse = TarifarioInterpretStartResponse;

type ItineraryDay = {
  key: string;
  title: string;
  content: string;
};

type CountryOption = {
  name: string;
  codigo: string;
  regionCodigo?: string;
};

type CountrySelectOption = {
  key: string;
  value: string;
  label: string;
  name: string;
  code: string;
  searchText: string;
};

type TarifarioCountry = {
  nombre: string;
  codigo: string;
};

type RegionOption = {
  name: string;
  codigo: string;
};

type RegionSelectOption = {
  key: string;
  value: string;
  label: string;
  name: string;
  code: string;
  searchText: string;
};

type TarifarioRegion = {
  nombre: string;
  codigo: string;
};

function getCountryFormValues(
  value: Array<string | TarifarioCountry> | undefined,
  options: CountryOption[],
) {
  const lookup = new Map<string, string>();
  options.forEach((country) => {
    const selectValue = country.codigo || country.name;
    lookup.set(normalizeCountrySearch(country.name), selectValue);
    if (country.codigo) {
      lookup.set(normalizeCountrySearch(country.codigo), selectValue);
    }
  });

  return (value ?? [])
    .map((country) => {
      if (typeof country !== "string") {
        const catalogValue =
          lookup.get(normalizeCountrySearch(country.codigo)) ??
          lookup.get(normalizeCountrySearch(country.nombre));

        return catalogValue ?? (country.codigo || country.nombre);
      }

      return lookup.get(normalizeCountrySearch(country)) ?? country;
    })
    .filter(Boolean);
}

function getRegionFormValues(
  value: Array<string | TarifarioRegion> | undefined,
  options: RegionOption[],
) {
  const lookup = new Map<string, string>();
  options.forEach((region) => {
    const selectValue = region.codigo || region.name;
    lookup.set(normalizeRegionSearch(region.name), selectValue);
    if (region.codigo) {
      lookup.set(normalizeRegionSearch(region.codigo), selectValue);
    }
  });

  return (value ?? [])
    .map((region) => {
      if (typeof region !== "string") {
        const catalogValue =
          lookup.get(normalizeRegionSearch(region.codigo)) ??
          lookup.get(normalizeRegionSearch(region.nombre));

        return catalogValue ?? (region.codigo || region.nombre);
      }

      return lookup.get(normalizeRegionSearch(region)) ?? region;
    })
    .filter(Boolean);
}

function normalizeCountrySearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizeRegionSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function getCountrySearchRank(input: string, option?: CountrySelectOption) {
  const query = normalizeCountrySearch(input);
  if (!query || !option) return 0;

  const name = normalizeCountrySearch(option.name);
  const code = normalizeCountrySearch(option.code);
  const searchText = normalizeCountrySearch(option.searchText);

  if (name === query || code === query) return 0;
  if (name.startsWith(query) || code.startsWith(query)) return 1;
  if (searchText.includes(query)) return 2;
  return 3;
}

function getRegionSearchRank(input: string, option?: RegionSelectOption) {
  const query = normalizeRegionSearch(input);
  if (!query || !option) return 0;

  const name = normalizeRegionSearch(option.name);
  const code = normalizeRegionSearch(option.code);
  const searchText = normalizeRegionSearch(option.searchText);

  if (name === query || code === query) return 0;
  if (name.startsWith(query) || code.startsWith(query)) return 1;
  if (searchText.includes(query)) return 2;
  return 3;
}

export type TarifarioRateTable = {
  title: string;
  subtitle: string;
  columns: string[];
  columnMarkups?: string[];
  rows: string[][];
  notes: string[];
};

export type TarifarioFormValue = {
  id: string;
  type?: "Paquete" | "Circuito" | "Tarifario";
  title: string;
  dates: string;
  validity?: string;
  destinations: string;
  countries?: Array<string | TarifarioCountry>;
  regions?: Array<string | TarifarioRegion>;
  itinerary: string;
  itineraryDays?: ItineraryDay[];
  includes?: string;
  notIncludes?: string;
  hotelsDetails?: string;
  notes?: string;
  rates: string;
  priceFrom?: string;
  rateTables?: TarifarioRateTable[];
  images?: Array<{
    name?: string;
    type?: string;
    size?: number;
    url: string;
  }>;
};

function createItineraryDay(dayNumber: number, content = ""): ItineraryDay {
  return {
    key: `day-${dayNumber}-${Date.now()}`,
    title: `Día ${dayNumber}`,
    content,
  };
}

function serializeItineraryDays(days: ItineraryDay[]): string {
  return days
    .filter((day) => day.content.trim() !== "")
    .map((day) => `${day.title}: ${day.content.trim()}`)
    .join("\n\n");
}

function splitItineraryToDays(value: string | undefined): ItineraryDay[] {
  const source = value?.trim();
  if (!source) return [createItineraryDay(1)];

  const matches = Array.from(
    source.matchAll(/(?:^|\n)\s*(?:Dia|Día)\s*(\d+)\s*[:.-]?\s*/gi),
  );

  if (matches.length === 0) {
    return [createItineraryDay(1, source)];
  }

  return matches.map((match, index) => {
    const dayNumber = Number(match[1]) || index + 1;
    const start = (match.index ?? 0) + match[0].length;
    const end =
      index + 1 < matches.length
        ? (matches[index + 1].index ?? source.length)
        : source.length;

    return createItineraryDay(dayNumber, source.slice(start, end).trim());
  });
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

function normalizeRateTables(value: unknown): TarifarioRateTable[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): TarifarioRateTable | null => {
      if (!item || typeof item !== "object") return null;

      const table = item as Record<string, unknown>;
      const columns = Array.isArray(table.columns)
        ? table.columns
            .map((column) => String(column ?? "").trim())
            .filter(Boolean)
        : [];
      const rows = Array.isArray(table.rows)
        ? table.rows
            .map((row) =>
              Array.isArray(row)
                ? row.map((cell) => String(cell ?? "").trim())
                : [],
            )
            .filter((row) => row.some(Boolean))
        : [];

      if (columns.length === 0 || rows.length === 0) return null;
      const normalizedRows = rows.map((row) =>
        columns.map((_, index) => String(row[index] ?? "").trim()),
      );
      const columnMarkups = Array.isArray(table.columnMarkups)
        ? table.columnMarkups
        : [];

      return {
        title: String(table.title ?? "").trim(),
        subtitle: String(table.subtitle ?? "").trim(),
        columns,
        columnMarkups: columns.map((_, index) =>
          String(columnMarkups[index] ?? "").trim(),
        ),
        rows: mergeGroupedDateRows(normalizedRows),
        notes: Array.isArray(table.notes)
          ? table.notes
              .map((note) => String(note ?? "").trim())
              .filter(Boolean)
          : [],
      };
    })
    .filter((table): table is TarifarioRateTable => Boolean(table));
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|\s)([a-záéíóúñ])/g, (match) => match.toUpperCase());
}

function inferRateTablesFromRates(rates: string | undefined): TarifarioRateTable[] {
  const lines = (rates ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const parsedRows: Array<{
    concept: string;
    values: Record<string, string>;
  }> = [];
  const labels: string[] = [];
  const notes: string[] = [];

  lines.forEach((line) => {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (!match) {
      if (/\d/.test(line)) notes.push(line);
      return;
    }

    const concept = titleCase(match[1].trim());
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
      return;
    }

    parsedRows.push({ concept, values });
  });

  if (labels.length === 0 || parsedRows.length === 0) return [];

  const columns = ["Concepto", ...labels];

  return [
    {
      title: "Tabla de tarifas",
      subtitle: "",
      columns,
      columnMarkups: columns.map(() => ""),
      rows: parsedRows.map((row) => [
        row.concept,
        ...labels.map((label) => row.values[label] ?? ""),
      ]),
      notes,
    },
  ];
}

function createBlankRateTable(tableNumber: number): TarifarioRateTable {
  return {
    title: `Tabla ${tableNumber}`,
    subtitle: "",
    columns: ["Concepto", "Precio"],
    columnMarkups: ["", ""],
    rows: [["", ""]],
    notes: [],
  };
}

function getRatesFallback(tables: TarifarioRateTable[]) {
  const firstTable = tables[0];
  if (!firstTable) return "";

  const label = firstTable.title || "Tabla de tarifas";
  const detail = firstTable.subtitle ? ` - ${firstTable.subtitle}` : "";
  return `${label}${detail}`;
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

function collectDoubleOccupancyAmounts(tables: TarifarioRateTable[]) {
  const amounts: number[] = [];

  tables.forEach((table) => {
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
  rates: string | undefined,
  tables: TarifarioRateTable[],
  explicitPriceFrom?: string,
) {
  if (explicitPriceFrom?.trim()) return explicitPriceFrom.trim();

  const tableSource = tables
    .flatMap((table) => [
      table.title,
      table.subtitle,
      ...table.columns,
      ...table.rows.flat(),
      ...table.notes,
    ])
    .join("\n");
  const source = [rates ?? "", tableSource].filter(Boolean).join("\n");
  const currency = inferCurrency(source);
  const doubleOccupancyAmounts = collectDoubleOccupancyAmounts(tables);
  const amounts =
    doubleOccupancyAmounts.length > 0
      ? doubleOccupancyAmounts
      : extractPositiveAmounts(tableSource || (rates ?? ""));

  if (amounts.length === 0) return "";
  return formatPriceFrom(Math.min(...amounts), currency);
}

// Known currency codes used as whitelist to avoid matching non-price text
const CURRENCY_CODES =
  "USD|MXN|EUR|GTQ|GBP|ARS|COP|PEN|CLP|BRL|CAD|AUD|CHF|JPY|CNY|KRW|INR|THB|NZD|ZAR|AED|SAR|HKD|SGD|RUB|TRY|PLN|SEK|NOK|DKK|CZK|HNL|NIO|CRC|DOP|BZD|PAB|UYU|PYG|BOB|VES|CUP|JMD|TTD|HTG|BBD|SVC|AWG|NAD|BWP|ZMW|TZS|KES|GHS|EGP|MAD|TND";
const CURRENCY_SYMBOLS = "€£¥₩₹฿₺₴₽$Q";
const PRICE_RE = new RegExp(
  `^([${CURRENCY_SYMBOLS}]?\\s*(?:${CURRENCY_CODES})?\\s*)` +
    `([\\d]{1,3}(?:,[\\d]{3})*(?:\\.\\d+)?|\\d+(?:\\.\\d+)?)` +
    `(\\s*(?:${CURRENCY_CODES})?)\\s*$`,
  "i",
);

function applyMarkupToCell(
  cell: string,
  mode: "percent" | "fixed",
  value: number,
  roundUp = false,
): string {
  const trimmed = cell.trim();
  if (!trimmed || isEmptyPriceCell(trimmed)) return cell;
  if (looksLikeDateRange(trimmed)) return cell;

  const match = trimmed.match(PRICE_RE);
  if (!match) return cell;

  const amount = parseFloat(match[2].replace(/,/g, ""));
  if (!isFinite(amount) || amount <= 0) return cell;

  const computedAmount =
    mode === "percent"
      ? amount / value
      : amount + value;
  const newAmount = roundUp ? Math.ceil(computedAmount) : computedAmount;
  const prefix = match[1] ?? "";
  const suffix = match[3] ?? "";
  const hasDecimals = !roundUp && match[2].includes(".");
  const formatted = newAmount.toLocaleString("en-US", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: roundUp ? 0 : 2,
  });
  return `${prefix}${formatted}${suffix}`.trimEnd();
}

function parseMarkupPercent(value: string | undefined) {
  if (!value?.trim()) return 0;

  const parsed = Number(value.replace("%", "").replace(",", ".").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function applyColumnSurchargeToCell(cell: string, percent: number): string {
  if (!percent || percent <= 0) return cell;
  const multiplier = 1 + percent / 100;
  return applyMarkupToCell(cell, "percent", 1 / multiplier);
}

function applyColumnSurchargesToTables(
  tables: TarifarioRateTable[],
): TarifarioRateTable[] {
  return tables.map((table) => ({
    ...table,
    rows: table.rows.map((row) =>
      table.columns.map((_, columnIndex) =>
        applyColumnSurchargeToCell(
          row[columnIndex] ?? "",
          parseMarkupPercent(table.columnMarkups?.[columnIndex]),
        ),
      ),
    ),
    columnMarkups: table.columns.map(() => ""),
  }));
}

function applyMarkupToTables(
  tables: TarifarioRateTable[],
  mode: "percent" | "fixed",
  value: number,
  roundUp = false,
): TarifarioRateTable[] {
  if (!value || value <= 0) return tables;
  return tables.map((table) => ({
    ...table,
    rows: table.rows.map((row) =>
      row.map((cell) => applyMarkupToCell(cell, mode, value, roundUp)),
    ),
  }));
}

function getPricedRateTables(
  tables: TarifarioRateTable[],
  netPrices: boolean,
  markupMode: "percent" | "fixed",
  markupValue: number,
  roundMarkup: boolean,
) {
  const tablesWithColumnSurcharges = applyColumnSurchargesToTables(tables);
  return netPrices
    ? tablesWithColumnSurcharges
    : applyMarkupToTables(
        tablesWithColumnSurcharges,
        markupMode,
        markupValue,
        roundMarkup,
      );
}

export function NewTarifarioModal({
  open,
  onClose,
  onCreated,
  tarifario,
}: NewTarifarioModalProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [imageList, setImageList] = useState<UploadFile[]>([]);
  const [interpreting, setInterpreting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([
    createItineraryDay(1),
  ]);
  const [rateTables, setRateTables] = useState<TarifarioRateTable[]>([]);
  const [netPrices, setNetPrices] = useState(true);
  const [markupMode, setMarkupMode] = useState<"percent" | "fixed">("percent");
  const [markupFactor, setMarkupFactor] = useState(0.8);
  const [markupFixed, setMarkupFixed] = useState(10);
  const [roundMarkup, setRoundMarkup] = useState(false);
  const [priceFromManuallyEdited, setPriceFromManuallyEdited] = useState(false);
  const [uploadPanelOpen, setUploadPanelOpen] = useState(true);
  const [activeItineraryDay, setActiveItineraryDay] = useState(
    itineraryDays[0].key,
  );
  const interpretingRef = useRef(false);
  const [form] = Form.useForm();
  const watchedRates = Form.useWatch("rates", form);
  const canInterpret = fileList.length > 0 && !interpreting;
  const isEditing = Boolean(tarifario?.id);
  const countrySelectOptions: CountrySelectOption[] = useMemo(
    () =>
      Array.from(
        countryOptions
          .reduce((options, country) => {
            const value = country.codigo || country.name;
            if (!value || options.has(value)) return options;

            options.set(value, {
              key: value,
              value,
              name: country.name,
              code: country.codigo,
              label: country.codigo
                ? `${country.name} (${country.codigo})`
                : country.name,
              searchText: [country.name, country.codigo]
                .filter(Boolean)
                .join(" "),
            });

            return options;
          }, new Map<string, CountrySelectOption>())
          .values(),
      ),
    [countryOptions],
  );
  const regionSelectOptions: RegionSelectOption[] = useMemo(
    () =>
      Array.from(
        regionOptions
          .reduce((options, region) => {
            const value = region.codigo || region.name;
            if (!value || options.has(value)) return options;

            options.set(value, {
              key: value,
              value,
              name: region.name,
              code: region.codigo,
              label: region.codigo
                ? `${region.name} (${region.codigo})`
                : region.name,
              searchText: [region.name, region.codigo]
                .filter(Boolean)
                .join(" "),
            });

            return options;
          }, new Map<string, RegionSelectOption>())
          .values(),
      ),
    [regionOptions],
  );
  const countryRegionLookup = useMemo(
    () =>
      new Map(
        countryOptions
          .filter((country) => country.codigo && country.regionCodigo)
          .map((country) => [country.codigo, country.regionCodigo as string]),
      ),
    [countryOptions],
  );

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    Promise.all([
      fetch("/api/catalogs/paises", { cache: "no-store" }).then(
        async (response) => {
          const payload = (await response.json().catch(() => ({}))) as {
            countries?: CountryOption[];
            error?: string;
          };

          if (!response.ok || !Array.isArray(payload.countries)) {
            throw new Error(
              payload.error ?? "No se pudo cargar el catálogo de países.",
            );
          }

          return payload.countries;
        },
      ),
      fetch("/api/catalogs/regiones", { cache: "no-store" }).then(
        async (response) => {
          const payload = (await response.json().catch(() => ({}))) as {
            regions?: RegionOption[];
            error?: string;
          };

          if (!response.ok || !Array.isArray(payload.regions)) {
            throw new Error(
              payload.error ?? "No se pudo cargar el catálogo de regiones.",
            );
          }

          return payload.regions;
        },
      ),
    ])
      .then(([countries, regions]) => {
        if (ignore) return;
        setCountryOptions(countries);
        setRegionOptions(regions);
      })
      .catch((error) => {
        if (!ignore) {
          message.error(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el catálogo de países.",
          );
          setCountryOptions([]);
          setRegionOptions([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timeoutId = window.setTimeout(() => {
    if (!tarifario) {
      form.resetFields();
      form.setFieldValue("type", TARIFARIO_TYPE_DEFAULT);
      setFileList([]);
      setImageList([]);
      setRateTables([]);
      setNetPrices(true);
      setMarkupMode("percent");
      setMarkupFactor(0.8);
      setMarkupFixed(10);
      setRoundMarkup(false);
      setPriceFromManuallyEdited(false);
      setUploadPanelOpen(true);
      const initialDay = createItineraryDay(1);
      setItineraryDays([initialDay]);
      setActiveItineraryDay(initialDay.key);
      return;
    }

    const nextDays =
      tarifario.itineraryDays?.length
        ? tarifario.itineraryDays.map((day, index) => ({
            key: day.key || `day-${index + 1}-${Date.now()}`,
            title: day.title || `Día ${index + 1}`,
            content: day.content || "",
          }))
        : splitItineraryToDays(tarifario.itinerary);

    setItineraryDays(nextDays);
    setActiveItineraryDay(nextDays[0]?.key ?? "");
    setFileList([]);
    setImageList(
      (tarifario.images ?? []).map((image, index) => ({
        uid: `existing-${index}-${image.url}`,
        name: image.name || `Imagen ${index + 1}`,
        status: "done",
        url: image.url,
        type: image.type,
        size: image.size,
      })),
    );
    const savedRateTables = normalizeRateTables(tarifario.rateTables);
    const nextRateTables =
      savedRateTables.length > 0
        ? savedRateTables
        : inferRateTablesFromRates(tarifario.rates);
    setRateTables(nextRateTables);
    setPriceFromManuallyEdited(Boolean(tarifario.priceFrom?.trim()));
    const selectedCountries = getCountryFormValues(
      tarifario.countries,
      countryOptions,
    );
    const selectedRegions = getRegionFormValues(tarifario.regions, regionOptions);
    const inferredRegions = selectedCountries
      .map((countryCode) => countryRegionLookup.get(countryCode))
      .filter((regionCode): regionCode is string => Boolean(regionCode))
      .filter((regionCode) =>
        regionSelectOptions.some((option) => option.value === regionCode),
      );

    form.setFieldsValue({
      type: tarifario.type ?? TARIFARIO_TYPE_DEFAULT,
      title: tarifario.title,
      dates: tarifario.dates,
      destinations: tarifario.destinations,
      countries: selectedCountries,
      regions: selectedRegions.length ? selectedRegions : inferredRegions,
      itinerary: serializeItineraryDays(nextDays),
      includes: tarifario.includes ?? "",
      notIncludes: tarifario.notIncludes ?? "",
      hotelsDetails: tarifario.hotelsDetails ?? "",
      notes: tarifario.notes ?? "",
      rates: tarifario.rates,
      priceFrom:
        tarifario.priceFrom ??
        inferPriceFrom(tarifario.rates, nextRateTables),
    });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    countryOptions,
    countryRegionLookup,
    form,
    open,
    regionOptions,
    regionSelectOptions,
    tarifario,
  ]);

  const syncItineraryDays = (nextDays: ItineraryDay[]) => {
    setItineraryDays(nextDays);
    form.setFieldValue("itinerary", serializeItineraryDays(nextDays));
  };

  useEffect(() => {
    if (!open || priceFromManuallyEdited) return;

    const timeoutId = window.setTimeout(() => {
      const normalizedRateTables = normalizeRateTables(rateTables);
      const markupValue =
        markupMode === "percent" ? markupFactor : markupFixed;
      const pricedRateTables = getPricedRateTables(
        normalizedRateTables,
        netPrices,
        markupMode,
        markupValue,
        roundMarkup,
      );
      const currentRates = watchedRates;
      const rates =
        typeof currentRates === "string" && currentRates.trim()
          ? currentRates.trim()
          : getRatesFallback(pricedRateTables);

      form.setFieldValue("priceFrom", inferPriceFrom(rates, pricedRateTables));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    form,
    markupFactor,
    markupFixed,
    markupMode,
    netPrices,
    open,
    priceFromManuallyEdited,
    rateTables,
    roundMarkup,
    watchedRates,
  ]);

  const handleAddItineraryDay = () => {
    const nextDay = createItineraryDay(itineraryDays.length + 1);
    const nextDays = [...itineraryDays, nextDay];
    syncItineraryDays(nextDays);
    setActiveItineraryDay(nextDay.key);
  };

  const handleItineraryDayChange = (key: string, content: string) => {
    syncItineraryDays(
      itineraryDays.map((day) =>
        day.key === key ? { ...day, content } : day,
      ),
    );
  };

  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    beforeUpload: () => false,
    onChange(info) {
      setFileList(info.fileList);
    },
    onRemove(file) {
      setFileList((currentFiles) =>
        currentFiles.filter((currentFile) => currentFile.uid !== file.uid),
      );
    },
  };

  const imageUploadProps: UploadProps = {
    multiple: true,
    accept: "image/*",
    fileList: imageList,
    beforeUpload: (file) => {
      if (!file.type.startsWith("image/")) {
        message.warning("Solo puedes agregar imagenes.");
        return Upload.LIST_IGNORE;
      }

      if (file.size > 10 * 1024 * 1024) {
        message.warning("Cada imagen debe pesar 10 MB o menos.");
        return Upload.LIST_IGNORE;
      }

      return false;
    },
    onChange(info) {
      setImageList(info.fileList);
    },
    onRemove(file) {
      setImageList((currentImages) =>
        currentImages.filter((currentImage) => currentImage.uid !== file.uid),
      );
    },
    listType: "picture",
  };

  const appendImageFiles = (files: File[], source: "paste" | "upload") => {
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        message.warning("Solo puedes agregar imagenes.");
        return false;
      }

      if (file.size > 10 * 1024 * 1024) {
        message.warning("Cada imagen debe pesar 10 MB o menos.");
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    setImageList((currentImages) => [
      ...currentImages,
      ...validFiles.map((file, index) => ({
        uid: `${source}-${Date.now()}-${index}-${file.name || "imagen"}`,
        name:
          file.name ||
          `imagen-${currentImages.length + index + 1}.${file.type.split("/")[1] || "png"}`,
        status: "done" as const,
        originFileObj:
          file as unknown as NonNullable<UploadFile["originFileObj"]>,
        type: file.type,
        size: file.size,
      })),
    ]);

    message.success(
      validFiles.length === 1
        ? "Imagen agregada desde el portapapeles."
        : `${validFiles.length} imagenes agregadas desde el portapapeles.`,
    );
  };

  const handleImagePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (files.length === 0) return;

    event.preventDefault();
    appendImageFiles(files, "paste");
  };

  const handleClose = () => {
    onClose();
  };

  const handleCountriesChange = (selectedCountries: string[]) => {
    const inferredRegions = selectedCountries
      .map((countryCode) => countryRegionLookup.get(countryCode))
      .filter((regionCode): regionCode is string => Boolean(regionCode));
    if (!inferredRegions.length) return;

    const currentRegions = form.getFieldValue("regions");
    const nextRegions = Array.from(
      new Set([
        ...(Array.isArray(currentRegions) ? currentRegions : []),
        ...inferredRegions,
      ]),
    ).filter((regionCode) =>
      regionSelectOptions.some((option) => option.value === regionCode),
    );

    form.setFieldValue("regions", nextRegions);
  };

  const applyInterpretation = (interpretation: TarifarioInterpretation) => {
    const interpretedDays =
      interpretation.itineraryDays?.length
        ? interpretation.itineraryDays
        : splitItineraryToDays(interpretation.itinerary);
    const normalizedDays = interpretedDays.map((day, index) => ({
      key: day.key || `day-${index + 1}-${Date.now()}`,
      title: day.title || `Día ${index + 1}`,
      content: day.content || "",
    }));

    setItineraryDays(normalizedDays);
    const interpretedRateTables = normalizeRateTables(
      interpretation.rateTables,
    );
    const nextRateTables =
      interpretedRateTables.length > 0
        ? interpretedRateTables
        : inferRateTablesFromRates(interpretation.rates);
    const priceFrom = inferPriceFrom(
      interpretation.rates,
      nextRateTables,
      "",
    ) || interpretation.priceFrom;
    setPriceFromManuallyEdited(false);
    setRateTables(nextRateTables);
    setActiveItineraryDay(normalizedDays[0]?.key ?? "");
    form.setFieldsValue({
      ...interpretation,
      countries: getCountryFormValues(interpretation.countries, countryOptions),
      regions: getCountryFormValues(interpretation.countries, countryOptions)
        .map((countryCode) => countryRegionLookup.get(countryCode))
        .filter((regionCode): regionCode is string => Boolean(regionCode))
        .filter((regionCode) =>
          regionSelectOptions.some((option) => option.value === regionCode),
        ),
      itinerary: serializeItineraryDays(normalizedDays),
      priceFrom,
    });
  };

  const handleInterpret = async () => {
    if (interpretingRef.current) return;

    const files = fileList
      .map((file) => file.originFileObj)
      .filter(
        (file): file is NonNullable<UploadFile["originFileObj"]> =>
          Boolean(file),
      );

    if (files.length === 0) {
      message.warning("Selecciona al menos un archivo para interpretar.");
      return;
    }

    interpretingRef.current = true;
    setInterpreting(true);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const res = await fetchWithTimeout("/api/tarifario/interpret/start", {
        method: "POST",
        body: formData,
        timeoutMs: REQUEST_TIMEOUT_MS,
      });
      const data = (await res.json().catch(() => ({}))) as
        TarifarioInterpretStartResponse;

      if (!res.ok || !data.jobId) {
        throw new Error(
          data.error ?? "No se pudo interpretar la informacion.",
        );
      }

      const result =
        data.status === "done" && data.result?.interpretation
          ? data.result
          : await waitForTarifarioInterpretation(data.jobId);

      if (!result.interpretation) {
        throw new Error("La interpretación terminó sin devolver información.");
      }

      applyInterpretation(result.interpretation);
      message.success("Informacion interpretada correctamente.");
      setUploadPanelOpen(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "No se pudo interpretar la informacion.";
      Modal.error({
        title: "No se pudo interpretar",
        content: errorMessage,
        okText: "Entendido",
      });
    } finally {
      interpretingRef.current = false;
      setInterpreting(false);
    }
  };

  const handleSubmit = async () => {
    if (interpretingRef.current || saving) return;

    try {
      const values = (await form.validateFields()) as Record<string, unknown>;
      const normalizedRateTables = normalizeRateTables(rateTables);
      setSaving(true);
      const rates =
        typeof values.rates === "string" && values.rates.trim()
          ? values.rates.trim()
          : getRatesFallback(normalizedRateTables);
      const countries = Array.isArray(values.countries)
        ? values.countries
        : [];
      const regions = Array.isArray(values.regions) ? values.regions : [];
      const type =
        values.type === "Tarifario"
          ? "Tarifario"
          : values.type === "Circuito"
            ? "Circuito"
            : TARIFARIO_TYPE_DEFAULT;

      const formData = new FormData();
      [
        "title",
        "dates",
        "destinations",
        "itinerary",
        "includes",
        "notIncludes",
        "hotelsDetails",
        "notes",
      ].forEach((key) =>
        formData.append(
          key,
          typeof values[key] === "string" ? values[key] : "",
        ),
      );
      formData.append("validity", VALIDITY_DEFAULT);
      formData.append("type", type);
      formData.append("rates", rates);
      formData.append("countries", JSON.stringify(countries));
      formData.append("regions", JSON.stringify(regions));
      formData.append("itineraryDays", JSON.stringify(itineraryDays));
      const markupValue = markupMode === "percent" ? markupFactor : markupFixed;
      const tablesToSave = getPricedRateTables(
        normalizedRateTables,
        netPrices,
        markupMode,
        markupValue,
        roundMarkup,
      );
      const priceFrom = inferPriceFrom(
        rates,
        tablesToSave,
        priceFromManuallyEdited && typeof values.priceFrom === "string"
          ? values.priceFrom
          : "",
      );
      formData.append("priceFrom", priceFrom);
      formData.append("rateTables", JSON.stringify(tablesToSave));

      imageList
        .map((file) => file.originFileObj)
        .filter(
          (file): file is NonNullable<UploadFile["originFileObj"]> =>
            Boolean(file),
        )
        .forEach((file) => formData.append("images", file));
      formData.append(
        "existingImages",
        JSON.stringify(
          imageList
            .filter((file) => !file.originFileObj && file.url)
            .map((file) => ({
              name: file.name,
              type: file.type,
              size: file.size,
              url: file.url,
            })),
        ),
      );

      const res = await fetchWithTimeout(
        isEditing
          ? `/api/tarifario?id=${encodeURIComponent(tarifario?.id ?? "")}`
          : "/api/tarifario",
        {
          method: isEditing ? "PUT" : "POST",
          body: formData,
          timeoutMs: REQUEST_TIMEOUT_MS,
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo guardar el tarifario.");
      }

      message.success(
        isEditing
          ? "Tarifario actualizado correctamente."
          : "Tarifario guardado correctamente.",
      );
      form.resetFields();
      setFileList([]);
      setImageList([]);
      setRateTables([]);
      setNetPrices(true);
      setMarkupMode("percent");
      setMarkupFactor(0.8);
      setMarkupFixed(10);
      setUploadPanelOpen(true);
      const initialDay = createItineraryDay(1);
      setItineraryDays([initialDay]);
      setActiveItineraryDay(initialDay.key);
      onCreated?.();
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Completa los campos requeridos.";
      message.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xl">
      <div className="flex h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
        <aside
          className={
            uploadPanelOpen
              ? "hidden w-[360px] shrink-0 flex-col border-r border-slate-100 bg-slate-50 p-8 lg:flex"
              : "hidden"
          }
        >
          <p className="mb-8 text-[13px] font-black uppercase tracking-wide text-slate-300">
            Archivos e IA
          </p>

          <div className="flex min-h-0 flex-1 flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg">
            <div className="h-32 shrink-0">
              <Dragger
                {...uploadProps}
                className="h-full"
                showUploadList={false}
                style={{ padding: 0 }}
              >
                <p className="mb-2 text-3xl leading-none text-violet-500">
                  <InboxOutlined className="text-3xl" />
                </p>
                <p className="mx-auto mb-1 max-w-[210px] text-sm font-black uppercase leading-5 text-slate-500">
                  Arrastra archivos
                </p>
                <p className="mx-auto max-w-[220px] text-xs font-semibold leading-4 text-slate-300">
                  PDFs, imagenes, documentos u hojas de calculo.
                </p>
              </Dragger>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-slate-50 p-3">
              {fileList.length > 0 ? (
                fileList.map((file) => (
                  <div
                    key={file.uid}
                    className="mb-2 flex items-center rounded-xl bg-white px-3 py-2 last:mb-0"
                    title={file.name}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                    <span className="ml-2 min-w-0 truncate text-xs font-bold text-slate-500">
                      {file.name}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex h-full min-h-24 items-center justify-center px-4 text-center text-[13px] font-bold uppercase leading-relaxed text-slate-300">
                  Los archivos seleccionados apareceran aqui.
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!canInterpret}
              onClick={handleInterpret}
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-3 text-[13px] font-black uppercase tracking-wide text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconSparkles className="h-4 w-4" />
              {interpreting ? "Interpretando..." : "Interpretar"}
            </button>
          </div>

          <p className="mt-8 text-center text-[13px] font-bold uppercase leading-relaxed text-slate-300">
            La información interpretada se completará automáticamente en el
            formulario.
          </p>
        </aside>

        {/* Vertical toggle handle — desktop only */}
        <button
          type="button"
          onClick={() => setUploadPanelOpen(!uploadPanelOpen)}
          className="group hidden w-5 shrink-0 items-center justify-center border-x border-slate-100 bg-slate-50 transition hover:bg-slate-100 lg:flex"
          aria-label={uploadPanelOpen ? "Colapsar panel" : "Expandir panel"}
        >
          {uploadPanelOpen ? (
            <IconChevronLeft className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
          ) : (
            <IconChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 justify-end px-5 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl bg-slate-100 p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-900"
              aria-label="Cerrar"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-6">
            <p className="mb-4 text-[11px] font-black uppercase tracking-widest text-violet-600">
              Información
            </p>

            <div className="mb-6 rounded-2xl border border-slate-100 p-4 lg:hidden">
              <button
                type="button"
                onClick={() => setUploadPanelOpen(!uploadPanelOpen)}
                className="flex w-full items-center justify-between"
              >
                <p className="text-[11px] font-black uppercase tracking-widest text-violet-600">
                  Archivos e IA
                </p>
                <IconChevronLeft
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    uploadPanelOpen ? "-rotate-90" : "rotate-90"
                  }`}
                />
              </button>
              {uploadPanelOpen && (
                <div className="mt-3">
                  <div className="h-32">
                    <Dragger
                      {...uploadProps}
                      className="h-full"
                      showUploadList={false}
                      style={{ padding: 0 }}
                    >
                      <p className="mb-2 text-3xl leading-none text-violet-500">
                        <InboxOutlined className="text-3xl" />
                      </p>
                      <p className="mx-auto mb-1 max-w-[210px] text-sm font-black uppercase leading-5 text-slate-500">
                        Arrastra archivos
                      </p>
                      <p className="mx-auto max-w-[220px] text-xs font-semibold leading-4 text-slate-300">
                        PDFs, imagenes, documentos u hojas de calculo.
                      </p>
                    </Dragger>
                  </div>

                  {fileList.length > 0 && (
                    <div className="mt-3 max-h-32 overflow-y-auto rounded-2xl bg-slate-50 p-2">
                      {fileList.map((file) => (
                        <div
                          key={file.uid}
                          className="mb-2 flex items-center rounded-xl bg-white px-3 py-2 last:mb-0"
                          title={file.name}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                          <span className="ml-2 min-w-0 truncate text-xs font-bold text-slate-500">
                            {file.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!canInterpret}
                    onClick={handleInterpret}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-3 text-[13px] font-black uppercase tracking-wide text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IconSparkles className="h-4 w-4" />
                    {interpreting ? "Interpretando..." : "Interpretar"}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-100 p-6">
              <Form
                form={form}
                layout="vertical"
                requiredMark={false}
                initialValues={{ type: TARIFARIO_TYPE_DEFAULT }}
                onValuesChange={(changedValues) => {
                  if (
                    Object.prototype.hasOwnProperty.call(
                      changedValues,
                      "priceFrom",
                    )
                  ) {
                    setPriceFromManuallyEdited(true);
                  }
                }}
                className="tarifario-form [&_.ant-form-item]:mb-6 [&_.ant-form-item-label]:pb-2 [&_.ant-form-item-label>label]:text-sm [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item-label>label]:text-slate-600 [&_.ant-input]:min-h-14 [&_.ant-input]:px-4 [&_.ant-input]:text-[17px] [&_.ant-input]:leading-6 [&_.ant-input::placeholder]:text-[15px] [&_.ant-select-selector]:px-4 [&_.ant-select-selector]:text-[17px] [&_.ant-select-selection-placeholder]:text-[15px] [&_.ant-tabs-tab-btn]:text-sm"
              >
                <div className="grid gap-x-5 md:grid-cols-[220px_minmax(0,1fr)]">
                  <Form.Item
                    label="Tipo"
                    name="type"
                    rules={[
                      {
                        required: true,
                        message: "Selecciona el tipo.",
                      },
                    ]}
                  >
                    <Select
                      size="large"
                      className="w-full"
                      options={TARIFARIO_TYPE_OPTIONS}
                      popupMatchSelectWidth
                      styles={{ popup: { root: { zIndex: 1800 } } }}
                      getPopupContainer={() => document.body}
                    />
                  </Form.Item>

                  <Form.Item
                    label="Fechas"
                    name="dates"
                    rules={[
                      {
                        required: true,
                        message: "Ingresa las fechas o periodo.",
                      },
                    ]}
                  >
                    <Input
                      className="h-12 rounded-xl text-lg"
                      placeholder="Ej. Noviembre 2026"
                    />
                  </Form.Item>

                  <Form.Item
                    className="md:col-span-2"
                    label="Titulo"
                    name="title"
                    rules={[
                      {
                        required: true,
                        message: "Ingresa el titulo.",
                      },
                    ]}
                  >
                    <Input
                      className="h-12 rounded-xl text-lg"
                      placeholder="Ej. Vietnam y Camboya en Lujo"
                    />
                  </Form.Item>
                </div>

                <Form.Item
                  label="Destino/destinos"
                  name="destinations"
                  rules={[
                    {
                      required: true,
                      message: "Ingresa al menos un destino.",
                    },
                  ]}
                >
                  <Input
                    className="h-12 rounded-xl text-lg"
                    placeholder="Ej. Hanoi, Bahia de Halong, Angkor Wat"
                  />
                </Form.Item>

                <ConfigProvider theme={catalogSelectTheme}>
                  <Form.Item label="País/países" name="countries">
                    <Select
                      mode="multiple"
                      size="large"
                      allowClear
                      showSearch
                      tokenSeparators={[","]}
                      filterOption={(input, option) =>
                        getCountrySearchRank(
                          input,
                          option as CountrySelectOption | undefined,
                        ) < 3
                      }
                      filterSort={(optionA, optionB, info) => {
                        const rankA = getCountrySearchRank(
                          info.searchValue,
                          optionA as CountrySelectOption | undefined,
                        );
                        const rankB = getCountrySearchRank(
                          info.searchValue,
                          optionB as CountrySelectOption | undefined,
                        );

                        if (rankA !== rankB) return rankA - rankB;
                        return String(optionA.label).localeCompare(
                          String(optionB.label),
                          "es",
                        );
                      }}
                      placeholder="Busca países o pega varios separados por coma"
                      styles={catalogSelectStyles}
                      popupMatchSelectWidth
                      getPopupContainer={(triggerNode) =>
                        triggerNode.parentElement ?? document.body
                      }
                      options={countrySelectOptions}
                      onChange={(values) => handleCountriesChange(values)}
                    />
                  </Form.Item>

                  <Form.Item label="Región/regiones" name="regions">
                    <Select
                      mode="multiple"
                      size="large"
                      allowClear
                      showSearch
                      tokenSeparators={[","]}
                      filterOption={(input, option) =>
                        getRegionSearchRank(
                          input,
                          option as RegionSelectOption | undefined,
                        ) < 3
                      }
                      filterSort={(optionA, optionB, info) => {
                        const rankA = getRegionSearchRank(
                          info.searchValue,
                          optionA as RegionSelectOption | undefined,
                        );
                        const rankB = getRegionSearchRank(
                          info.searchValue,
                          optionB as RegionSelectOption | undefined,
                        );

                        if (rankA !== rankB) return rankA - rankB;
                        return String(optionA.label).localeCompare(
                          String(optionB.label),
                          "es",
                        );
                      }}
                      placeholder="Busca regiones o pega varias separadas por coma"
                      styles={catalogSelectStyles}
                      popupMatchSelectWidth
                      getPopupContainer={(triggerNode) =>
                        triggerNode.parentElement ?? document.body
                      }
                      options={regionSelectOptions}
                    />
                  </Form.Item>
                </ConfigProvider>

                <Form.Item label="Itinerario">
                  <Form.Item name="itinerary" noStyle>
                    <Input type="hidden" />
                  </Form.Item>

                  <Tabs
                    type="card"
                    size="small"
                    activeKey={activeItineraryDay}
                    onChange={setActiveItineraryDay}
                    tabBarExtraContent={
                      <button
                        type="button"
                        onClick={handleAddItineraryDay}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-500 transition hover:bg-slate-50"
                      >
                        +
                      </button>
                    }
                    items={itineraryDays.map((day) => ({
                      key: day.key,
                      label: day.title,
                      children: (
                        <Input.TextArea
                          value={day.content}
                          onChange={(event) =>
                            handleItineraryDayChange(
                              day.key,
                              event.target.value,
                            )
                          }
                          className={textareaClass}
                          placeholder={`Describe el itinerario del ${day.title.toLowerCase()}`}
                          rows={6}
                        />
                      ),
                    }))}
                  />
                </Form.Item>

                <Form.Item label="Incluye" name="includes">
                  <Input.TextArea
                    className={textareaClass}
                    placeholder="Vuelos, traslados, desayunos, tours, entradas..."
                    rows={3}
                  />
                </Form.Item>

                <Form.Item label="No Incluye" name="notIncludes">
                  <Input.TextArea
                    className={textareaClass}
                    placeholder="Gastos no incluidos, propinas, impuestos, servicios opcionales..."
                    rows={3}
                  />
                </Form.Item>

                <Form.Item label="Hoteles/Detalles" name="hotelsDetails">
                  <Input.TextArea
                    className={textareaClass}
                    placeholder="Hoteles sugeridos, categoria, regimen, detalles importantes"
                    rows={3}
                  />
                </Form.Item>

                <Form.Item label="Notas" name="notes">
                  <Input.TextArea
                    className={textareaClass}
                    placeholder="Condiciones, restricciones o comentarios internos"
                    rows={3}
                  />
                </Form.Item>

                <Form.Item label="Resumen de tarifas" name="rates">
                  <Input.TextArea
                    className={textareaClass}
                    placeholder="Ej. Desde $5,980 por persona en ocupacion doble. Opcional si creas tablas."
                    rows={4}
                  />
                </Form.Item>

                <Form.Item
                  label="Precio desde"
                  name="priceFrom"
                  extra="Se detecta automaticamente como el precio mas bajo en acomodacion doble; puedes ajustarlo manualmente."
                >
                  <Input
                    className="h-12 rounded-xl text-lg"
                    placeholder="Ej. $1,295"
                  />
                </Form.Item>

                <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={netPrices}
                      onChange={setNetPrices}
                      style={netPrices ? { backgroundColor: "#8b5cf6" } : {}}
                    />
                    <span className="text-sm font-bold text-slate-700">
                      Precios Netos
                    </span>
                  </div>
                  {!netPrices && (
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Mode toggle */}
                      <div className="flex overflow-hidden rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setMarkupMode("percent")}
                          className={[
                            "px-3 py-1.5 text-xs font-black uppercase tracking-wide transition",
                            markupMode === "percent"
                              ? "bg-violet-500 text-white"
                              : "text-slate-400 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarkupMode("fixed")}
                          className={[
                            "border-l border-slate-200 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition",
                            markupMode === "fixed"
                              ? "bg-violet-500 text-white"
                              : "text-slate-400 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          +$
                        </button>
                      </div>

                      {markupMode === "percent" ? (
                        <InputNumber
                          value={markupFactor}
                          onChange={(value) => setMarkupFactor(value ?? 0.8)}
                          min={0}
                          step={0.1}
                          precision={2}
                          addonAfter="%"
                          size="middle"
                          className="w-36 rounded-xl"
                        />
                      ) : (
                        <InputNumber
                          value={markupFixed}
                          onChange={(value) => setMarkupFixed(value ?? 10)}
                          min={0}
                          step={1}
                          precision={2}
                          addonBefore="+"
                          size="middle"
                          className="w-36 rounded-xl"
                        />
                      )}

                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
                        <Switch
                          checked={roundMarkup}
                          onChange={setRoundMarkup}
                          size="small"
                          style={roundMarkup ? { backgroundColor: "#8b5cf6" } : {}}
                        />
                        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Aproximar
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <RateTablesEditor
                  tables={rateTables}
                  onChange={setRateTables}
                  markupMode={!netPrices ? markupMode : undefined}
                  markupValue={
                    !netPrices
                      ? markupMode === "percent"
                        ? markupFactor
                        : markupFixed
                      : undefined
                  }
                  roundMarkup={!netPrices ? roundMarkup : false}
                />

                <Form.Item label="Imagenes">
                  <div
                    tabIndex={0}
                    onPaste={handleImagePaste}
                    className="rounded-xl outline-none ring-violet-400 transition focus:ring-2"
                  >
                    <Upload.Dragger
                      {...imageUploadProps}
                      className="rounded-xl"
                      style={{ padding: 0 }}
                    >
                      <p className="mb-2 text-3xl leading-none text-violet-500">
                        <InboxOutlined className="text-3xl" />
                      </p>
                      <p className="mx-auto mb-1 max-w-[260px] text-sm font-black uppercase leading-5 text-slate-500">
                        Agrega imagenes del producto
                      </p>
                      <p className="mx-auto max-w-[320px] text-xs font-semibold leading-4 text-slate-300">
                        Puedes subir, arrastrar o pegar imagenes JPG, PNG o
                        WEBP.
                      </p>
                    </Upload.Dragger>
                  </div>
                </Form.Item>
              </Form>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white px-8 py-6">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={interpreting || saving}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-[13px] font-black uppercase tracking-wide text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={interpreting || saving}
                className="flex items-center gap-2 rounded-2xl bg-violet-500 px-7 py-3 text-[13px] font-black uppercase tracking-wide text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconCheck className="h-4 w-4" />
              {saving
                ? "Guardando..."
                : isEditing
                  ? "Actualizar tarifario"
                  : "Guardar tarifario"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RateTablesEditor({
  tables,
  onChange,
  markupMode,
  markupValue,
  roundMarkup = false,
}: {
  tables: TarifarioRateTable[];
  onChange: (tables: TarifarioRateTable[]) => void;
  markupMode?: "percent" | "fixed";
  markupValue?: number;
  roundMarkup?: boolean;
}) {
  const updateTable = (
    tableIndex: number,
    updater: (table: TarifarioRateTable) => TarifarioRateTable,
  ) => {
    onChange(
      tables.map((table, index) =>
        index === tableIndex ? updater(table) : table,
      ),
    );
  };

  const addTable = () => {
    onChange([...tables, createBlankRateTable(tables.length + 1)]);
  };

  const removeTable = (tableIndex: number) => {
    onChange(tables.filter((_, index) => index !== tableIndex));
  };

  const addColumn = (tableIndex: number) => {
    updateTable(tableIndex, (table) => ({
      ...table,
      columns: [...table.columns, `Columna ${table.columns.length + 1}`],
      columnMarkups: [...(table.columnMarkups ?? []), ""],
      rows: table.rows.map((row) => [...row, ""]),
    }));
  };

  const updateColumn = (
    tableIndex: number,
    columnIndex: number,
    value: string,
  ) => {
    updateTable(tableIndex, (table) => ({
      ...table,
      columns: table.columns.map((column, index) =>
        index === columnIndex ? value : column,
      ),
    }));
  };

  const updateColumnMarkup = (
    tableIndex: number,
    columnIndex: number,
    value: string,
  ) => {
    updateTable(tableIndex, (table) => ({
      ...table,
      columnMarkups: table.columns.map((_, index) =>
        index === columnIndex ? value : (table.columnMarkups?.[index] ?? ""),
      ),
    }));
  };

  const removeColumn = (tableIndex: number, columnIndex: number) => {
    updateTable(tableIndex, (table) => {
      if (table.columns.length <= 1) return table;

      return {
        ...table,
        columns: table.columns.filter((_, index) => index !== columnIndex),
        columnMarkups: table.columns
          .map((_, index) => table.columnMarkups?.[index] ?? "")
          .filter((_, index) => index !== columnIndex),
        rows: table.rows.map((row) =>
          row.filter((_, index) => index !== columnIndex),
        ),
      };
    });
  };

  const addRow = (tableIndex: number) => {
    updateTable(tableIndex, (table) => ({
      ...table,
      rows: [...table.rows, table.columns.map(() => "")],
    }));
  };

  const removeRow = (tableIndex: number, rowIndex: number) => {
    updateTable(tableIndex, (table) => {
      if (table.rows.length <= 1) return table;

      return {
        ...table,
        rows: table.rows.filter((_, index) => index !== rowIndex),
      };
    });
  };

  const updateCell = (
    tableIndex: number,
    rowIndex: number,
    columnIndex: number,
    value: string,
  ) => {
    updateTable(tableIndex, (table) => ({
      ...table,
      rows: table.rows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? table.columns.map((_, currentColumnIndex) =>
              currentColumnIndex === columnIndex
                ? value
                : (row[currentColumnIndex] ?? ""),
            )
          : row,
      ),
    }));
  };

  const getDisplayedCell = (
    table: TarifarioRateTable,
    row: string[],
    columnIndex: number,
  ) => {
    const base = row[columnIndex] ?? "";
    const columnMarked = applyColumnSurchargeToCell(
      base,
      parseMarkupPercent(table.columnMarkups?.[columnIndex]),
    );

    if (
      markupMode === undefined ||
      markupValue === undefined ||
      markupValue <= 0
    ) {
      return columnMarked;
    }

    return applyMarkupToCell(
      columnMarked,
      markupMode,
      markupValue,
      roundMarkup,
    );
  };

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-violet-600">
            Tablas de tarifas
          </p>
        </div>

        <button
          type="button"
          onClick={addTable}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-violet-600"
        >
          <IconPlus className="h-4 w-4" />
          Nueva tabla
        </button>
      </div>

      {tables.length === 0 ? (
        <button
          type="button"
          onClick={addTable}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-sm font-black uppercase tracking-wide text-slate-400 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
        >
          <IconPlus className="h-4 w-4" />
          Crear tabla manual
        </button>
      ) : (
        <div className="space-y-5">
          {tables.map((table, tableIndex) => (
            <div
              key={tableIndex}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="border-b border-slate-100 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Tabla {tableIndex + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeTable(tableIndex)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={table.title}
                    onChange={(event) =>
                      updateTable(tableIndex, (current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className="h-10 rounded-xl font-semibold"
                    placeholder="Titulo de tabla"
                  />
                  <Input
                    value={table.subtitle}
                    onChange={(event) =>
                      updateTable(tableIndex, (current) => ({
                        ...current,
                        subtitle: event.target.value,
                      }))
                    }
                    className="h-10 rounded-xl font-semibold"
                    placeholder="Subtitulo, fechas o condiciones"
                  />
                </div>
              </div>

              <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[680px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-white text-slate-600">
                      {table.columns.map((_, columnIndex) => (
                        <th
                          key={`markup-${columnIndex}`}
                          className="min-w-[140px] border border-slate-200 p-2 align-top"
                        >
                          <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-white px-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                            <input
                              value={table.columnMarkups?.[columnIndex] ?? ""}
                              onChange={(event) =>
                                updateColumnMarkup(
                                  tableIndex,
                                  columnIndex,
                                  event.target.value,
                                )
                              }
                              className="min-w-0 flex-1 border-0 bg-transparent px-0 text-center text-sm font-bold leading-none text-slate-700 outline-none placeholder:text-slate-300"
                              placeholder="Recargo"
                            />
                            <span className="ml-1 shrink-0 text-sm font-black text-slate-700">
                              %
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="w-12 border border-slate-200 p-2" />
                    </tr>
                    <tr className="bg-violet-500 text-white">
                      {table.columns.map((column, columnIndex) => (
                        <th
                          key={columnIndex}
                          className="min-w-[140px] border border-violet-600 p-2 align-top"
                        >
                          <div className="flex items-start gap-2">
                            <Input
                              value={column}
                              onChange={(event) =>
                                updateColumn(
                                  tableIndex,
                                  columnIndex,
                                  event.target.value,
                                )
                              }
                              className="h-9 rounded-lg text-center text-sm font-black"
                              placeholder={`Columna ${columnIndex + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                removeColumn(tableIndex, columnIndex)
                              }
                              disabled={table.columns.length <= 1}
                              className="mt-0.5 rounded-lg bg-white/80 p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="Eliminar columna"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </th>
                      ))}
                      <th className="w-12 border border-slate-500 p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {table.columns.map((_, columnIndex) => (
                          <td
                            key={`${rowIndex}-${columnIndex}`}
                            className="border border-slate-300 p-2"
                          >
                            {(() => {
                              const base = row[columnIndex] ?? "";
                              const computed = getDisplayedCell(
                                table,
                                row,
                                columnIndex,
                              );
                              const hasMarkup = computed !== base;
                              return (
                                <>
                                  <Input
                                    value={hasMarkup ? computed : base}
                                    readOnly={hasMarkup}
                                    onChange={
                                      hasMarkup
                                        ? undefined
                                        : (event) =>
                                            updateCell(
                                              tableIndex,
                                              rowIndex,
                                              columnIndex,
                                              event.target.value,
                                            )
                                    }
                                    className={[
                                      "h-10 rounded-lg text-center font-semibold",
                                      hasMarkup ? "cursor-default" : "",
                                    ].join(" ")}
                                    placeholder="Valor"
                                  />
                                  {hasMarkup && (
                                    <p className="mt-1 text-center text-xs text-slate-400">
                                      {base}
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </td>
                        ))}
                        <td className="border border-slate-300 p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(tableIndex, rowIndex)}
                            disabled={table.rows.length <= 1}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Eliminar fila"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => addRow(tableIndex)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                >
                  <IconPlus className="h-4 w-4" />
                  Fila
                </button>
                <button
                  type="button"
                  onClick={() => addColumn(tableIndex)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                >
                  <IconPlus className="h-4 w-4" />
                  Columna
                </button>
              </div>

              <div className="border-t border-slate-100 p-4">
                <Input.TextArea
                  value={table.notes.join("\n")}
                  onChange={(event) =>
                    updateTable(tableIndex, (current) => ({
                      ...current,
                      notes: event.target.value
                        .split("\n")
                        .map((note) => note.trim())
                        .filter(Boolean),
                    }))
                  }
                  className={textareaClass}
                  placeholder="Notas de esta tabla, una por linea"
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs: number },
) {
  const { timeoutMs, ...requestInit } = init;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...requestInit,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("La solicitud tardó demasiado. Intenta nuevamente.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function waitForTarifarioInterpretation(
  jobId: string,
): Promise<TarifarioInterpretResult> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < INTERPRETATION_POLL_TIMEOUT_MS) {
    await wait(INTERPRETATION_POLL_INTERVAL_MS);

    const res = await fetchWithTimeout(
      `/api/tarifario/interpret/status?jobId=${encodeURIComponent(jobId)}`,
      {
        method: "GET",
        timeoutMs: 30_000,
      },
    );
    const data = (await res.json().catch(() => ({}))) as
      TarifarioInterpretStatusResponse;

    if (!res.ok) {
      throw new Error(data.error ?? "No se pudo consultar la interpretación.");
    }

    if (data.status === "error") {
      throw new Error(data.error ?? "No se pudo interpretar la informacion.");
    }

    if (data.status === "done") {
      if (!data.result) {
        throw new Error("La interpretación terminó sin resultado.");
      }

      return data.result;
    }
  }

  throw new Error("La interpretación tardó demasiado. Intenta nuevamente.");
}

function wait(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}
