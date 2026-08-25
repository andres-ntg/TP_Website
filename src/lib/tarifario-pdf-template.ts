export type TarifarioPdfRateTable = {
  title?: string;
  subtitle?: string;
  columns?: string[];
  rows?: string[][];
  notes?: string[];
};

export type TarifarioPdfCountry = {
  nombre: string;
  codigo: string;
};

export type TarifarioPdfRegion = {
  nombre: string;
  codigo: string;
};

type TablerIconNode = Array<[string, Record<string, string>]>;

const calendarIconNode: TablerIconNode = [
  [
    "path",
    {
      d: "M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12",
    },
  ],
  ["path", { d: "M16 3v4" }],
  ["path", { d: "M8 3v4" }],
  ["path", { d: "M4 11h16" }],
  ["path", { d: "M11 15h1" }],
  ["path", { d: "M12 15v3" }],
];

const circleCheckIconNode: TablerIconNode = [
  ["path", { d: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" }],
  ["path", { d: "M9 12l2 2l4 -4" }],
];

const circleXIconNode: TablerIconNode = [
  ["path", { d: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" }],
  ["path", { d: "M10 10l4 4m0 -4l-4 4" }],
];

const mapPinIconNode: TablerIconNode = [
  ["path", { d: "M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" }],
  [
    "path",
    {
      d: "M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0",
    },
  ],
];

const notesIconNode: TablerIconNode = [
  [
    "path",
    {
      d: "M5 5a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -14",
    },
  ],
  ["path", { d: "M9 7l6 0" }],
  ["path", { d: "M9 11l6 0" }],
  ["path", { d: "M9 15l4 0" }],
];

const hotelIconNode: TablerIconNode = [
  ["path", { d: "M3 21l18 0" }],
  ["path", { d: "M4 21v-13a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v13" }],
  ["path", { d: "M9 21v-6h6v6" }],
  ["path", { d: "M8 10l0 .01" }],
  ["path", { d: "M12 10l0 .01" }],
  ["path", { d: "M16 10l0 .01" }],
];

const routeIconNode: TablerIconNode = [
  ["path", { d: "M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" }],
  ["path", { d: "M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4" }],
  ["path", { d: "M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5" }],
];

const ticketIconNode: TablerIconNode = [
  ["path", { d: "M15 5l0 2" }],
  ["path", { d: "M15 11l0 2" }],
  ["path", { d: "M15 17l0 2" }],
  [
    "path",
    {
      d: "M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2",
    },
  ],
];

export type TarifarioPdfPayload = {
  id: string;
  type?: "Paquete" | "Circuito" | "Tarifario";
  title: string;
  dates: string;
  validity?: string;
  destinations: string;
  countries?: Array<string | TarifarioPdfCountry>;
  regions?: Array<string | TarifarioPdfRegion>;
  itinerary: string;
  itineraryDays?: Array<{
    title: string;
    content: string;
  }>;
  includes?: string;
  notIncludes?: string;
  hotelsDetails?: string;
  notes?: string;
  rates?: string;
  priceFrom?: string;
  rateTables?: TarifarioPdfRateTable[];
  heroImageDataUri: string;
  logoDataUri: string;
};

const FALLBACK_TEXT = "No especificado";

export function safeTarifarioPdfFileName(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "tarifario"
  );
}

export function renderTarifarioPdfHtml(payload: TarifarioPdfPayload) {
  if (payload.type === "Tarifario") {
    return renderCompactTarifarioPdfHtml(payload);
  }

  const itineraryDays = getDisplayItineraryDays(payload);
  const icons = {
    destination: renderIcon(mapPinIconNode),
    calendar: renderIcon(calendarIconNode),
    route: renderIcon(routeIconNode),
    includes: renderIcon(circleCheckIconNode),
    excludes: renderIcon(circleXIconNode),
    hotels: renderIcon(hotelIconNode),
    rates: renderIcon(ticketIconNode),
    notes: renderIcon(notesIconNode),
  };

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(payload.title)}</title>
    <style>
      @page {
        size: A4;
        margin: 11mm 0 13mm 0;
      }

      @page:first {
        margin: 0 0 13mm 0;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #ffffff;
        color: #172033;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        line-height: 1.45;
      }

      .page {
        width: 210mm;
        min-height: 297mm;
        background: #fff;
      }

      .hero {
        position: relative;
        height: 76mm;
        background-image: linear-gradient(rgba(15, 12, 24, 0.08), rgba(15, 12, 24, 0.12)), url("${payload.heroImageDataUri}");
        background-position: center;
        background-size: cover;
      }

      .hero-logo-mark {
        position: absolute;
        top: 0;
        right: 0;
        align-items: center;
        background: #ffffff;
        border-bottom-left-radius: 38mm 31mm;
        display: flex;
        height: 34mm;
        justify-content: center;
        padding: 5mm 8mm 7mm 15mm;
        width: 57mm;
      }

      .hero-logo {
        width: 33mm;
        height: auto;
        object-fit: contain;
      }

      .title-band {
        background: #4b148c;
        color: #fff;
        padding: 6mm 16mm 5mm;
      }

      .title-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5mm 3mm;
        justify-content: center;
        margin-top: 3mm;
      }

      .title-tag {
        border-left: 1px solid rgba(255, 255, 255, 0.42);
        color: rgba(255, 255, 255, 0.88);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.08em;
        line-height: 1.15;
        padding-left: 2.2mm;
        text-transform: uppercase;
      }

      .title-tag:first-child {
        border-left: 0;
        padding-left: 0;
      }

      .title-tag span {
        color: rgba(255, 255, 255, 0.62);
        margin-right: 1.2mm;
      }

      .agency-strip {
        align-items: center;
        border-bottom: 1px solid #d9dce4;
        color: #334155;
        display: flex;
        font-size: 10.8px;
        font-weight: 700;
        gap: 4mm;
        justify-content: center;
        padding: 2.2mm 16mm;
      }

      .agency-strip strong {
        color: #4b148c;
        font-size: 11.8px;
        font-weight: 900;
      }

      h1 {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 25px;
        line-height: 1.08;
        letter-spacing: 0.01em;
        text-align: center;
      }

      main {
        padding: 9mm 16mm 13mm;
      }

      .travel-details {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4mm;
        margin-bottom: 6mm;
        padding-bottom: 4.5mm;
        border-bottom: 1px solid #d9dce4;
      }

      .fact {
        display: grid;
        grid-template-columns: 5mm 1fr;
        gap: 2mm;
        align-items: start;
      }

      .fact > span {
        align-items: center;
        color: #4b148c;
        display: flex;
        height: 5mm;
        justify-content: center;
      }

      .pdf-icon {
        display: block;
        height: 15px;
        width: 15px;
      }

      .fact-label {
        display: block;
        margin-bottom: 1mm;
        color: #6d28d9;
        font-size: 8.2px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .fact strong {
        display: block;
        color: #172033;
        font-size: 13px;
        line-height: 1.3;
      }

      section {
        margin-bottom: 6mm;
      }

      h2 {
        display: flex;
        align-items: center;
        gap: 2mm;
        margin: 0 0 3mm;
        color: #111827;
        font-size: 14px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .section-icon {
        color: #4b148c;
        display: inline-flex;
        flex: 0 0 auto;
      }

      .timeline {
        display: grid;
        gap: 3.5mm;
      }

      .day {
      
        padding-left: 3mm;
      
      }

      .day:last-child {
        margin-bottom: 0;
      }

      h3 {
        margin: 0 0 2mm;
        color: #4b148c;
        font-size: 13.5px;
        font-weight: 900;
      }

      p {
        margin: 0;
      }

      .preline {
        white-space: pre-line;
      }

      .stack {
        display: grid;
        gap: 3.5mm;
      }

      .panel {
        border: 1px solid #d9dce4;
        border-left: 3px solid #4b148c;
        padding: 4mm;
        break-inside: avoid;
      }

      .panel h3 {
        align-items: center;
        display: flex;
        gap: 2mm;
        margin-bottom: 2.2mm;
        color: #111827;
        font-size: 12.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .panel p,
      .plain-rates,
      .notes,
      .day p {
        font-size: 13px;
      }

      .bullet-list {
        margin: 0;
        padding-left: 5mm;
      }

      .bullet-list li {
        margin: 0 0 1.4mm;
        font-size: 13px;
        line-height: 1.42;
      }

      .bullet-list li:last-child {
        margin-bottom: 0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 4mm;
        break-inside: avoid;
      }

      th {
        background: #4b148c;
        color: #fff;
        font-size: 10.8px;
        letter-spacing: 0.04em;
        text-align: left;
      }

      th,
      td {
        border: 1px solid #d9dce4;
        padding: 2.2mm;
        vertical-align: top;
      }

      td {
        color: #1f2937;
        font-size: 11.8px;
        white-space: pre-line;
      }

      .table-block {
        margin-bottom: 5mm;
        break-inside: avoid;
      }

      .table-title {
        margin: 0 0 1mm;
        color: #4b148c;
        font-size: 12.5px;
        font-weight: 900;
      }

      .table-subtitle,
      .table-note {
        color: #64748b;
        font-size: 11px;
        white-space: pre-line;
      }

      .plain-rates {
        border: 1px solid #d9dce4;
        padding: 4mm;
        white-space: pre-line;
      }

      .text-block {
        color: #334155;
        font-size: 13px;
        white-space: pre-line;
      }

      .notes {
        border-left: 3px solid #4b148c;
        padding-left: 4mm;
        color: #334155;
        white-space: pre-line;
      }
    </style>
  </head>
  <body>
    <article class="page">
      <div class="hero">
        <div class="hero-logo-mark">
          <img class="hero-logo" src="${payload.logoDataUri}" alt="Travel Place" />
        </div>
      </div>
      <header class="title-band">
        <h1>${escapeHtml(payload.title || FALLBACK_TEXT)}</h1>
        ${renderLocationTags(payload, "title-tags")}
      </header>
      <div class="agency-strip">
        <span>PBX: (+502) 2316-8151</span>
        <span>info@travelplacegt.com</span>
      </div>
      <main>
        <section class="travel-details" aria-label="Detalles del viaje">
          <div class="fact">
            <span>${icons.destination}</span>
            <div>
              <span class="fact-label">Destino</span>
              <strong>${escapeHtml(payload.destinations || FALLBACK_TEXT)}</strong>
            </div>
          </div>
          <div class="fact">
            <span>${icons.calendar}</span>
            <div>
              <span class="fact-label">Fechas</span>
              <strong>${escapeHtml(payload.dates || FALLBACK_TEXT)}</strong>
            </div>
          </div>
          <div class="fact">
            <span>${icons.route}</span>
            <div>
              <span class="fact-label">Días de viaje</span>
              <strong>${escapeHtml(getTripDuration(payload))}</strong>
            </div>
          </div>
        </section>

        ${renderItinerarySection(itineraryDays, icons.route)}
        ${renderListSection("Tarifa incluye", payload.includes, icons.includes)}
        ${renderListSection("No Incluye", payload.notIncludes, icons.excludes)}
        ${renderTextSection("Hoteles y detalles", payload.hotelsDetails, icons.hotels)}
        ${renderRatesSection(payload, icons.rates)}
        ${renderNotesSection(payload.notes, icons.notes)}
      </main>
    </article>
  </body>
</html>`;
}

function renderCompactTarifarioPdfHtml(payload: TarifarioPdfPayload) {
  const icons = {
    destination: renderIcon(mapPinIconNode),
    calendar: renderIcon(calendarIconNode),
    includes: renderIcon(circleCheckIconNode),
    excludes: renderIcon(circleXIconNode),
    hotels: renderIcon(hotelIconNode),
    rates: renderIcon(ticketIconNode),
    notes: renderIcon(notesIconNode),
  };

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(payload.title)}</title>
    <style>
      @page {
        size: A4;
        margin: 7mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #ffffff;
        color: #172033;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.38;
      }

      .sheet {
        width: 196mm;
        min-height: 283mm;
        background: #fff;
      }

      .header {
        align-items: center;
        border-bottom: 1.2mm solid #4b148c;
        display: grid;
        gap: 5mm;
        grid-template-columns: 32mm 1fr auto;
        padding-bottom: 4mm;
      }

      .logo {
        display: block;
        height: auto;
        max-height: 17mm;
        object-fit: contain;
        width: 31mm;
      }

      .eyebrow {
        color: #6d28d9;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.18em;
        margin: 0 0 1mm;
        text-transform: uppercase;
      }

      h1 {
        color: #111827;
        font-size: 24px;
        line-height: 1.08;
        margin: 0;
      }

      .company-card {
        border-left: 2px solid #4b148c;
        color: #172033;
        min-width: 32mm;
        padding: 1.5mm 0 1.5mm 4mm;
        text-align: right;
      }

      .company-name {
        color: #4b148c;
        display: block;
        font-size: 12px;
        font-weight: 900;
        line-height: 1.15;
        margin-bottom: 1mm;
      }

      .company-line {
        color: #334155;
        display: block;
        font-size: 10.5px;
        font-weight: 700;
        line-height: 1.25;
      }

      .compact-title-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 1.3mm 2.6mm;
        margin-top: 2mm;
      }

      .compact-title-tags .title-tag {
        border-left: 1px solid #cbd5e1;
        color: #475569;
        font-size: 8.6px;
        font-weight: 800;
        letter-spacing: 0.08em;
        line-height: 1.15;
        padding-left: 2mm;
        text-transform: uppercase;
      }

      .compact-title-tags .title-tag:first-child {
        border-left: 0;
        padding-left: 0;
      }

      .compact-title-tags .title-tag span {
        color: #94a3b8;
        margin-right: 1mm;
      }

      .facts {
        border-bottom: 1px solid #d9dce4;
        display: grid;
        gap: 2.8mm;
        grid-template-columns: repeat(3, 1fr);
        margin: 4mm 0 3.5mm;
        padding-bottom: 3.5mm;
      }

      .fact {
        display: grid;
        gap: 1.2mm;
        grid-template-columns: 4mm 1fr;
        min-width: 0;
      }

      .fact > span {
        align-items: center;
        color: #4b148c;
        display: flex;
        height: 4mm;
        justify-content: center;
      }

      .pdf-icon {
        display: block;
        height: 13px;
        width: 13px;
      }

      .fact-label {
        color: #6d28d9;
        display: block;
        font-size: 8.2px;
        font-weight: 900;
        letter-spacing: 0.14em;
        margin-bottom: 0.4mm;
        text-transform: uppercase;
      }

      .fact strong {
        color: #172033;
        display: block;
        font-size: 11.5px;
        line-height: 1.32;
        overflow-wrap: anywhere;
      }

      section {
        margin-bottom: 3.5mm;
      }

      h2 {
        align-items: center;
        border-bottom: 1px solid #d9dce4;
        color: #111827;
        display: flex;
        font-size: 12px;
        font-weight: 900;
        gap: 1.6mm;
        letter-spacing: 0.12em;
        margin: 0 0 2mm;
        padding-bottom: 1.2mm;
        text-transform: uppercase;
      }

      .section-icon {
        color: #4b148c;
        display: inline-flex;
        flex: 0 0 auto;
      }

      .table-block {
        margin-bottom: 2.8mm;
      }

      .table-title {
        color: #4b148c;
        font-size: 12px;
        font-weight: 900;
        margin: 0 0 0.5mm;
      }

      .table-subtitle,
      .table-note {
        color: #64748b;
        font-size: 10px;
        margin: 0 0 1mm;
        white-space: pre-line;
      }

      table {
        border-collapse: collapse;
        table-layout: auto;
        width: 100%;
      }

      th {
        background: #4b148c;
        color: #fff;
        font-size: 9.5px;
        font-weight: 900;
        line-height: 1.15;
        text-align: center;
        white-space: nowrap;
      }

      th,
      td {
        border: 0;
        padding: 1.1mm 1.35mm;
        vertical-align: top;
      }

      tbody tr:nth-child(odd) td {
        background: #ffffff;
      }

      tbody tr:nth-child(even) td {
        background: #f1e8ff;
      }

      td {
        color: #1f2937;
        font-size: 9.8px;
        line-height: 1.18;
        overflow-wrap: normal;
        white-space: nowrap;
      }

      td:first-child,
      th:first-child {
        text-align: left;
      }

      td:not(:first-child) {
        text-align: center;
      }

      .dense th,
      .dense td {
        font-size: 9px;
        padding: 0.9mm 1.05mm;
      }

      tr {
        break-inside: avoid;
      }

      .plain-rates {
        border: 1px solid #d9dce4;
        color: #1f2937;
        font-size: 10.8px;
        line-height: 1.35;
        padding: 3mm;
        white-space: pre-line;
      }

      .two-col {
        display: grid;
        gap: 4mm;
        grid-template-columns: 1fr 1fr;
      }

      .bullet-list {
        margin: 0;
        padding-left: 4mm;
      }

      .bullet-list li {
        font-size: 10.8px;
        line-height: 1.35;
        margin: 0 0 1mm;
      }

      .text-block,
      .notes {
        color: #334155;
        font-size: 10.8px;
        line-height: 1.35;
        margin: 0;
        white-space: pre-line;
      }

      .notes {
        border-left: 2px solid #4b148c;
        padding-left: 2.5mm;
      }
    </style>
  </head>
  <body>
    <article class="sheet">
      <header class="header">
        <img class="logo" src="${payload.logoDataUri}" alt="Travel Place" />
        <div>
          <p class="eyebrow">Tarifario</p>
          <h1>${escapeHtml(payload.title || FALLBACK_TEXT)}</h1>
          ${renderLocationTags(payload, "compact-title-tags")}
        </div>
        <div class="company-card">
          <span class="company-name">Travel Place</span>
          <span class="company-line">PBX: (+502) 2316-8151</span>
          <span class="company-line">info@travelplacegt.com</span>
        </div>
      </header>

      <section class="facts" aria-label="Resumen del tarifario">
        <div class="fact">
          <span>${icons.destination}</span>
          <div>
            <span class="fact-label">Destino</span>
            <strong>${escapeHtml(payload.destinations || FALLBACK_TEXT)}</strong>
          </div>
        </div>
        <div class="fact">
          <span>${icons.calendar}</span>
          <div>
            <span class="fact-label">Fechas</span>
            <strong>${escapeHtml(payload.dates || FALLBACK_TEXT)}</strong>
          </div>
        </div>
      </section>

      ${renderCompactRatesSection(payload, icons.rates)}
      ${renderCompactInclusionSections(payload, icons.includes, icons.excludes)}
      ${renderCompactTextSection("Hoteles y detalles", payload.hotelsDetails, icons.hotels)}
      ${renderCompactTextSection("Anotaciones", payload.notes, icons.notes, "notes")}
    </article>
  </body>
</html>`;
}

function getCountryNames(payload: TarifarioPdfPayload) {
  return (payload.countries ?? [])
    .map((country) => (typeof country === "string" ? country : country.nombre))
    .filter(Boolean);
}

function getRegionNames(payload: TarifarioPdfPayload) {
  return (payload.regions ?? [])
    .map((region) => (typeof region === "string" ? region : region.nombre))
    .filter(Boolean);
}

function renderLocationTags(payload: TarifarioPdfPayload, className: string) {
  const countries = getCountryNames(payload);
  const regions = getRegionNames(payload);
  const tags = [
    countries.length
      ? {
          label: countries.join(", "),
          type: countries.length > 1 ? "Países" : "País",
        }
      : null,
    regions.length
      ? {
          label: regions.join(", "),
          type: regions.length > 1 ? "Regiones" : "Región",
        }
      : null,
  ].filter((tag): tag is { label: string; type: string } => Boolean(tag));

  if (!tags.length) return "";

  return `<div class="${escapeHtml(className)}">${tags
    .map(
      (tag) =>
        `<span class="title-tag"><span>${escapeHtml(tag.type)}</span>${escapeHtml(tag.label)}</span>`,
    )
    .join("")}</div>`;
}

function renderIcon(iconNode: TablerIconNode) {
  return `<svg class="pdf-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${iconNode
    .map(([tag, attrs]) => {
      const attrText = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${escapeHtml(key)}="${escapeHtml(value)}"`)
        .join(" ");

      return `<${tag}${attrText ? ` ${attrText}` : ""} />`;
    })
    .join("")}</svg>`;
}

function renderItinerarySection(
  itineraryDays: Array<{ title: string; content: string }>,
  icon: string,
) {
  if (itineraryDays.length === 0) return "";

  return `<section>
    <h2><span class="section-icon">${icon}</span>Itinerario completo</h2>
    <div class="timeline">
      ${itineraryDays
        .map(
          (day) => `<div class="day">
            <h3>${escapeHtml(day.title)}</h3>
            <p class="preline">${escapeHtml(day.content)}</p>
          </div>`,
        )
        .join("")}
    </div>
  </section>`;
}

function renderListSection(
  title: string,
  content: string | undefined,
  icon: string,
) {
  const listContent = content?.trim() ?? "";
  if (!listContent) return "";

  return `<section>
    <h2><span class="section-icon">${icon}</span>${escapeHtml(title)}</h2>
    ${renderBulletList(listContent)}
  </section>`;
}

function renderTextSection(
  title: string,
  content: string | undefined,
  icon: string,
) {
  if (!hasText(content)) return "";

  return `<section>
    <h2><span class="section-icon">${icon}</span>${escapeHtml(title)}</h2>
    <p class="text-block">${escapeHtml(content?.trim() ?? "")}</p>
  </section>`;
}

function renderRatesSection(payload: TarifarioPdfPayload, icon: string) {
  if (!hasRates(payload)) return "";

  return `<section>
    <h2><span class="section-icon">${icon}</span>Tarifas</h2>
    ${renderRates(payload)}
  </section>`;
}

function renderCompactRatesSection(payload: TarifarioPdfPayload, icon: string) {
  if (!hasRates(payload)) return "";

  return `<section>
    <h2><span class="section-icon">${icon}</span>Tarifas</h2>
    ${renderCompactRates(payload)}
  </section>`;
}

function renderCompactInclusionSections(
  payload: TarifarioPdfPayload,
  includesIcon: string,
  excludesIcon: string,
) {
  const includes = renderCompactListSection(
    "Incluye",
    payload.includes,
    includesIcon,
  );
  const excludes = renderCompactListSection(
    "No incluye",
    payload.notIncludes,
    excludesIcon,
  );

  if (!includes && !excludes) return "";

  return `<div class="two-col">${includes}${excludes}</div>`;
}

function renderCompactListSection(
  title: string,
  content: string | undefined,
  icon: string,
) {
  const listContent = content?.trim() ?? "";
  if (!listContent) return "";

  return `<section>
    <h2><span class="section-icon">${icon}</span>${escapeHtml(title)}</h2>
    ${renderBulletList(listContent)}
  </section>`;
}

function renderCompactTextSection(
  title: string,
  content: string | undefined,
  icon: string,
  className = "text-block",
) {
  if (!hasText(content)) return "";

  return `<section>
    <h2><span class="section-icon">${icon}</span>${escapeHtml(title)}</h2>
    <p class="${escapeHtml(className)}">${escapeHtml(content?.trim() ?? "")}</p>
  </section>`;
}

function renderNotesSection(notes: string | undefined, icon: string) {
  if (!hasText(notes)) return "";

  return `<section>
    <h2><span class="section-icon">${icon}</span>Anotaciones</h2>
    <p class="notes">${escapeHtml(notes?.trim() ?? "")}</p>
  </section>`;
}

function renderRates(payload: TarifarioPdfPayload) {
  const tables = payload.rateTables?.filter(
    (table) => table.columns?.length && table.rows?.length,
  );

  if (tables?.length) {
    return tables.map(renderRateTable).join("");
  }

  return `<div class="plain-rates">${escapeHtml(payload.rates?.trim() ?? "")}</div>`;
}

function renderCompactRates(payload: TarifarioPdfPayload) {
  const tables = payload.rateTables?.filter(
    (table) => table.columns?.length && table.rows?.length,
  );

  if (tables?.length) {
    return tables.map(renderCompactRateTable).join("");
  }

  return `<div class="plain-rates">${escapeHtml(payload.rates?.trim() ?? "")}</div>`;
}

function renderRateTable(table: TarifarioPdfRateTable) {
  const columns = table.columns ?? [];
  const rows = table.rows ?? [];

  return `<div class="table-block">
    ${table.title ? `<p class="table-title">${escapeHtml(table.title)}</p>` : ""}
    ${table.subtitle ? `<p class="table-subtitle">${escapeHtml(table.subtitle)}</p>` : ""}
    <table>
      <thead>
        <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${columns
                .map((_, index) => `<td>${escapeHtml(row[index] || "-")}</td>`)
                .join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
    ${(table.notes ?? [])
      .map((note) => `<p class="table-note">${escapeHtml(note)}</p>`)
      .join("")}
  </div>`;
}

function renderCompactRateTable(table: TarifarioPdfRateTable) {
  const columns = table.columns ?? [];
  const rows = table.rows ?? [];
  const densityClass = columns.length > 6 ? " dense" : "";

  return `<div class="table-block">
    ${table.title ? `<p class="table-title">${escapeHtml(table.title)}</p>` : ""}
    ${table.subtitle ? `<p class="table-subtitle">${escapeHtml(table.subtitle)}</p>` : ""}
    <table class="${densityClass.trim()}">
      <thead>
        <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${columns
                .map((_, index) => `<td>${escapeHtml(row[index] || "-")}</td>`)
                .join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
    ${(table.notes ?? [])
      .map((note) => `<p class="table-note">${escapeHtml(note)}</p>`)
      .join("")}
  </div>`;
}

function getDisplayItineraryDays(payload: TarifarioPdfPayload) {
  const days = payload.itineraryDays
    ?.map((day, index) => ({
      title: day.title?.trim() || `Día ${index + 1}`,
      content: day.content?.trim() || "",
    }))
    .filter((day) => day.content);

  if (days?.length) return days;
  if (!hasText(payload.itinerary)) return [];

  return [
    {
      title: "Itinerario",
      content: payload.itinerary?.trim() ?? "",
    },
  ];
}

function renderBulletList(value: string) {
  const items = splitListItems(value);

  return `<ul class="bullet-list">${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function splitListItems(value: string) {
  return value
    .split(/\r?\n|(?:\s+-\s+)|(?:\s+•\s+)|(?:\s+\*\s+)/)
    .map((item) => item.trim().replace(/^[\-•*]\s*/, ""))
    .filter(Boolean);
}

function hasRates(payload: TarifarioPdfPayload) {
  return Boolean(
    payload.rateTables?.some(
      (table) => table.columns?.length && table.rows?.length,
    ) || hasText(payload.rates),
  );
}

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

function getTripDuration(payload: TarifarioPdfPayload) {
  const dayCount = payload.itineraryDays?.filter((day) =>
    day.content?.trim(),
  ).length;

  if (dayCount && dayCount > 1) return `${dayCount} días`;
  return "Itinerario general";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
