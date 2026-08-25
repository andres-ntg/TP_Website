"use client";

import { useState, type ReactNode } from "react";
import {
  IconCalendar,
  IconCamera,
  IconHotelService,
  IconMapPin,
  IconNotes,
  IconRoute,
  IconTicket,
} from "@tabler/icons-react";
import { Modal } from "antd";
import type { TarifarioRateTable } from "./NewTarifarioModal";

type TarifarioCountry = {
  nombre: string;
  codigo: string;
};

type TarifarioRegion = {
  nombre: string;
  codigo: string;
};

export type TarifarioDetailItem = {
  id: string;
  type?: "Paquete" | "Circuito" | "Tarifario";
  title: string;
  dates: string;
  validity?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  destinations: string;
  countries?: Array<string | TarifarioCountry>;
  regions?: Array<string | TarifarioRegion>;
  itinerary: string;
  itineraryDays?: Array<{
    key: string;
    title: string;
    content: string;
  }>;
  includes?: string;
  notIncludes?: string;
  hotelsDetails?: string;
  notes?: string;
  rates: string;
  priceFrom?: string;
  rateTables?: TarifarioRateTable[];
  images?: Array<{
    url: string;
    name?: string;
    type?: string;
    size?: number;
  }>;
  createdByUser?: {
    sub?: string;
    name?: string;
    email?: string;
    picture?: string;
  } | null;
};

type TarifarioDetailModalProps = {
  tarifario: TarifarioDetailItem;
  onClose: () => void;
};

type TarifarioDetailSection = "details" | "itinerary" | "notes";
type TarifarioMobileSection =
  | TarifarioDetailSection
  | "media";

type GallerySelection = {
  tarifarioId: string;
  index: number;
};

