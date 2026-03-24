import { apiError, requireAuthenticatedAdministrator } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildReportExportFileName, formatCustomerStatusLabel } from "@/lib/report-export";
import { buildReportWhere, serializeReport } from "@/lib/reports";

export const runtime = "nodejs";

type SerializedReport = ReturnType<typeof serializeReport>;

const CSV_HEADERS = [
  "ID",
  "日付",
  "得意先コード",
  "得意先名",
  "車種",
  "作業コード",
  "新規/既存",
  "台数",
  "売上金額",
  "作業分",
  "工数分",
  "移動分",
  "基準分",
  "ポイント",
  "備考",
  "作成者ID",
  "作成日時",
  "更新日時",
];

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
    report.id,
    report.workDate,
    report.clientCode,
    report.clientName,
    report.carType,
    report.workCode,
    formatCustomerStatusLabel(report.customerStatus),
    report.unitCount,
    report.salesAmount,
    report.workMinutes,
    report.laborMinutes,
    report.travelMinutes,
    report.standardMinutes,
    report.points,
    report.remarks,
    report.createdBy,
    report.createdAt,
    report.updatedAt,
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
    carType: searchParams.get("carType"),
    workCode: searchParams.get("workCode"),
    customerStatus: searchParams.get("customerStatus"),
  });

  const reports = await prisma.dailyWorkReport.findMany({
    where,
    orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
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