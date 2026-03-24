import { access, readFile } from "node:fs/promises";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";

import { apiError, requireAuthenticatedAdministrator } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildReportExportFileName } from "@/lib/report-export";
import { buildReportOrderBy, buildReportWhere } from "@/lib/reports";

export const runtime = "nodejs";

type SerializedReport = {
  workDate: string;
  clientCode: string;
  clientName: string;
  workMinutes: number;
  workCode: string;
  customerStatus: "new" | "existing";
  salesAmount: number;
  points: number | null;
  remarks: string | null;
};

type LoadedFontSource = {
  bytes: Uint8Array;
  subset: boolean;
};

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

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("ja-JP");

const PROJECT_FONT_PATH = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "noto-sans-jp",
  "files",
  "noto-sans-jp-japanese-400-normal.woff",
);

const SYSTEM_FONT_CANDIDATES = [
  process.env.PDF_FONT_PATH?.trim(),
  "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
].filter((value): value is string => Boolean(value));

let cachedJapaneseFontSourcePromise: Promise<LoadedFontSource> | null = null;

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function clipText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const ellipsis = "...";

  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }

  let low = 0;
  let high = text.length;
  let bestLength = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = `${text.slice(0, middle)}${ellipsis}`;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      bestLength = middle;
      low = middle + 1;
      continue;
    }

    high = middle - 1;
  }

  return `${text.slice(0, bestLength)}${ellipsis}`;
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

function serializePdfReport(report: {
  workDate: Date;
  clientCode: string;
  clientName: string;
  workMinutes: number;
  workCode: string;
  customerStatus: "new" | "existing";
  salesAmount: { toString(): string } | number;
  points: { toString(): string } | number | null;
  remarks: string | null;
}): SerializedReport {
  return {
    workDate: report.workDate.toISOString().slice(0, 10),
    clientCode: report.clientCode,
    clientName: report.clientName,
    workMinutes: report.workMinutes,
    workCode: report.workCode,
    customerStatus: report.customerStatus,
    salesAmount: Number(report.salesAmount),
    points: report.points === null ? null : Number(report.points),
    remarks: report.remarks,
  };
}

async function canAccessFile(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadJapaneseFontSource(): Promise<LoadedFontSource> {
  for (const fontPath of SYSTEM_FONT_CANDIDATES) {
    if ((fontPath.endsWith(".ttf") || fontPath.endsWith(".otf") || fontPath.endsWith(".woff")) && (await canAccessFile(fontPath))) {
      return {
        bytes: await readFile(fontPath),
        subset: true,
      };
    }
  }

  return {
    bytes: await readFile(PROJECT_FONT_PATH),
    subset: true,
  };
}

async function getJapaneseFontSource() {
  if (!cachedJapaneseFontSourcePromise) {
    cachedJapaneseFontSourcePromise = loadJapaneseFontSource();
  }

  return cachedJapaneseFontSourcePromise;
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
      select: {
        workDate: true,
        clientCode: true,
        clientName: true,
        workMinutes: true,
        workCode: true,
        customerStatus: true,
        salesAmount: true,
        points: true,
        remarks: true,
      },
      orderBy: buildReportOrderBy(),
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

  const serializedReports = reports.map(serializePdfReport);
  const pdfDocument = await PDFDocument.create();
  pdfDocument.registerFontkit(fontkit);
  const fontSource = await getJapaneseFontSource();
  const regularFont = await pdfDocument.embedFont(fontSource.bytes, { subset: fontSource.subset });
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
  const fileName = buildReportExportFileName(searchParams, "pdf");
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