type PdfRequestOptions = {
  url: string;
  fileName?: string;
  method?: "GET" | "POST";
  headers?: HeadersInit;
  body?: BodyInit | null;
  onDownloaded?: () => void;
  presentation?: "open" | "download";
};

export function isMobilePdfViewport() {
  return window.matchMedia(
    "(max-width: 767px), (pointer: coarse) and (hover: none)",
  ).matches;
}

export function openInNewTab(href: string) {
  const opened = window.open(href, "_blank");
  if (opened) {
    opened.opener = null;
  }
}

export function getFileNameFromContentDisposition(
  contentDisposition: string | null,
) {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ""));
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1];

  const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim().replace(/^"|"$/g, "") || null;
}

export function withPdfDisposition(url: string, disposition: "inline" | "attachment") {
  const parsedUrl = new URL(url, window.location.origin);
  parsedUrl.searchParams.set("disposition", disposition);

  if (parsedUrl.origin === window.location.origin) {
    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  }

  return parsedUrl.toString();
}

export function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

export async function openOrDownloadGeneratedPdf({
  url,
  fileName = "documento.pdf",
  method = "GET",
  headers,
  body,
  onDownloaded,
  presentation = "open",
}: PdfRequestOptions) {
  const shouldDownload = presentation === "download" || isMobilePdfViewport();

  if (!shouldDownload && method === "GET") {
    openInNewTab(withPdfDisposition(url, "inline"));
    return;
  }

  const pendingTab =
    !shouldDownload && method !== "GET"
      ? window.open("about:blank", "_blank", "noopener,noreferrer")
      : null;

  if (pendingTab) {
    pendingTab.opener = null;
    pendingTab.document.title = "Generando PDF";
    const loadingText = pendingTab.document.createElement("p");
    loadingText.textContent = "Generando PDF...";
    loadingText.style.fontFamily = "system-ui, sans-serif";
    loadingText.style.padding = "24px";
    pendingTab.document.body.appendChild(loadingText);
  }

  const response = await fetch(withPdfDisposition(url, "attachment"), {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      details?: string;
    };

    throw new Error(
      payload.details || payload.error || "No se pudo generar el PDF.",
    );
  }

  const blob = await response.blob();
  const responseFileName =
    getFileNameFromContentDisposition(response.headers.get("content-disposition")) ||
    fileName;

  if (shouldDownload) {
    downloadBlob(blob, responseFileName);
    onDownloaded?.();
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  if (pendingTab && !pendingTab.closed) {
    pendingTab.location.href = objectUrl;
  } else {
    openInNewTab(objectUrl);
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
