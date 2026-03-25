export function sanitizeFileNamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

export function buildReportExportFileName(searchParams: URLSearchParams, extension: "pdf" | "csv") {
  const parts = ["polish-dwr", "report"];
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const clientCode = searchParams.get("clientCode");
  const workLocation = searchParams.get("workLocation");
  const vehicleIdentifier = searchParams.get("vehicleIdentifier");
  const workCode = searchParams.get("workCode");
  const customerStatus = searchParams.get("customerStatus");
  const billingStatus = searchParams.get("billingStatus");
  const clientName = searchParams.get("clientName");
  const carType = searchParams.get("carType");

  if (startDate || endDate) {
    parts.push(`period-${startDate ?? "from"}-${endDate ?? "to"}`);
  }

  if (clientCode) {
    parts.push(`client-${sanitizeFileNamePart(clientCode)}`);
  } else if (clientName) {
    parts.push(`client-${sanitizeFileNamePart(clientName)}`);
  }

  if (workCode) {
    parts.push(`work-${sanitizeFileNamePart(workCode)}`);
  }

  if (customerStatus === "new" || customerStatus === "existing") {
    parts.push(`status-${customerStatus}`);
  }

  if (billingStatus === "processed" || billingStatus === "unprocessed") {
    parts.push(`billing-${billingStatus}`);
  }

  if (carType) {
    parts.push(`car-${sanitizeFileNamePart(carType)}`);
  }

  if (workLocation) {
    parts.push(`location-${sanitizeFileNamePart(workLocation)}`);
  }

  if (vehicleIdentifier) {
    parts.push(`vehicle-${sanitizeFileNamePart(vehicleIdentifier)}`);
  }

  if (parts.length === 2) {
    parts.push("all");
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  parts.push(timestamp);

  return `${parts.join("_")}.${extension}`;
}

export function formatCustomerStatusLabel(value: string) {
  if (value === "new") {
    return "新規";
  }

  if (value === "existing") {
    return "既存";
  }

  return value;
}

export function formatBillingStatusLabel(value: string) {
  if (value === "processed") {
    return "済";
  }

  if (value === "unprocessed") {
    return "未";
  }

  return value;
}