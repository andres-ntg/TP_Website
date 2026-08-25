"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconArchive,
  IconChevronDown,
  IconChevronLeft,
  IconDotsVertical,
  IconEdit,
  IconFileTypePdf,
  IconFilter,
  IconLayoutGrid,
  IconList,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Dropdown, Modal, message, type MenuProps } from "antd";
import { FaPersonWalkingLuggage } from "react-icons/fa6";
import { NewTarifarioModal } from "./NewTarifarioModal";
import {
  TarifarioDetailModal,
  type TarifarioDetailItem,
} from "./TarifarioDetailModal";
import { openOrDownloadGeneratedPdf } from "@/lib/client-pdf-download";
import { formatCreatedDate } from "@/app/features/products/date-utils";

type TarifarioListItem = TarifarioDetailItem;
type TarifarioViewMode = "grid" | "list";
type TarifarioTypeFilter = "Paquete" | "Circuito" | "Tarifario";

const TARIFARIO_TYPE_SELECTORS: Array<{
  label: string;
  value: TarifarioTypeFilter;
  backgroundImage: string;
}> = [
  {
    label: "Paquetes",
    value: "Paquete",
    backgroundImage: "https://media.traveler.es/photos/69823c06b6ff17c058325b2c/master/w_1600%2Cc_limit/2209385356",
  },
  {
    label: "Circuitos",
    value: "Circuito",
    backgroundImage: "https://www.travelandleisure.com/thmb/008TMuCWpYImHX7FtHIjSj48LUw=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/vienna-austria-BPEUROJAN1019-19c44e8a89cd48d28ef37d4d8ef28cf8.jpg",
  },
  {
    label: "Tarifas",
    value: "Tarifario",
    backgroundImage: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbyNgN0yusfCj5IKwX5w56qcjiIFC5nc9ukIKh5a4bszH1sBGtkGQ8waHK&s=10",
  },
];

type CountryFilterOption = {
  name: string;
  codigo: string;
  regionCodigo?: string;
};

function getCountryNames(item: TarifarioListItem) {
  return (item.countries ?? [])
    .map((country) => (typeof country === "string" ? country : country.nombre))
    .filter(Boolean);
}

function getCountryCodes(item: TarifarioListItem) {
  return (item.countries ?? [])
    .map((country) => (typeof country === "string" ? country : country.codigo))
    .filter(Boolean);
}

function getRegionNames(item: TarifarioListItem) {
  return (item.regions ?? [])
    .map((region) => (typeof region === "string" ? region : region.nombre))
    .filter(Boolean);
}

function getTarifarioType(item: TarifarioListItem): TarifarioTypeFilter {
  return item.type ?? "Paquete";
}

function getTarifarioTypeFromPath(pathname: string): TarifarioTypeFilter | undefined {
  const section = pathname.split("/").filter(Boolean).at(1)?.toLowerCase();

  if (section === "paquetes" || section === "paquete") return "Paquete";
  if (section === "circuito" || section === "circuitos") return "Circuito";
  if (section === "tarifas" || section === "tarifa") return "Tarifario";

  return undefined;
}

function getTarifarioPathForType(type: TarifarioTypeFilter) {
  if (type === "Paquete") return "/tarifario/paquetes";
  if (type === "Circuito") return "/tarifario/circuito";
  return "/tarifario/tarifas";
}

function getNtgRolesFromClientUser(user: unknown) {
  const claims =
    user && typeof user === "object" && !Array.isArray(user)
      ? (user as Record<string, unknown>)
      : {};
  const roles = new Set<string>();
  const addRole = (role: unknown) => {
    if (typeof role !== "string") {
      return;
    }

    const trimmedRole = role.trim();
    if (trimmedRole) {
      roles.add(trimmedRole);
    }
  };

  [
    claims["https://nationalgt.com/roles"],
    claims["https://ntg.com/roles"],
    claims["https://claims.nationalgt.com/roles"],
    claims["https://api.ntg-rrhh/roles"],
  ].forEach((claim) => {
    if (Array.isArray(claim)) {
      claim.forEach(addRole);
    } else {
      addRole(claim);
    }
  });

  [
    claims["https://nationalgt.com/role"],
    claims["https://ntg.com/role"],
    claims["https://claims.nationalgt.com/role"],
    claims["https://api.ntg-rrhh/role"],
  ].forEach(addRole);

  return [...roles];
}

