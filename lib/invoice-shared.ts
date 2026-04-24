export const invoiceIssuer = {
  companyName: "POLiSH.合同会社",
  address: "〒270-1337 千葉県印西市草深2429-18",
  transferAccount: "xxxxxx",
  sealLabel: "印",
} as const;

export type InvoiceReportItem = {
  id: string;
  workDate: string;
  clientCode: string;
  clientName: string;
  purchaser: string | null;
  workCode: string;
  carType: string | null;
  workLocation: string | null;
  signerName: string | null;
  vehicleIdentifier: string | null;
  workMinutes: number;
  laborMinutes: number;
  travelMinutes: number;
  unitCount: number;
  salesAmount: number;
  remarks: string | null;
};

export type InvoiceClientGroup = {
  clientCode: string;
  clientName: string;
  items: InvoiceReportItem[];
  totalSalesAmount: number;
  totalWorkMinutes: number;
  totalLaborMinutes: number;
  totalTravelMinutes: number;
  totalUnitCount: number;
};

export type InvoiceSelectionSummary = {
  reportCount: number;
  clientCount: number;
  totalSalesAmount: number;
  totalWorkMinutes: number;
  totalLaborMinutes: number;
  totalTravelMinutes: number;
  totalUnitCount: number;
  startDate: string | null;
  endDate: string | null;
};

export type InvoiceSelectionData = {
  items: InvoiceReportItem[];
  groups: InvoiceClientGroup[];
  summary: InvoiceSelectionSummary;
  missingIds: string[];
};

export function formatInvoicePeriod(summary: InvoiceSelectionSummary) {
  if (!summary.startDate || !summary.endDate) {
    return "対象日なし";
  }

  if (summary.startDate === summary.endDate) {
    return summary.startDate;
  }

  return `${summary.startDate} - ${summary.endDate}`;
}