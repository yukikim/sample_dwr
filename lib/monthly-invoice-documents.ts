function normalizeMonthValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function parseMonthlyInvoiceMonth(value: string | null | undefined) {
  const normalizedValue = (value ?? "").trim();

  if (!/^\d{4}-\d{2}$/.test(normalizedValue)) {
    return null;
  }

  const [year, month] = normalizedValue.split("-").map(Number);

  if (!year || !month || month < 1 || month > 12) {
    return null;
  }

  return normalizedValue;
}

export function parseMonthlyInvoiceMonthFromPage(searchParams: Record<string, string | string[] | undefined>) {
  return parseMonthlyInvoiceMonth(normalizeMonthValue(searchParams.month));
}

export function formatMonthlyInvoiceMonthLabel(month: string) {
  const [year, monthValue] = month.split("-");
  return `${year}年${Number(monthValue)}月`;
}

export function getMonthlyInvoiceMonthRange(month: string) {
  const normalizedMonth = parseMonthlyInvoiceMonth(month);

  if (!normalizedMonth) {
    return null;
  }

  const [year, monthValue] = normalizedMonth.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, monthValue - 1, 1));
  const endDate = new Date(Date.UTC(year, monthValue, 1));

  return {
    startDate,
    endDate,
  };
}

export function buildMonthlyInvoicePageUrl(month: string) {
  const normalizedMonth = parseMonthlyInvoiceMonth(month);

  if (!normalizedMonth) {
    return "/reports/monthly-invoices";
  }

  const searchParams = new URLSearchParams({ month: normalizedMonth });
  return `/reports/monthly-invoices?${searchParams.toString()}`;
}

export function buildMonthlyInvoicePdfUrl(
  month: string,
  disposition: "attachment" | "inline" = "attachment",
) {
  const normalizedMonth = parseMonthlyInvoiceMonth(month);
  const searchParams = new URLSearchParams();

  if (normalizedMonth) {
    searchParams.set("month", normalizedMonth);
  }

  if (disposition === "inline") {
    searchParams.set("disposition", "inline");
  }

  return `/api/reports/monthly-invoices/pdf?${searchParams.toString()}`;
}

export function buildMonthlyInvoicePdfFileName(month: string) {
  const normalizedMonth = parseMonthlyInvoiceMonth(month) ?? "unknown-month";
  return `polish-dwr_monthly-invoice_${normalizedMonth.replace(/-/g, "")}.pdf`;
}