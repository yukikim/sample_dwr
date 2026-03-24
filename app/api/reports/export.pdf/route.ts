import { readFile } from "node:fs/promises";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";

import { apiError, requireAuthenticatedAdministrator } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildReportWhere, serializeReport } from "@/lib/reports";

export const runtime = "nodejs";

type SerializedReport = ReturnType<typeof serializeReport>;

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 40;
const MARGIN_BOTTOM = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const BRAND = {
  ink: rgb(0.14, 0.09, 0.08),
  muted: rgb(0.36, 0.29, 0.26),
  soft: rgb(0.52, 0.43, 0.40),
  line: rgb(0.88, 0.84, 0.80),
  surface: rgb(0.98, 0.96, 0.93),
  surfaceStrong: rgb(0.95, 0.92, 0.88),
  accent: rgb(0.70, 0.30, 0.23),
  accentSoft: rgb(0.96, 0.90, 0.86),
  successSoft: rgb(0.92, 0.96, 0.93),
};

const TABLE_COLUMNS = [
  { label: "日付", x: 42, width: 55 },
  { label: "得意先", x: 100, width: 134 },
  { label: "作業", x: 238, width: 54 },
  { label: "状態", x: 296, width: 42 },
  { label: "売上", x: 342, width: 74 },
  { label: "作業分", x: 420, width: 42 },
  { label: "ポイント", x: 466, width: 40 },
  { label: "備考", x: 510, width: 42 },
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function sanitizeFileNamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

function buildReportFileName(searchParams: URLSearchParams) {
  const parts = ["polish-dwr", "report"];
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const clientCode = searchParams.get("clientCode");
  const workCode = searchParams.get("workCode");
  const customerStatus = searchParams.get("customerStatus");
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

  if (carType) {
    parts.push(`car-${sanitizeFileNamePart(carType)}`);
  }

  if (parts.length === 2) {
    parts.push("all");
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  parts.push(timestamp);

  return `${parts.join("_")}.pdf`;
}

function clipText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const ellipsis = "...";

  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }

  let clipped = text;

  while (clipped.length > 0 && font.widthOfTextAtSize(`${clipped}${ellipsis}`, size) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }

  return `${clipped}${ellipsis}`;
}

function buildFilterLines(searchParams: URLSearchParams) {
  const filters = [
    ["開始日", searchParams.get("startDate")],
    ["終了日", searchParams.get("endDate")],
    ["得意先コード", searchParams.get("clientCode")],
    ["得意先名", searchParams.get("clientName")],
    ["車種", searchParams.get("carType")],
    ["作業コード", searchParams.get("workCode")],
    ["新規/既存", searchParams.get("customerStatus") === "new" ? "新規" : searchParams.get("customerStatus") === "existing" ? "既存" : null],
  ].filter(([, value]) => value);

  if (filters.length === 0) {
    return ["検索条件: 指定なし"];
  }

  return filters.map(([label, value]) => `${label}: ${value}`);
}

function drawTextLine(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = BRAND.ink) {
  page.drawText(text, {
    x,
    y,
    font,
    size,
    color,
  });
}

function drawBanner(page: PDFPage) {
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 120,
    width: PAGE_WIDTH,
    height: 120,
    color: BRAND.surface,
  });

  page.drawRectangle({
    x: MARGIN_X,
    y: PAGE_HEIGHT - 96,
    width: CONTENT_WIDTH,
    height: 48,
    color: BRAND.accentSoft,
  });
}

function drawReportHeader(page: PDFPage, font: PDFFont, administrator: { name: string; email: string }) {
  drawBanner(page);
  drawTextLine(page, "Polish-DWR", MARGIN_X + 14, PAGE_HEIGHT - 70, font, 10, BRAND.accent);
  drawTextLine(page, "日報集計レポート", MARGIN_X + 14, PAGE_HEIGHT - 88, font, 20, BRAND.ink);
  drawTextLine(page, `出力日時: ${new Date().toLocaleString("ja-JP")}`, PAGE_WIDTH - 220, PAGE_HEIGHT - 68, font, 9, BRAND.muted);
  drawTextLine(page, `出力者: ${administrator.name} / ${administrator.email}`, PAGE_WIDTH - 220, PAGE_HEIGHT - 84, font, 9, BRAND.muted);
}

