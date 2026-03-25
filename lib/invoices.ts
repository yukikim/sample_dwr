import "server-only";

import { prisma } from "@/lib/prisma";

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

export function hasSingleInvoiceClient(selection: InvoiceSelectionData) {
  return selection.groups.length <= 1;
}

function serializeInvoiceReport(report: {
  id: string;
  workDate: Date;
  clientCode: string;
  clientName: string;
  workCode: string;
  carType: string | null;
  workLocation: string | null;
  signerName: string | null;
  vehicleIdentifier: string | null;
  workMinutes: number;
  laborMinutes: number;
  travelMinutes: number;
  unitCount: number;
  salesAmount: { toNumber(): number };
  remarks: string | null;
}) {
  return {
    id: report.id,
    workDate: report.workDate.toISOString().slice(0, 10),
    clientCode: report.clientCode,
    clientName: report.clientName,
    workCode: report.workCode,
    carType: report.carType,
    workLocation: report.workLocation,
    signerName: report.signerName,
    vehicleIdentifier: report.vehicleIdentifier,
    workMinutes: report.workMinutes,
    laborMinutes: report.laborMinutes,
    travelMinutes: report.travelMinutes,
    unitCount: report.unitCount,
    salesAmount: report.salesAmount.toNumber(),
    remarks: report.remarks,
  } satisfies InvoiceReportItem;
}

function createEmptySelectionData(missingIds: string[] = []): InvoiceSelectionData {
  return {
    items: [],
    groups: [],
    summary: {
      reportCount: 0,
      clientCount: 0,
      totalSalesAmount: 0,
      totalWorkMinutes: 0,
      totalLaborMinutes: 0,
      totalTravelMinutes: 0,
      totalUnitCount: 0,
      startDate: null,
      endDate: null,
    },
    missingIds,
  };
}

export function formatInvoicePeriod(summary: InvoiceSelectionSummary) {
  if (!summary.startDate || !summary.endDate) {
    return "対象日なし";
  }

  if (summary.startDate === summary.endDate) {
    return summary.startDate;
  }

  return `${summary.startDate} - ${summary.endDate}`;
}

export async function getInvoiceSelectionData(selectedIds: string[]): Promise<InvoiceSelectionData> {
  if (selectedIds.length === 0) {
    return createEmptySelectionData();
  }

  const reports = await prisma.dailyWorkReport.findMany({
    where: {
      id: {
        in: selectedIds,
      },
    },
    orderBy: [{ clientCode: "asc" }, { clientName: "asc" }, { workDate: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      workDate: true,
      clientCode: true,
      clientName: true,
      workCode: true,
      carType: true,
      workLocation: true,
      signerName: true,
      vehicleIdentifier: true,
      workMinutes: true,
      laborMinutes: true,
      travelMinutes: true,
      unitCount: true,
      salesAmount: true,
      remarks: true,
    },
  });

  const items = reports.map(serializeInvoiceReport);
  const foundIdSet = new Set(items.map((item) => item.id));
  const missingIds = selectedIds.filter((id) => !foundIdSet.has(id));

  if (items.length === 0) {
    return createEmptySelectionData(missingIds);
  }

  const groupsByClient = new Map<string, InvoiceClientGroup>();

  for (const item of items) {
    const groupKey = `${item.clientCode}::${item.clientName}`;
    const existingGroup = groupsByClient.get(groupKey);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.totalSalesAmount += item.salesAmount;
      existingGroup.totalWorkMinutes += item.workMinutes;
      existingGroup.totalLaborMinutes += item.laborMinutes;
      existingGroup.totalTravelMinutes += item.travelMinutes;
      existingGroup.totalUnitCount += item.unitCount;
      continue;
    }

    groupsByClient.set(groupKey, {
      clientCode: item.clientCode,
      clientName: item.clientName,
      items: [item],
      totalSalesAmount: item.salesAmount,
      totalWorkMinutes: item.workMinutes,
      totalLaborMinutes: item.laborMinutes,
      totalTravelMinutes: item.travelMinutes,
      totalUnitCount: item.unitCount,
    });
  }

  const groups = Array.from(groupsByClient.values());
  const dates = items.map((item) => item.workDate).sort();
  const summary = groups.reduce<InvoiceSelectionSummary>(
    (accumulator, group) => {
      accumulator.reportCount += group.items.length;
      accumulator.totalSalesAmount += group.totalSalesAmount;
      accumulator.totalWorkMinutes += group.totalWorkMinutes;
      accumulator.totalLaborMinutes += group.totalLaborMinutes;
      accumulator.totalTravelMinutes += group.totalTravelMinutes;
      accumulator.totalUnitCount += group.totalUnitCount;

      return accumulator;
    },
    {
      reportCount: 0,
      clientCount: groups.length,
      totalSalesAmount: 0,
      totalWorkMinutes: 0,
      totalLaborMinutes: 0,
      totalTravelMinutes: 0,
      totalUnitCount: 0,
      startDate: dates[0] ?? null,
      endDate: dates[dates.length - 1] ?? null,
    },
  );

  return {
    items,
    groups,
    summary,
    missingIds,
  };
}