export const invoiceDocumentTypes = ["work-slip", "delivery-note", "invoice"] as const;

export type InvoiceDocumentType = (typeof invoiceDocumentTypes)[number];

type PageSearchParams = Record<string, string | string[] | undefined>;

const invoiceDocumentLabels: Record<InvoiceDocumentType, string> = {
  "work-slip": "作業伝票",
  "delivery-note": "納品書",
  invoice: "請求書",
};

function normalizeMultiValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  }

  return [];
}

function dedupe<T extends string>(values: T[]) {
  return Array.from(new Set(values)) as T[];
}

export function getInvoiceDocumentLabel(documentType: InvoiceDocumentType) {
  return invoiceDocumentLabels[documentType];
}

export function parseInvoiceSelectionIds(searchParams: URLSearchParams) {
  return dedupe(searchParams.getAll("ids").map((value) => value.trim()).filter(Boolean)).slice(0, 100);
}

export function parseInvoiceSelectionIdsFromPage(searchParams: PageSearchParams) {
  return dedupe(normalizeMultiValue(searchParams.ids)).slice(0, 100);
}

export function parseInvoiceDocumentTypes(searchParams: URLSearchParams): InvoiceDocumentType[] {
  const rawValues = normalizeMultiValue(searchParams.getAll("document"));

  if (rawValues.length === 0 || rawValues.includes("all")) {
    return [...invoiceDocumentTypes];
  }

  const filteredValues = rawValues.filter((value): value is InvoiceDocumentType =>
    invoiceDocumentTypes.includes(value as InvoiceDocumentType),
  );

  return filteredValues.length > 0 ? dedupe(filteredValues) : [...invoiceDocumentTypes];
}

export function buildInvoicePageUrl(selectedIds: string[]) {
  const searchParams = new URLSearchParams();

  for (const id of selectedIds) {
    searchParams.append("ids", id);
  }

  const query = searchParams.toString();
  return query ? `/invoices?${query}` : "/invoices";
}

export function buildInvoicePdfUrl(
  selectedIds: string[],
  documentTypes: InvoiceDocumentType[] | "all",
  disposition: "attachment" | "inline" = "attachment",
) {
  const searchParams = new URLSearchParams();

  for (const id of selectedIds) {
    searchParams.append("ids", id);
  }

  if (documentTypes === "all") {
    searchParams.append("document", "all");
  } else {
    for (const documentType of documentTypes) {
      searchParams.append("document", documentType);
    }
  }

  if (disposition === "inline") {
    searchParams.append("disposition", "inline");
  }

  return `/api/invoices/pdf?${searchParams.toString()}`;
}

export function buildInvoicePdfFileName(documentTypes: InvoiceDocumentType[], issuedAt = new Date()) {
  const documentKey = documentTypes.length === 1 ? documentTypes[0] : "document-set";
  const timestamp = issuedAt.toISOString().slice(0, 10).replace(/-/g, "");

  return `polish-dwr_${documentKey}_${timestamp}.pdf`;
}