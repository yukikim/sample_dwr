import "server-only";

import { prisma } from "@/lib/prisma";
import {
  formatMonthlyInvoiceMonthLabel,
  getMonthlyInvoiceMonthRange,
  parseMonthlyInvoiceMonth,
} from "@/lib/monthly-invoice-documents";

export type MonthlyInvoiceLineItem = {
  workCode: string;
  unitCount: number;
  amount: number;
};

export type MonthlyInvoiceClientGroup = {
  clientCode: string;
  clientName: string;
  reportCount: number;
  unitCount: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  items: MonthlyInvoiceLineItem[];
};

export type MonthlyInvoiceSummary = {
  month: string;
  monthLabel: string;
  clientCount: number;
  reportCount: number;
  unitCount: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export type MonthlyInvoiceData = {
  summary: MonthlyInvoiceSummary;
  groups: MonthlyInvoiceClientGroup[];
};

function calculateTaxAmount(subtotalAmount: number) {
  return Math.floor(subtotalAmount * 0.1);
}

function createEmptyMonthlyInvoiceData(month: string): MonthlyInvoiceData {
  return {
    summary: {
      month,
      monthLabel: formatMonthlyInvoiceMonthLabel(month),
      clientCount: 0,
      reportCount: 0,
      unitCount: 0,
      subtotalAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
    },
    groups: [],
  };
}

export async function getMonthlyInvoiceData(month: string): Promise<MonthlyInvoiceData | null> {
  const normalizedMonth = parseMonthlyInvoiceMonth(month);

  if (!normalizedMonth) {
    return null;
  }

  const monthRange = getMonthlyInvoiceMonthRange(normalizedMonth);

  if (!monthRange) {
    return null;
  }

  const reports = await prisma.dailyWorkReport.findMany({
    where: {
      workDate: {
        gte: monthRange.startDate,
        lt: monthRange.endDate,
      },
    },
    orderBy: [
      { clientCode: "asc" },
      { clientName: "asc" },
      { workCode: "asc" },
      { workDate: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      clientCode: true,
      clientName: true,
      workCode: true,
      unitCount: true,
      salesAmount: true,
    },
  });

  if (reports.length === 0) {
    return createEmptyMonthlyInvoiceData(normalizedMonth);
  }

  const groupsByClient = new Map<
    string,
    {
      clientCode: string;
      clientName: string;
      reportCount: number;
      unitCount: number;
      subtotalAmount: number;
      itemsByWorkCode: Map<string, MonthlyInvoiceLineItem>;
    }
  >();

  for (const report of reports) {
    const groupKey = `${report.clientCode}::${report.clientName}`;
    const existingGroup = groupsByClient.get(groupKey);
    const salesAmount = report.salesAmount.toNumber();

    if (!existingGroup) {
      groupsByClient.set(groupKey, {
        clientCode: report.clientCode,
        clientName: report.clientName,
        reportCount: 1,
        unitCount: report.unitCount,
        subtotalAmount: salesAmount,
        itemsByWorkCode: new Map([
          [
            report.workCode,
            {
              workCode: report.workCode,
              unitCount: report.unitCount,
              amount: salesAmount,
            },
          ],
        ]),
      });
      continue;
    }

    existingGroup.reportCount += 1;
    existingGroup.unitCount += report.unitCount;
    existingGroup.subtotalAmount += salesAmount;

    const existingLineItem = existingGroup.itemsByWorkCode.get(report.workCode);

    if (existingLineItem) {
      existingLineItem.unitCount += report.unitCount;
      existingLineItem.amount += salesAmount;
      continue;
    }

    existingGroup.itemsByWorkCode.set(report.workCode, {
      workCode: report.workCode,
      unitCount: report.unitCount,
      amount: salesAmount,
    });
  }

  const groups = Array.from(groupsByClient.values()).map<MonthlyInvoiceClientGroup>((group) => {
    const taxAmount = calculateTaxAmount(group.subtotalAmount);

    return {
      clientCode: group.clientCode,
      clientName: group.clientName,
      reportCount: group.reportCount,
      unitCount: group.unitCount,
      subtotalAmount: group.subtotalAmount,
      taxAmount,
      totalAmount: group.subtotalAmount + taxAmount,
      items: Array.from(group.itemsByWorkCode.values()),
    };
  });

  const summary = groups.reduce<MonthlyInvoiceSummary>(
    (accumulator, group) => {
      accumulator.clientCount += 1;
      accumulator.reportCount += group.reportCount;
      accumulator.unitCount += group.unitCount;
      accumulator.subtotalAmount += group.subtotalAmount;
      accumulator.taxAmount += group.taxAmount;
      accumulator.totalAmount += group.totalAmount;
      return accumulator;
    },
    {
      month: normalizedMonth,
      monthLabel: formatMonthlyInvoiceMonthLabel(normalizedMonth),
      clientCount: 0,
      reportCount: 0,
      unitCount: 0,
      subtotalAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
    },
  );

  return {
    summary,
    groups,
  };
}