function drawFilterPanel(page: PDFPage, font: PDFFont, filterLines: string[], y: number) {
  const panelHeight = 18 + filterLines.length * 14;

  page.drawRectangle({
    x: MARGIN_X,
    y: y - panelHeight + 8,
    width: CONTENT_WIDTH,
    height: panelHeight,
    color: rgb(1, 1, 1),
    borderColor: BRAND.line,
    borderWidth: 0.8,
  });

  drawTextLine(page, "検索条件", MARGIN_X + 12, y - 10, font, 10, BRAND.accent);
  let currentY = y - 26;

  for (const line of filterLines) {
    drawTextLine(page, line, MARGIN_X + 12, currentY, font, 9, BRAND.muted);
    currentY -= 14;
  }

  return y - panelHeight - 8;
}

function drawSummaryCard(page: PDFPage, font: PDFFont, x: number, y: number, width: number, title: string, value: string) {
  page.drawRectangle({
    x,
    y,
    width,
    height: 52,
    color: BRAND.surface,
    borderColor: BRAND.line,
    borderWidth: 0.8,
  });

  drawTextLine(page, title, x + 10, y + 24, font, 8, BRAND.muted);
  drawTextLine(page, value, x + 10, y + 8, font, 12, BRAND.ink);
}

function drawSummaryPanel(
  page: PDFPage,
  font: PDFFont,
  y: number,
  summary: {
    count: number;
    salesAmountTotal: number;
    workMinutesTotal: number;
    pointsTotal: number;
  },
) {
  const gap = 10;
  const cardWidth = (CONTENT_WIDTH - gap * 3) / 4;

  drawSummaryCard(page, font, MARGIN_X, y - 46, cardWidth, "件数", `${formatNumber(summary.count)} 件`);
  drawSummaryCard(page, font, MARGIN_X + (cardWidth + gap) * 1, y - 46, cardWidth, "売上合計", formatCurrency(summary.salesAmountTotal));
  drawSummaryCard(page, font, MARGIN_X + (cardWidth + gap) * 2, y - 46, cardWidth, "作業分合計", `${formatNumber(summary.workMinutesTotal)} 分`);
  drawSummaryCard(page, font, MARGIN_X + (cardWidth + gap) * 3, y - 46, cardWidth, "ポイント合計", `${formatNumber(summary.pointsTotal)} pt`);

  return y - 68;
}

function drawTableHeader(page: PDFPage, font: PDFFont, y: number) {
  page.drawRectangle({
    x: MARGIN_X,
    y: y - 6,
    width: CONTENT_WIDTH,
    height: 20,
    color: BRAND.surfaceStrong,
  });

  for (const header of TABLE_COLUMNS) {
    drawTextLine(page, header.label, header.x, y, font, 8.5, BRAND.muted);
  }
}

function drawReportRow(page: PDFPage, report: SerializedReport, font: PDFFont, y: number, rowIndex: number) {
  if (rowIndex % 2 === 0) {
    page.drawRectangle({
      x: MARGIN_X,
      y: y - 6,
      width: CONTENT_WIDTH,
      height: 18,
      color: rgb(0.995, 0.992, 0.987),
    });
  }

  const cells = [
    { text: report.workDate, x: 42, width: 55 },
    { text: `${report.clientName} (${report.clientCode})`, x: 100, width: 134 },
    { text: report.workCode, x: 238, width: 54 },
    { text: report.customerStatus === "new" ? "新規" : "既存", x: 296, width: 42 },
    { text: formatCurrency(report.salesAmount), x: 342, width: 74 },
    { text: formatNumber(report.workMinutes), x: 420, width: 42 },
    { text: report.points === null ? "-" : formatNumber(report.points), x: 466, width: 40 },
    { text: report.remarks ?? "-", x: 510, width: 42 },
  ];

  page.drawLine({
    start: { x: MARGIN_X, y: y - 4 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: y - 4 },
    color: BRAND.line,
    thickness: 0.6,
  });

  for (const cell of cells) {
    drawTextLine(page, clipText(cell.text, cell.width, font, 8), cell.x, y, font, 8);
  }
}

