import { apiError, requireAuthenticatedAdministrator } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildReportExportFileName, formatBillingStatusLabel, formatCustomerStatusLabel } from "@/lib/report-export";
import { buildReportOrderBy, buildReportWhere, serializeReport } from "@/lib/reports";

export const runtime = "nodejs";

type SerializedReport = ReturnType<typeof serializeReport>;

const CSV_HEADERS = [
  "日付",
  "得意先",
  "車種",
  "作業場所",
  "登録番号または車体番号",
  "作業内容",
  "担当者(サイン)",
  "状態",
  "請求処理",
  "売上",
  "作業分",
  "工数分",
  "移動分",
  "台数",
  "基準分",
  "ポイント",
  "備考",
];

function formatClientLabel(report: SerializedReport) {
  return `${report.clientName} (${report.clientCode})`;
}

function escapeCsvValue(value: string | number | null) {
  if (value === null) {
    return "";
  }

  const normalizedValue = String(value);

  if (!/[",\n\r]/.test(normalizedValue)) {
    return normalizedValue;
  }

  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

function buildCsvContent(reports: SerializedReport[]) {
  const rows = reports.map((report) => [
    report.workDate,
    formatClientLabel(report),
    report.carType,
    report.workLocation,
    report.vehicleIdentifier,
    report.workCode,
    report.signerName,
    formatCustomerStatusLabel(report.customerStatus),
    formatBillingStatusLabel(report.billingStatus),
    report.salesAmount,
    report.workMinutes,
    report.laborMinutes,
    report.travelMinutes,
    report.unitCount,
    report.standardMinutes,
    report.points,
    report.remarks,
  ]);

  return [CSV_HEADERS, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value ?? null)).join(","))
    .join("\r\n");
}

export async function GET(request: Request) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const where = buildReportWhere({
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    clientCode: searchParams.get("clientCode"),
    clientName: searchParams.get("clientName"),
    purchaser: searchParams.get("purchaser"),
    carType: searchParams.get("carType"),
    workLocation: searchParams.get("workLocation"),
    vehicleIdentifier: searchParams.get("vehicleIdentifier"),
    workCode: searchParams.get("workCode"),
    customerStatus: searchParams.get("customerStatus"),
    billingStatus: searchParams.get("billingStatus"),
  });

  const reports = await prisma.dailyWorkReport.findMany({
    where,
    orderBy: buildReportOrderBy(),
  });

  const csvContent = buildCsvContent(reports.map(serializeReport));
  const fileName = buildReportExportFileName(searchParams, "csv");
  const encodedFileName = encodeURIComponent(fileName);
  const csvBytes = new TextEncoder().encode(`\uFEFF${csvContent}`);

  return new Response(csvBytes, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
      "Cache-Control": "no-store",
    },
  });
}