function getClientTarifarioRoleOverride(user: unknown) {
  const roleKeys = getNtgRolesFromClientUser(user).map((role) =>
    role.trim().toLowerCase(),
  );
  const isAdminLike =
    roleKeys.includes("admin") || roleKeys.includes("admin_tp");
  const isTp = roleKeys.includes("tp");

  if (isTp && !isAdminLike) {
    return {
      canArchive: true,
      canCreate: true,
      canManage: true,
      canDelete: false,
    };
  }

  return null;
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

function inferPriceFrom(item: TarifarioListItem) {
  if (item.priceFrom?.trim()) return item.priceFrom.trim();

  const rateTables = item.rateTables ?? [];
  const source = [
    item.rates,
    ...rateTables.flatMap((table) => [
      table.title,
      table.subtitle,
      ...table.columns,
      ...table.rows.flat(),
      ...table.notes,
    ]),
  ].join("\n");
  const currency = inferCurrency(source);
  const amounts = Array.from(
    source.matchAll(/(?:[$Q€]|MXN|USD|EUR|GTQ)?\s*[\d][\d,.]*/gi),
  )
    .map((match) => parseAmount(match[0]))
    .filter((amount): amount is number => amount !== null && amount > 0);

  if (amounts.length === 0) return item.rates;
  return formatPriceFrom(Math.min(...amounts), currency);
}

function truncateText(value: string, maxLength = 260) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const trimmed = normalized.slice(0, maxLength).trimEnd();
  const lastSpace = trimmed.lastIndexOf(" ");
  const cleanCut = lastSpace > 140 ? trimmed.slice(0, lastSpace) : trimmed;

  return `${cleanCut.replace(/[.,;:\-–—\s]+$/g, "")}...`;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildTarifarioSearchText(item: TarifarioListItem) {
  const countryNames = getCountryNames(item);
  const regionNames = getRegionNames(item);

  return [
    item.title,
    ...regionNames,
    ...countryNames,
    item.destinations,
    item.dates,
    item.includes,
    item.notIncludes,
    item.hotelsDetails,
    item.notes,
    item.rates,
    item.priceFrom,
    ...(item.itineraryDays?.flatMap((day) => [day.title, day.content]) ?? []),
  ]
    .filter((value): value is string => typeof value === "string" && !!value)
    .join(" ");
}

export default function TarifarioPage() {
  const router = useRouter();
  const pathname = usePathname();
  const selectedType = getTarifarioTypeFromPath(pathname);
  const { user, isLoading: isUserLoading } = useUser({
    route: "/api/auth/me",
  });
  const isContaUser = useMemo(
    () =>
      getNtgRolesFromClientUser(user).some(
        (role) => role.trim().toLowerCase() === "conta",
      ),
    [user],
  );
  const clientRoleOverride = useMemo(
    () => getClientTarifarioRoleOverride(user),
    [user],
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tarifarios, setTarifarios] = useState<TarifarioListItem[]>([]);
  const [loadingTarifarios, setLoadingTarifarios] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canArchiveTarifario, setCanArchiveTarifario] = useState(false);
  const [canCreateTarifario, setCanCreateTarifario] = useState(false);
  const [canManageTarifario, setCanManageTarifario] = useState(false);
  const [canDeleteTarifario, setCanDeleteTarifario] = useState(false);
  const [canViewArchivedTarifario, setCanViewArchivedTarifario] =
    useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingTarifario, setEditingTarifario] =
    useState<TarifarioListItem | null>(null);
  const [detailTarifario, setDetailTarifario] =
    useState<TarifarioListItem | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<TarifarioViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [countryCatalog, setCountryCatalog] = useState<CountryFilterOption[]>(
    [],
  );
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const canViewCreator = useMemo(() => {
    if (!user) return false;
    const claims =
      typeof user === "object" && !Array.isArray(user)
        ? (user as Record<string, unknown>)
        : {};
    const roles = getNtgRolesFromClientUser(user).map((r) =>
      r.trim().toLowerCase(),
    );
    return (
      ["admin", "admin_tp", "tp"].some((role) => roles.includes(role)) ||
      claims["https://nationalgt.com/is_admin"] === true ||
      claims["https://nationalgt.com/can_manage"] === true ||
      canManageTarifario ||
      canArchiveTarifario
    );
  }, [user, canManageTarifario, canArchiveTarifario]);

  const loadTarifarios = useCallback(async () => {
    setLoadingTarifarios(true);
    setLoadError(null);
    try {
      const res = await fetch(
        showArchived ? "/api/tarifario?archived=1" : "/api/tarifario",
        { cache: "no-store" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        tarifarios?: TarifarioListItem[];
        permissions?: {
          canArchiveTarifario?: boolean;
          canCreateTarifario?: boolean;
          canManageTarifario?: boolean;
          canDeleteTarifario?: boolean;
          canViewArchivedTarifario?: boolean;
        };
        error?: string;
      };

      if (!res.ok || !Array.isArray(data.tarifarios)) {
        throw new Error(data.error ?? "No se pudieron cargar los tarifarios.");
      }

      setTarifarios(data.tarifarios);
      setCanArchiveTarifario(
        clientRoleOverride?.canArchive ??
          data.permissions?.canArchiveTarifario === true,
      );
      setCanCreateTarifario(
        clientRoleOverride?.canCreate ??
          data.permissions?.canCreateTarifario === true,
      );
      setCanManageTarifario(
        clientRoleOverride?.canManage ??
          data.permissions?.canManageTarifario === true,
      );
      setCanDeleteTarifario(
        clientRoleOverride?.canDelete ??
          data.permissions?.canDeleteTarifario === true,
      );
      setCanViewArchivedTarifario(
        data.permissions?.canViewArchivedTarifario === true,
      );
    } catch (error) {
      setTarifarios([]);
      setCanArchiveTarifario(false);
      setCanCreateTarifario(false);
      setCanManageTarifario(false);
      setCanDeleteTarifario(false);
      setCanViewArchivedTarifario(false);
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los tarifarios.",
      );
    } finally {
      setLoadingTarifarios(false);
    }
  }, [clientRoleOverride, showArchived]);

  useEffect(() => {
    if (isUserLoading || isContaUser) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadTarifarios();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isContaUser, isUserLoading, loadTarifarios]);

  useEffect(() => {
    if (isUserLoading || isContaUser) {
      return;
    }

    let ignore = false;

    fetch("/api/catalogs/paises", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          countries?: CountryFilterOption[];
          error?: string;
        };

        if (!response.ok || !Array.isArray(payload.countries)) {
          throw new Error(
            payload.error ?? "No se pudo cargar el catálogo de países.",
          );
        }

        return payload.countries;
      })
      .then((countries) => {
        if (ignore) return;
        setCountryCatalog(countries);
      })
      .catch((error) => {
        if (!ignore) {
          message.error(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los filtros.",
          );
          setCountryCatalog([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isContaUser, isUserLoading]);

  useEffect(() => {
    if (!isUserLoading && isContaUser) {
      router.replace("/horarios");
    }
  }, [isContaUser, isUserLoading, router]);

  const countryNameLookup = useMemo(
    () =>
      new Map(
        countryCatalog
          .filter((country) => country.codigo && country.name)
          .map((country) => [country.codigo, country.name]),
      ),
    [countryCatalog],
  );
  const activeFilterCount = selectedCountry ? 1 : 0;
  const selectedTypeMeta = TARIFARIO_TYPE_SELECTORS.find(
    (option) => option.value === selectedType,
  );
  const countryCatalogLookup = useMemo(() => {
    const lookup = new Map<string, CountryFilterOption>();

    countryCatalog.forEach((country) => {
      if (country.codigo) {
        lookup.set(normalizeSearchText(country.codigo), country);
      }
      if (country.name) {
        lookup.set(normalizeSearchText(country.name), country);
      }
    });

    return lookup;
  }, [countryCatalog]);
  const availableCountryFilters = useMemo(() => {
    if (!selectedType) return [];

    const options = new Map<string, { label: string; value: string }>();

    tarifarios.forEach((item) => {
      if (getTarifarioType(item) !== selectedType) return;

      (item.countries ?? []).forEach((country) => {
        const rawName = typeof country === "string" ? country : country.nombre;
        const rawCode = typeof country === "string" ? country : country.codigo;
        const catalogCountry =
          countryCatalogLookup.get(normalizeSearchText(rawCode)) ??
          countryCatalogLookup.get(normalizeSearchText(rawName));
        const value = catalogCountry?.codigo || rawCode || rawName;
        const label = catalogCountry?.name || rawName || rawCode;

        if (!value || !label) return;

        options.set(normalizeSearchText(value), { value, label });
      });
    });

    return [...options.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "es"),
    );
  }, [countryCatalogLookup, selectedType, tarifarios]);

  const packageItems = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);
    const selectedCountryName = selectedCountry
      ? countryNameLookup.get(selectedCountry)
      : undefined;
    const normalizedSelectedCountry = selectedCountry
      ? normalizeSearchText(selectedCountry)
      : "";
    const normalizedSelectedCountryName = selectedCountryName
      ? normalizeSearchText(selectedCountryName)
      : "";

    return tarifarios
      .filter((item) => {
        if (selectedCountry) {
          const countryValues = [
            ...getCountryCodes(item),
            ...getCountryNames(item),
          ].map(normalizeSearchText);

          if (
            !countryValues.includes(normalizedSelectedCountry) &&
            !countryValues.includes(normalizedSelectedCountryName)
          ) {
            return false;
          }
        }

        if (selectedType && getTarifarioType(item) !== selectedType) {
          return false;
        }

        if (normalizedQuery) {
          return normalizeSearchText(buildTarifarioSearchText(item)).includes(
            normalizedQuery,
          );
        }

        return true;
      })
      .map((item) => {
        const images = item.images?.map((image) => image.url).filter(Boolean);
        const countryNames = getCountryNames(item);
        const regionNames = getRegionNames(item);
        return {
          id: item.id,
          source: item,
          type: getTarifarioType(item),
          region: regionNames.length
            ? regionNames.join(", ")
            : countryNames.length
              ? countryNames.join(", ")
            : item.destinations,
          days: item.dates,
          title: item.title,
          description: truncateText(
            item.includes || item.notes || item.destinations,
          ),
          publishedAt: formatCreatedDate(item.createdAt),
          priceFrom: inferPriceFrom(item),
          primaryImage: images?.[0] ?? "/imgs/empty_img.jpg",
          secondaryImage: images?.[1] ?? images?.[0] ?? "/imgs/empty_img.jpg",
        };
      });
  }, [
    countryNameLookup,
    searchQuery,
    selectedCountry,
    selectedType,
    tarifarios,
  ]);

  const handleOpenPdf = async (item: TarifarioListItem) => {
    if (downloadingPdfId) return;

    setDownloadingPdfId(item.id);
    try {
      await openOrDownloadGeneratedPdf({
        url: `/api/tarifario/${encodeURIComponent(item.id)}/pdf`,
        fileName: `${item.title.replace(/\s+/g, "-")}-${item.id}.pdf`,
        onDownloaded: () => message.success("El archivo se ha descargado."),
      });
    } catch (downloadError) {
      message.error(
        downloadError instanceof Error
          ? downloadError.message
          : "No se pudo generar el PDF.",
      );
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleOpenCreate = () => {
    if (!canCreateTarifario) return;

    setEditingTarifario(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: TarifarioListItem) => {
    if (!canManageTarifario) return;

    setEditingTarifario(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTarifario(null);
  };

  const handleDelete = (item: TarifarioListItem) => {
    if (!canDeleteTarifario) return;

    Modal.confirm({
      title: "Eliminar tarifario",
      content: `¿Quieres eliminar "${item.title}"? Esta accion no se puede deshacer.`,
      okText: "Eliminar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      async onOk() {
        const res = await fetch(
          `/api/tarifario?id=${encodeURIComponent(item.id)}`,
          { method: "DELETE" },
        );
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "No se pudo eliminar el tarifario.");
        }

        message.success("Tarifario eliminado correctamente.");
        await loadTarifarios();
      },
    });
  };

  const handleArchive = (item: TarifarioListItem) => {
    if (!canArchiveTarifario) return;

    Modal.confirm({
      title: showArchived ? "Desarchivar tarifario" : "Archivar tarifario",
      content: showArchived
        ? `¿Quieres desarchivar "${item.title}"? Volverá a aparecer en tu listado.`
        : `¿Quieres archivar "${item.title}"? Dejará de aparecer en tu listado.`,
      okText: showArchived ? "Desarchivar" : "Archivar",
      cancelText: "Cancelar",
      async onOk() {
        const res = showArchived
          ? await fetch(
              `/api/tarifario/archive?tarifarioId=${encodeURIComponent(item.id)}`,
              { method: "DELETE" },
            )
          : await fetch("/api/tarifario/archive", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tarifarioId: item.id }),
            });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(
            data.error ??
              (showArchived
                ? "No se pudo desarchivar el tarifario."
                : "No se pudo archivar el tarifario."),
          );
        }

        message.success(
          showArchived
            ? "Tarifario desarchivado correctamente."
            : "Tarifario archivado correctamente.",
        );
        await loadTarifarios();
      },
    });
  };

  return isContaUser ? null : (
    <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 pb-24 sm:px-10 sm:py-10 lg:px-14 xl:px-16">
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
        <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-3 sm:min-w-[260px] sm:basis-auto">
          <h1 className="inline-flex items-center gap-2 text-xl font-bold text-gray-900 sm:text-2xl">
            <FaPersonWalkingLuggage className="h-6 w-6 text-violet-600" />
            Tarifario
          </h1>
          <div className="hidden h-5 w-px bg-slate-200 sm:block" />
          {canViewArchivedTarifario ? (
            <div className="flex max-w-full items-center gap-0.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              <TarifarioStatusTab
                active={!showArchived}
                label="Activos"
                onClick={() => setShowArchived(false)}
              />
              <TarifarioStatusTab
                active={showArchived}
                label="Archivados"
                icon={<IconArchive className="h-4 w-4" />}
                onClick={() => setShowArchived(true)}
              />
            </div>
          ) : null}
        </div>

        {selectedType ? (
          <button
            type="button"
            onClick={() => {
              setSelectedCountry(undefined);
              setSearchQuery("");
              router.push("/tarifario");
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          >
            <IconChevronLeft className="h-4 w-4" />
            Categorías
          </button>
        ) : null}

        {selectedType ? (
          <>
            <div className="hidden h-5 w-px bg-slate-200 sm:block" />

            <div className="relative min-w-0 flex-1 basis-full sm:min-w-[180px] sm:basis-auto">
              <IconSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder={`Buscar ${selectedTypeMeta?.label.toLowerCase() ?? "entradas"}...`}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-transparent bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-1 focus:ring-violet-400"
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                aria-label="Vista de grilla"
                onClick={() => setViewMode("grid")}
                className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                  viewMode === "grid"
                    ? "bg-white text-violet-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <IconLayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Vista de lista"
                onClick={() => setViewMode("list")}
                className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                  viewMode === "list"
                    ? "bg-white text-violet-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <IconList className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : null}

        {canCreateTarifario ? (
          <button
            type="button"
            aria-label="Agregar"
            onClick={handleOpenCreate}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-xl leading-none text-white transition hover:bg-violet-600"
          >
            +
          </button>
        ) : null}
      </div>

      {!selectedType ? (
        <div className="flex min-h-[calc(100vh-250px)] items-center">
          <section className="w-full px-4 py-8 sm:px-8 lg:px-12">
            {loadingTarifarios ? (
              <div className="py-16 text-center text-sm font-bold uppercase tracking-wide text-slate-300">
                Cargando tarifarios...
              </div>
            ) : null}

            {!loadingTarifarios && loadError ? (
              <div className="py-16 text-center text-sm font-bold uppercase tracking-wide text-red-400">
                {loadError}
              </div>
            ) : null}

            {!loadingTarifarios && !loadError ? (
              <div className="mx-auto grid w-full max-w-[1260px] gap-4 md:grid-cols-3">
                {TARIFARIO_TYPE_SELECTORS.map((option) => (
                  <TarifarioTypeSelectorCard
                    key={option.value}
                    label={option.label}
                    backgroundImage={option.backgroundImage}
                    onClick={() => {
                      setSelectedCountry(undefined);
                      setSearchQuery("");
                      router.push(getTarifarioPathForType(option.value));
                    }}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-left shadow-sm lg:hidden"
              aria-expanded={filtersOpen}
            >
              <span className="inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-wide text-slate-500">
                <IconFilter className="h-4 w-4 text-violet-600" />
                Filtros
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-black text-violet-700">
                    {activeFilterCount}
                  </span>
                ) : null}
              </span>
              <IconChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  filtersOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className={`mt-3 lg:mt-0 ${
                filtersOpen ? "block" : "hidden lg:block"
              }`}
            >
              <div className="flex items-center gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <CountryFilterPill
                  label="Todos"
                  active={!selectedCountry}
                  onClick={() => setSelectedCountry(undefined)}
                />
                {availableCountryFilters.map((country) => (
                  <CountryFilterPill
                    key={country.value}
                    label={country.label}
                    active={selectedCountry === country.value}
                    onClick={() => setSelectedCountry(country.value)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white px-4 py-6 shadow-sm sm:px-8 sm:py-8 lg:px-12">
        <div
          className={
            viewMode === "list"
              ? "mx-auto flex max-w-[1180px] flex-col"
              : "flex w-full flex-col"
          }
        >
          {loadingTarifarios ? (
            <div className="py-16 text-center text-sm font-bold uppercase tracking-wide text-slate-300">
              Cargando tarifarios...
            </div>
          ) : null}

          {!loadingTarifarios && loadError ? (
            <div className="py-16 text-center text-sm font-bold uppercase tracking-wide text-red-400">
              {loadError}
            </div>
          ) : null}

          {!loadingTarifarios && !loadError && tarifarios.length === 0 ? (
            <div className="py-16 text-center text-sm font-bold uppercase tracking-wide text-slate-300">
              {showArchived
                ? "No hay tarifarios archivados."
                : "No hay tarifarios guardados."}
            </div>
          ) : null}

          {!loadingTarifarios &&
          !loadError &&
          tarifarios.length > 0 &&
          packageItems.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-300">
                No hay resultados para la búsqueda.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCountry(undefined);
                }}
                className="rounded-full bg-violet-500 px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-violet-600"
              >
                Limpiar filtros
              </button>
            </div>
          ) : null}

          {!loadingTarifarios && !loadError && viewMode === "grid" ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {packageItems.map((item) => (
                <article
                  key={item.id}
                  className="group flex h-full min-h-[570px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.14)]"
                >
                  <div className="relative h-52 overflow-hidden bg-slate-100">
                    <img
                      src={item.primaryImage}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
                      <span className="rounded-full bg-slate-950/70 px-3 py-1 text-[11px] font-black text-white backdrop-blur">
                        {item.type}
                      </span>
                      <div className="flex items-center gap-2">
                        {canArchiveTarifario ? (
                          <PackageActions
                            item={item.source}
                            onEdit={handleOpenEdit}
                            onDelete={handleDelete}
                            onArchive={handleArchive}
                            canManage={canManageTarifario}
                            canDelete={canDeleteTarifario}
                            archiveLabel={
                              showArchived ? "Desarchivar" : "Archivar"
                            }
                            compact
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                      <span>{item.type}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span>Publicado {item.publishedAt}</span>
                    </div>

                    <h2 className="line-clamp-2 min-h-[52px] text-lg font-black leading-snug text-slate-950">
                      {item.title}
                    </h2>

                    <div className="mt-3 min-h-[76px] space-y-2 text-sm text-slate-500">
                      {canViewCreator &&
                      (item.source.createdByUser?.name ||
                        item.source.createdByUser?.email) ? (
                        <p className="truncate">
                          {item.source.createdByUser.name ??
                            item.source.createdByUser.email}
                        </p>
                      ) : null}
                      <p className="line-clamp-1">{item.days}</p>
                      <p className="line-clamp-1 font-semibold uppercase tracking-wide text-slate-600">
                        {item.region}
                      </p>
                    </div>

                    <p className="mt-4 min-h-[48px] border-b border-slate-100 pb-4 text-sm leading-6 text-slate-500 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="mt-auto pt-4">
                      <div className="mb-4 flex items-end justify-between gap-3">
                        <PackagePriceLabel
                          type={item.type}
                          priceFrom={item.priceFrom}
                          className="min-w-0"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailTarifario(item.source)}
                          className="flex h-10 min-w-0 flex-1 items-center justify-center rounded-xl border border-violet-500 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-violet-700 transition hover:bg-violet-50"
                        >
                          Ver detalles
                        </button>
                        <button
                          type="button"
                          aria-label="PDF"
                          disabled={downloadingPdfId === item.id}
                          onClick={() => void handleOpenPdf(item.source)}
                          className="flex h-10 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500 text-violet-700 transition hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
                        >
                          <IconFileTypePdf className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!loadingTarifarios && !loadError && viewMode === "list" ? (
            <div className="divide-y divide-slate-200">
              {packageItems.map((item) => (
                <article
                  key={item.id}
                  className="relative grid gap-4 py-5 pr-0 first:pt-0 last:pb-0 sm:pr-12 md:grid-cols-[88px_minmax(0,1fr)_auto] md:items-center"
                >
                  {canArchiveTarifario ? (
                    <PackageActions
                      item={item.source}
                      onEdit={handleOpenEdit}
                      onDelete={handleDelete}
                      onArchive={handleArchive}
                      canManage={canManageTarifario}
                      canDelete={canDeleteTarifario}
                      archiveLabel={showArchived ? "Desarchivar" : "Archivar"}
                      compact
                      className="absolute right-0 top-1 z-10 sm:top-4"
                    />
                  ) : null}
                  <img
                    src={item.primaryImage}
                    alt={item.title}
                    className="h-36 w-full rounded-xl object-cover sm:h-28 md:h-20 md:w-20"
                  />

                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-400">
                      <span>Publicado {item.publishedAt}</span>
                      <span className="max-w-full truncate text-violet-600">
                        {item.region}
                      </span>
                      <span>{item.days}</span>
                    </div>
                    <h2 className="line-clamp-2 text-lg font-black leading-snug text-slate-950 sm:truncate">
                      {item.title}
                    </h2>
                    {canViewCreator &&
                    (item.source.createdByUser?.name ||
                      item.source.createdByUser?.email) ? (
                      <p className="text-[11px] font-medium text-slate-400">
                        Creado por:{" "}
                        <span className="text-slate-500">
                          {item.source.createdByUser.name ??
                            item.source.createdByUser.email}
                        </span>
                      </p>
                    ) : null}
                    <p className="mt-1 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 md:justify-end">
                    <PackagePriceLabel
                      type={item.type}
                      priceFrom={item.priceFrom}
                      className="mr-auto md:mr-0 md:text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setDetailTarifario(item.source)}
                      className="min-h-9 flex-1 rounded-xl border border-violet-500 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-600 transition hover:bg-violet-50 sm:flex-none"
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      aria-label="PDF"
                      disabled={downloadingPdfId === item.id}
                      onClick={() => void handleOpenPdf(item.source)}
                      className="flex h-9 w-11 items-center justify-center rounded-xl border border-violet-500 text-violet-600 transition hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
                    >
                      <IconFileTypePdf className="h-5 w-5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
        </>
      )}

      {canCreateTarifario || canManageTarifario ? (
        <NewTarifarioModal
          open={isModalOpen}
          onClose={handleCloseModal}
          onCreated={loadTarifarios}
          tarifario={editingTarifario}
        />
      ) : null}

      {detailTarifario ? (
        <TarifarioDetailModal
          tarifario={detailTarifario}
          onClose={() => setDetailTarifario(null)}
        />
      ) : null}
    </main>
  );
}

function TarifarioTypeSelectorCard({
  label,
  backgroundImage,
  onClick,
}: {
  label: string;
  backgroundImage: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative min-h-[230px] overflow-hidden rounded-2xl bg-slate-900 bg-cover bg-center p-6 text-center shadow-[0_34px_90px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_46px_120px_rgba(15,23,42,0.36)]"
      style={{ backgroundImage: `url("${backgroundImage}")` }}
    >
      <span className="absolute inset-0 bg-slate-950/45 transition group-hover:bg-slate-950/35" />
      <span className="relative flex min-h-[182px] items-center justify-center">
        <span className="text-3xl font-black text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.45)]">
          {label}
        </span>
      </span>
    </button>
  );
}

function CountryFilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-[12px] font-black transition ${
        active
          ? "border-violet-500 bg-white text-violet-700 shadow-[0_10px_24px_rgba(139,92,246,0.18)]"
          : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
      }`}
    >
      {label}
    </button>
  );
}

function TarifarioStatusTab({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
        active
          ? "bg-violet-100 text-violet-700"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PackagePriceLabel({
  type,
  priceFrom,
  className = "",
}: {
  type?: TarifarioListItem["type"];
  priceFrom: string;
  className?: string;
}) {
  if (type === "Tarifario") {
    return (
      <div className={className}>
        <span className="inline-flex px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-violet-600">
          Tarifario
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
        Desde
      </p>
      <p className="font-serif text-2xl text-violet-600">{priceFrom}</p>
    </div>
  );
}

function PackageActions({
  item,
  onEdit,
  onDelete,
  onArchive,
  canManage,
  canDelete,
  archiveLabel,
  compact = false,
  className = "",
}: {
  item: TarifarioListItem;
  onEdit: (item: TarifarioListItem) => void;
  onDelete: (item: TarifarioListItem) => void;
  onArchive: (item: TarifarioListItem) => void;
  canManage: boolean;
  canDelete: boolean;
  archiveLabel: string;
  compact?: boolean;
  className?: string;
}) {
  const items: MenuProps["items"] = [
    ...(canManage
      ? [
          {
            key: "edit",
            icon: <IconEdit className="h-4 w-4" />,
            label: "Editar",
          },
        ]
      : []),
    {
      key: "archive",
      icon: <IconArchive className="h-4 w-4" />,
      label: archiveLabel,
    },
    ...(canDelete
      ? [
          {
            key: "delete",
            danger: true,
            icon: <IconTrash className="h-4 w-4" />,
            label: "Eliminar",
          },
        ]
      : []),
  ];

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "edit") {
      onEdit(item);
      return;
    }

    if (key === "archive") {
      onArchive(item);
      return;
    }

    if (key === "delete") {
      onDelete(item);
    }
  };

  return (
    <div className={`flex ${compact ? "justify-end" : ""} ${className}`}>
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{ items, onClick: handleMenuClick }}
      >
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border-none bg-white text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
          aria-label="Acciones"
        >
          <IconDotsVertical className="h-4.5 w-4.5" />
        </button>
      </Dropdown>
    </div>
  );
}