export function TarifarioDetailModal({
  tarifario,
  onClose,
}: TarifarioDetailModalProps) {
  const [activeSection, setActiveSection] =
    useState<TarifarioDetailSection>("details");
  const [activeMobileSection, setActiveMobileSection] =
    useState<TarifarioMobileSection>("media");
  const [gallerySelection, setGallerySelection] =
    useState<GallerySelection | null>(null);
  const images = tarifario.images?.map((image) => image.url).filter(Boolean);
  const gallery = images ?? [];
  const selectedImageIndex =
    gallerySelection?.tarifarioId === tarifario.id ? gallerySelection.index : 0;
  const selectedImage = gallery[selectedImageIndex] ?? gallery[0];
  const itineraryDays = getDisplayItineraryDays(tarifario);
  const hasGallery = gallery.length > 0;
  const countryNames = getCountryNames(tarifario.countries);
  const regionNames = getRegionNames(tarifario.regions);
  const isTarifarioType = tarifario.type === "Tarifario";

  const sectionTabs = (
    <div className="tarifario-detail-tabs flex flex-wrap gap-2">
      {[
        { key: "details", label: "Detalles" },
        { key: "itinerary", label: "Itinerario" },
        { key: "notes", label: "Anotaciones" },
      ].map((item) => {
        const selected = activeSection === item.key;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() =>
              setActiveSection(item.key as TarifarioDetailSection)
            }
            className={[
              "tarifario-detail-tab h-10 rounded-xl px-4 text-[12px] font-black uppercase tracking-wide transition",
              selected
                ? "border border-violet-500 bg-white text-violet-700 shadow-sm hover:bg-violet-50"
                : "border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );

  const mobileSectionTabs = (
    <div className="tarifario-detail-mobile-tabs flex gap-2 overflow-x-auto pb-1">
      {[
        { key: "media", label: "Galería" },
        { key: "details", label: "Detalles" },
        { key: "itinerary", label: "Itinerario" },
        { key: "notes", label: "Anotaciones" },
      ].map((item) => {
        const selected = activeMobileSection === item.key;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() =>
              setActiveMobileSection(item.key as TarifarioMobileSection)
            }
            className={[
              "h-10 shrink-0 rounded-xl px-4 text-[11px] font-black uppercase tracking-wide transition",
              selected
                ? "border border-violet-500 bg-white text-violet-700 shadow-sm hover:bg-violet-50"
                : "border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );

  const dynamicContent = (
    <>
      {activeSection === "details" ? (
        <div className="space-y-6">
          <TravelSummaryBand
            destinations={tarifario.destinations}
            dates={tarifario.dates}
            days={
              itineraryDays.length > 1
                ? `${itineraryDays.length} días`
                : "Itinerario general"
            }
          />

          <IncludesColumns
            includes={tarifario.includes}
            notIncludes={tarifario.notIncludes}
          />
        </div>
      ) : null}

      {activeSection === "itinerary" ? (
        <section>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionTitle
                icon={<IconRoute className="h-5 w-5" />}
                title="Ruta del viaje"
              />
              <p className="text-base leading-8 text-slate-500">
                {tarifario.destinations}
              </p>
            </div>
            <p className="border-l-2 border-violet-500 pl-4 text-xs font-black uppercase tracking-[0.18em] text-violet-500">
              {tarifario.dates}
            </p>
          </div>
          <TravelTimeline days={itineraryDays} />
        </section>
      ) : null}

      {activeSection === "notes" ? (
        <div className="space-y-6">
          <InfoSection
            icon={<IconHotelService className="h-5 w-5" />}
            title="Hoteles y detalles"
            content={tarifario.hotelsDetails}
          />
          <InfoSection
            icon={<IconNotes className="h-5 w-5" />}
            title="Notas"
            content={tarifario.notes}
          />
          {!tarifario.hotelsDetails?.trim() && !tarifario.notes?.trim() ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-300">
              Sin anotaciones
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const gallerySection = (
    <section>
      <SectionTitle
        icon={<IconCamera className="h-5 w-5" />}
        title="Galería"
      />
      {hasGallery ? (
        <div className="tarifario-detail-gallery grid gap-3">
          <div className="tarifario-detail-thumbs flex flex-col gap-2 overflow-y-auto pr-1">
            {gallery.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() =>
                  setGallerySelection({
                    tarifarioId: tarifario.id,
                    index,
                  })
                }
                className={[
                  "aspect-square w-full shrink-0 overflow-hidden rounded-lg border bg-white p-0 transition",
                  index === selectedImageIndex
                    ? "border-violet-500 ring-2 ring-violet-100"
                    : "border-slate-200 hover:border-slate-300",
                ].join(" ")}
                aria-label={`Ver imagen ${index + 1}`}
              >
                <img
                  src={image}
                  alt={`${tarifario.title} miniatura ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
          <img
            src={selectedImage}
            alt={`${tarifario.title} imagen principal`}
            className="tarifario-detail-main-image w-full rounded-xl border border-slate-200 object-cover shadow-sm"
          />
        </div>
      ) : (
        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-sm font-semibold text-slate-300">
          Sin imágenes
        </div>
      )}
    </section>
  );

  const ratesSection = (
    <section>
      <SectionTitle
        icon={<IconTicket className="h-5 w-5" />}
        title="Tarifas"
      />
      {tarifario.rateTables?.length ? (
        <div className="space-y-5">
          {tarifario.rateTables.map((table, index) => (
            <TarifarioRateTableView
              key={`${table.title}-${index}`}
              table={table}
            />
          ))}
        </div>
      ) : (
        <p className="whitespace-pre-line rounded-xl border border-slate-200 bg-white px-4 py-4 text-base leading-8 text-slate-600">
          {tarifario.rates}
        </p>
      )}
    </section>
  );

  const mobileContent = (
    <>
      {activeMobileSection === "media" ? (
        <div className="space-y-7">
          {gallerySection}
          <div className="border-t border-slate-100 pt-6">{ratesSection}</div>
        </div>
      ) : null}

      {activeMobileSection === "details" ? (
        <div className="space-y-6">
          <TravelSummaryBand
            destinations={tarifario.destinations}
            dates={tarifario.dates}
            days={
              itineraryDays.length > 1
                ? `${itineraryDays.length} días`
                : "Itinerario general"
            }
          />

          <IncludesColumns
            includes={tarifario.includes}
            notIncludes={tarifario.notIncludes}
          />
        </div>
      ) : null}

      {activeMobileSection === "itinerary" ? (
        <section>
          <div className="mb-6 flex flex-col gap-2">
            <div>
              <SectionTitle
                icon={<IconRoute className="h-5 w-5" />}
                title="Ruta del viaje"
              />
              <p className="text-base leading-8 text-slate-500">
                {tarifario.destinations}
              </p>
            </div>
            <p className="border-l-2 border-violet-500 pl-4 text-xs font-black uppercase tracking-[0.18em] text-violet-500">
              {tarifario.dates}
            </p>
          </div>
          <TravelTimeline days={itineraryDays} />
        </section>
      ) : null}

      {activeMobileSection === "notes" ? (
        <div className="space-y-6">
          <InfoSection
            icon={<IconHotelService className="h-5 w-5" />}
            title="Hoteles y detalles"
            content={tarifario.hotelsDetails}
          />
          <InfoSection
            icon={<IconNotes className="h-5 w-5" />}
            title="Notas"
            content={tarifario.notes}
          />
          {!tarifario.hotelsDetails?.trim() && !tarifario.notes?.trim() ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-300">
              Sin anotaciones
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const tarifarioContent = (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
          <section className="min-w-0 space-y-6">
            <TravelSummaryBand
              destinations={tarifario.destinations}
              dates={tarifario.dates}
              days={
                itineraryDays.length > 1
                  ? `${itineraryDays.length} días`
                : "Itinerario general"
              }
            />

            <div className="space-y-6">
              <InfoSection
                icon={<IconNotes className="h-5 w-5" />}
                title="Notas"
                content={tarifario.notes}
              />
              <InfoSection
                icon={<IconHotelService className="h-5 w-5" />}
                title="Detalles"
                content={tarifario.hotelsDetails}
              />
              {!tarifario.notes?.trim() && !tarifario.hotelsDetails?.trim() ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-300">
                  Sin anotaciones
                </p>
              ) : null}
            </div>
          </section>

          <section className="min-w-0">
            {gallerySection}
          </section>
        </div>

        <section className="border-t border-slate-200 pt-6">
          {ratesSection}
        </section>
      </div>
    </div>
  );

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={1440}
      centered
      destroyOnHidden
      zIndex={1300}
      style={{ maxWidth: "calc(100vw - 24px)" }}
      title={null}
      styles={{ body: { padding: 0 } }}
    >
      <style>{`
        .tarifario-detail-shell {
          height: 720px;
          max-height: calc(100vh - 56px);
        }

        .tarifario-detail-layout {
          grid-template-columns: minmax(0, 1fr) 620px;
        }

        .tarifario-detail-gallery {
          grid-template-columns: 76px minmax(0, 1fr);
        }

        .tarifario-detail-thumbs,
        .tarifario-detail-main-image {
          height: 300px;
        }

        @media (max-width: 1023px) {
          .tarifario-detail-shell {
            height: calc(100dvh - 24px);
            max-height: calc(100dvh - 24px);
          }

          .tarifario-detail-layout {
            grid-template-columns: minmax(0, 1fr);
            overflow-y: auto;
          }

          .tarifario-detail-left {
            border-right: 0;
            min-height: auto;
          }

          .tarifario-detail-tabs-wrap {
            position: sticky;
            top: 0;
            z-index: 5;
          }

          .tarifario-detail-pane,
          .tarifario-detail-aside {
            overflow: visible;
          }

          .tarifario-detail-aside {
            border-top: 1px solid rgb(226 232 240);
          }

          .tarifario-detail-gallery {
            grid-template-columns: 58px minmax(0, 1fr);
          }

          .tarifario-detail-thumbs,
          .tarifario-detail-main-image {
            height: 220px;
          }
        }

        @media (max-width: 480px) {
          .tarifario-detail-shell {
            height: calc(100dvh - 12px);
            max-height: calc(100dvh - 12px);
          }

          .tarifario-detail-header {
            padding: 16px 44px 14px 16px;
          }

          .tarifario-detail-title {
            font-size: 24px;
          }

          .tarifario-detail-tabs {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .tarifario-detail-tab {
            width: 100%;
            padding-left: 6px;
            padding-right: 6px;
            font-size: 10px;
          }

          .tarifario-detail-gallery {
            grid-template-columns: 52px minmax(0, 1fr);
          }

          .tarifario-detail-thumbs,
          .tarifario-detail-main-image {
            height: 190px;
          }
        }
      `}</style>
      <div className="tarifario-detail-shell flex flex-col overflow-hidden bg-white">
        <header className="tarifario-detail-header shrink-0 border-b border-slate-100 px-4 py-4 pr-12 sm:px-6">
          <div className="mt-2 flex items-start justify-between gap-5">
            <div className="min-w-0">
              <h2 className="tarifario-detail-title font-serif text-2xl leading-tight text-slate-950 sm:text-3xl">
                {tarifario.title}
              </h2>
              <LocationTags countries={countryNames} regions={regionNames} />
            </div>
            <img
              src="/imgs/tp_logo.png"
              alt="Logo"
              className="hidden h-12 w-auto shrink-0 object-contain sm:block"
            />
          </div>
        </header>

        {isTarifarioType ? (
          tarifarioContent
        ) : (
          <>
            <div className="tarifario-detail-layout hidden min-h-0 flex-1 overflow-hidden lg:grid">
              <section className="tarifario-detail-left flex min-h-0 min-w-0 flex-col border-r border-slate-100">
                <div className="tarifario-detail-tabs-wrap shrink-0 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
                  {sectionTabs}
                </div>

                <div className="tarifario-detail-pane min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                  {dynamicContent}
                </div>
              </section>

              <aside className="tarifario-detail-aside min-h-0 min-w-0 space-y-7 overflow-y-auto bg-slate-50 px-5 py-5">
                {gallerySection}
                {ratesSection}
              </aside>
            </div>

            <div className="flex min-h-0 flex-1 flex-col bg-white lg:hidden">
              <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3">
                {mobileSectionTabs}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                {mobileContent}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function getCountryNames(countries: Array<string | TarifarioCountry> | undefined) {
  return (countries ?? [])
    .map((country) => (typeof country === "string" ? country : country.nombre))
    .filter(Boolean);
}

function getRegionNames(regions: Array<string | TarifarioRegion> | undefined) {
  return (regions ?? [])
    .map((region) => (typeof region === "string" ? region : region.nombre))
    .filter(Boolean);
}

function LocationTags({
  countries,
  regions,
}: {
  countries: string[];
  regions: string[];
}) {
  const groups: Array<{ label: string; value: string }> = [];

  if (countries.length > 0) {
    groups.push({
      label: countries.length === 1 ? "País" : "Países",
      value: countries.join(", "),
    });
  }

  if (regions.length > 0) {
    groups.push({
      label: regions.length === 1 ? "Región" : "Regiones",
      value: regions.join(", "),
    });
  }

  if (!groups.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {groups.map((group) => (
        <span
          key={group.label}
          className="inline-flex items-center gap-1.5 border-l border-slate-300 pl-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 first:border-l-0 first:pl-0"
        >
          <span className="text-slate-400">{group.label}:</span>
          {group.value}
        </span>
      ))}
    </div>
  );
}

function IncludesColumns({
  includes,
  notIncludes,
}: {
  includes?: string;
  notIncludes?: string;
}) {
  return (
    <div className="max-w-4xl space-y-5">
      <PackageTextColumn title="Incluye" content={includes} />
      <PackageTextColumn title="No incluye" content={notIncludes} />
    </div>
  );
}

function PackageTextColumn({
  title,
  content,
}: {
  title: string;
  content?: string;
}) {
  return (
    <section className="py-1">
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-violet-500">
        {title}
      </p>
      <PackageBulletList content={content} />
    </section>
  );
}

function PackageBulletList({ content }: { content?: string }) {
  const items = splitPackageItems(content);

  if (!items.length) {
    return (
      <p className="text-sm font-semibold leading-7 text-slate-700">
        No especificado
      </p>
    );
  }

  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm font-semibold leading-7 text-slate-700 marker:text-violet-500">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function splitPackageItems(content?: string) {
  return (content ?? "")
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\s+[•*]\s+/))
    .map((line) => line.trim().replace(/^[\-•*]\s*/, ""))
    .filter(Boolean);
}

function TravelSummaryBand({
  destinations,
  dates,
  days,
}: {
  destinations: string;
  dates: string;
  days: string;
}) {
  return (
    <section className="max-w-4xl border-y border-slate-200 py-5">
      <div className="flex items-start gap-4">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center border-l-2 border-violet-500 text-violet-500">
          <IconMapPin className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.24em] text-violet-500">
            Destinos
          </p>
          <p className="font-serif text-2xl leading-tight text-slate-950">
            {destinations}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <IconCalendar className="h-5 w-5 shrink-0 text-violet-500" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Fechas
            </p>
            <p className="text-base font-black text-slate-800">{dates}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <IconRoute className="h-5 w-5 shrink-0 text-violet-500" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Días de viaje
            </p>
            <p className="text-base font-black text-slate-800">{days}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 text-slate-950">
      <span className="text-violet-500">{icon}</span>
      <p className="text-lg font-black uppercase tracking-[0.08em]">{title}</p>
    </div>
  );
}

function InfoSection({
  icon,
  title,
  content,
}: {
  icon: ReactNode;
  title: string;
  content?: string;
}) {
  if (!content?.trim()) return null;

  return (
    <section className="border-b border-slate-200 pb-5 last:border-b-0 last:pb-0">
      <SectionTitle icon={icon} title={title} />
      <p className="whitespace-pre-line text-base leading-8 text-slate-700">
        {content}
      </p>
    </section>
  );
}

function TravelTimeline({
  days,
}: {
  days: Array<{ key?: string; title: string; content: string }>;
}) {
  return (
    <div className="relative mx-auto max-w-5xl" role="list">
      <div
        aria-hidden="true"
        className="absolute bottom-5 left-[21px] top-5 w-0.5 bg-violet-500"
      />
      {days.map((day, index) => (
        <div
          key={`${day.title}-${index}`}
          role="listitem"
          className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-4 pb-8 last:pb-0"
        >
          <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-violet-500 text-white shadow-[0_8px_18px_color-mix(in_srgb,var(--app-primary-500,#8b5cf6)_32%,transparent)] ring-2 ring-violet-200">
            <span className="text-sm font-black">{index + 1}</span>
          </div>

          <article
            className={
              index === days.length - 1
                ? "pb-0"
                : "border-b border-slate-200 pb-7"
            }
          >
            <h3 className="font-serif text-2xl leading-tight text-slate-950">
              {day.title}
            </h3>
            <div className="mt-3 h-0.5 w-14 bg-violet-500" />
            <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-700">
              {day.content}
            </p>
          </article>
        </div>
      ))}
    </div>
  );
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

function TarifarioRateTableView({ table }: { table: TarifarioRateTable }) {
  const displayRows = mergeGroupedDateRows(table.rows);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {(table.title || table.subtitle) && (
        <div className="border-b border-slate-100 px-4 py-3">
          {table.title ? (
            <p className="text-sm font-black uppercase tracking-wide text-slate-800">
              {table.title}
            </p>
          ) : null}
          {table.subtitle ? (
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-500">
              {table.subtitle}
            </p>
          ) : null}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-center text-sm">
          <thead>
            <tr className="bg-violet-500 text-white">
              {table.columns.map((column, index) => (
                <th
                  key={`${column}-${index}`}
                  className="border border-violet-600 px-4 py-3 font-black"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="transition-colors hover:bg-violet-50">
                {table.columns.map((_, columnIndex) => (
                  <td
                    key={`${rowIndex}-${columnIndex}`}
                    className="whitespace-pre-line border border-slate-300 px-4 py-3 font-semibold text-slate-700"
                  >
                    {row[columnIndex] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.notes?.length ? (
        <div className="space-y-1 border-t border-slate-100 px-4 py-3">
          {table.notes.map((note, index) => (
            <p key={`${note}-${index}`} className="text-xs text-slate-500">
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getDisplayItineraryDays(tarifario: TarifarioDetailItem) {
  if (tarifario.itineraryDays?.length) {
    return tarifario.itineraryDays.filter((day) => day.content.trim());
  }

  return [
    {
      key: "itinerary",
      title: "Itinerario",
      content: tarifario.itinerary,
    },
  ].filter((day) => day.content.trim());
}
