import { BillingStatus } from "@prisma/client";

import { apiError, apiSuccess, readJsonBody, requireAuthenticatedAdministrator } from "@/lib/api";
import { getMonthlyInvoiceMonthRange, parseMonthlyInvoiceMonth } from "@/lib/monthly-invoice-documents";
import { prisma } from "@/lib/prisma";

type BulkBillingStatusInput = {
  reportIds?: unknown;
  month?: unknown;
  billingStatus?: unknown;
};

function parseReportIds(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const reportIds = Array.from(new Set(value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)));

  return reportIds.length > 0 ? reportIds : null;
}

function parseBillingStatus(value: unknown) {
  if (value === BillingStatus.unprocessed || value === BillingStatus.processed) {
    return value;
  }

  return null;
}

function parseMonth(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return parseMonthlyInvoiceMonth(value);
}

export async function PATCH(request: Request) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const body = await readJsonBody<BulkBillingStatusInput>(request);

  if (!body) {
    return apiError({ code: "INVALID_JSON", message: "JSON ボディを解析できませんでした。" }, { status: 400 });
  }

  const reportIds = parseReportIds(body.reportIds);
  const month = parseMonth(body.month);

  const billingStatus = parseBillingStatus(body.billingStatus);

  if (!billingStatus) {
    return apiError({ code: "VALIDATION_ERROR", message: "請求処理は未または済を指定してください。" }, { status: 400 });
  }

  if (!reportIds && !month) {
    return apiError({ code: "VALIDATION_ERROR", message: "更新対象の日報または対象月を指定してください。" }, { status: 400 });
  }

  const monthRange = month ? getMonthlyInvoiceMonthRange(month) : null;

  if (month && !monthRange) {
    return apiError({ code: "VALIDATION_ERROR", message: "対象月の形式が不正です。" }, { status: 400 });
  }

  const result = await prisma.dailyWorkReport.updateMany({
    where: {
      ...(reportIds
        ? {
            id: {
              in: reportIds,
            },
          }
        : {}),
      ...(monthRange
        ? {
            workDate: {
              gte: monthRange.startDate,
              lt: monthRange.endDate,
            },
          }
        : {}),
    },
    data: {
      billingStatus,
    },
  });

  return apiSuccess({ updatedCount: result.count }, { status: 200 });
}