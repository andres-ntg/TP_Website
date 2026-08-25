export function formatCreatedDate(value: string | Date | null | undefined) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function isCreatedWithinDateRange(
  value: string | Date | null | undefined,
  from: string,
  to: string,
) {
  if (!from && !to) return true;

  const createdAt = new Date(value ?? 0).getTime();
  if (!Number.isFinite(createdAt) || createdAt <= 0) return false;

  if (from) {
    const fromTime = new Date(`${from}T00:00:00`).getTime();
    if (createdAt < fromTime) return false;
  }

  if (to) {
    const toTime = new Date(`${to}T23:59:59.999`).getTime();
    if (createdAt > toTime) return false;
  }

  return true;
}