function drawFooter(page: PDFPage, font: PDFFont, currentPage: number, totalPages: number) {
  page.drawLine({
    start: { x: MARGIN_X, y: 26 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: 26 },
    color: BRAND.line,
    thickness: 0.8,
  });
  drawTextLine(page, "Polish-DWR", MARGIN_X, 14, font, 8, BRAND.soft);
  drawTextLine(page, `${currentPage} / ${totalPages}`, PAGE_WIDTH - MARGIN_X - 28, 14, font, 8, BRAND.soft);
}

function createReportPage(pdfDocument: PDFDocument, font: PDFFont, administrator: { name: string; email: string }) {
  const page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawReportHeader(page, font, administrator);
  return page;
}

async function loadJapaneseFont() {
  const fontPath = path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    "noto-sans-jp",
    "files",
    "noto-sans-jp-japanese-400-normal.woff",
  );

  return readFile(fontPath);
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

  const [reports, summary] = await prisma.$transaction([
    prisma.dailyWorkReport.findMany({
      where,
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.dailyWorkReport.aggregate({
      where,
      _count: { _all: true },
      _sum: {
        salesAmount: true,
        workMinutes: true,
        laborMinutes: true,
        travelMinutes: true,
        unitCount: true,
        standardMinutes: true,
        points: true,
      },
    }),
  ]);

  const serializedReports = reports.map(serializeReport);
  const pdfDocument = await PDFDocument.create();
  pdfDocument.registerFontkit(fontkit);
  const fontBytes = await loadJapaneseFont();
  const regularFont = await pdfDocument.embedFont(fontBytes);
  let page = createReportPage(pdfDocument, regularFont, administrator);
  let y = PAGE_HEIGHT - 152;

  y = drawFilterPanel(page, regularFont, buildFilterLines(searchParams), y);
  y = drawSummaryPanel(page, regularFont, y, {
    count: summary._count._all,
    salesAmountTotal: Number(summary._sum.salesAmount ?? 0),
    workMinutesTotal: summary._sum.workMinutes ?? 0,
    pointsTotal: Number(summary._sum.points ?? 0),
  });

  drawTextLine(page, "日報一覧", MARGIN_X, y, regularFont, 13, BRAND.accent);
  y -= 20;
  drawTableHeader(page, regularFont, y);
  y -= 24;

  for (const [index, report] of serializedReports.entries()) {
    if (y < MARGIN_BOTTOM + 24) {
      page = createReportPage(pdfDocument, regularFont, administrator);
      y = PAGE_HEIGHT - 136;
      drawTextLine(page, "日報一覧", MARGIN_X, y, regularFont, 12, BRAND.accent);
      y -= 18;
      drawTableHeader(page, regularFont, y);
      y -= 24;
    }

    drawReportRow(page, report, regularFont, y, index);
    y -= 20;
  }

  if (serializedReports.length === 0) {
    page.drawRectangle({
      x: MARGIN_X,
      y: y - 14,
      width: CONTENT_WIDTH,
      height: 34,
      color: BRAND.successSoft,
      borderColor: BRAND.line,
      borderWidth: 0.8,
    });
    drawTextLine(page, "対象の日報データはありません。", MARGIN_X + 12, y, regularFont, 10, BRAND.muted);
  }

  const pages = pdfDocument.getPages();

  for (const [index, currentPage] of pages.entries()) {
    drawFooter(currentPage, regularFont, index + 1, pages.length);
  }

  const pdfBytes = await pdfDocument.save();
  const fileName = buildReportFileName(searchParams);
  const encodedFileName = encodeURIComponent(fileName);

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
      "Cache-Control": "no-store",
    },
  });
}