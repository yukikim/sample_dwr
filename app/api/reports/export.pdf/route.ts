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
  carType: string | null;
  workMinutes: number;
  laborMinutes: number;
  travelMinutes: number;
  workCode: string;
  customerStatus: "new" | "existing";
  unitCount: number;
  salesAmount: number;
  standardMinutes: number | null;
  points: number | null;
  remarks: string | null;
};

type LoadedFontSource = {
  bytes: Uint8Array;
  filePath: string;
};

type FontBundle = {
  primary: PDFFont;
  fallbacks: PDFFont[];
  all: PDFFont[];
};

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN_X = 32;
const MARGIN_BOTTOM = 28;
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
  { label: "日付", x: 36, width: 64 },
  { label: "得意先", x: 104, width: 136 },
  { label: "車種", x: 244, width: 52 },
  { label: "作業コード", x: 300, width: 52 },
  { label: "状態", x: 356, width: 40 },
  { label: "売上", x: 400, width: 74 },
  { label: "作業分", x: 478, width: 36 },
  { label: "工数分", x: 518, width: 36 },
  { label: "移動分", x: 558, width: 36 },
  { label: "台数", x: 598, width: 30 },
  { label: "基準分", x: 632, width: 40 },
  { label: "ポイント", x: 676, width: 40 },
  { label: "備考", x: 720, width: 88 },
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
  "/Library/Fonts/Arial Unicode.ttf",
].filter((value): value is string => Boolean(value));

let cachedJapaneseFontSourcePromise: Promise<LoadedFontSource[]> | null = null;
const fontCharacterSupportCache = new WeakMap<PDFFont, Map<string, boolean>>();

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function canEncodeCharacter(font: PDFFont, character: string) {
  let cachedFontMap = fontCharacterSupportCache.get(font);

  if (!cachedFontMap) {
    cachedFontMap = new Map<string, boolean>();
    fontCharacterSupportCache.set(font, cachedFontMap);
  }

  const cachedValue = cachedFontMap.get(character);

  if (cachedValue !== undefined) {
    return cachedValue;
  }

  try {
    font.encodeText(character);
    cachedFontMap.set(character, true);
    return true;
  } catch {
    cachedFontMap.set(character, false);
    return false;
  }
}

function resolveFontForCharacter(fonts: FontBundle, character: string) {
  for (const font of fonts.all) {
    if (canEncodeCharacter(font, character)) {
      return font;
    }
  }

  return fonts.primary;
}

function measureTextWidth(text: string, fonts: FontBundle, size: number) {
  let width = 0;

  for (const character of text) {
    const font = resolveFontForCharacter(fonts, character);
    width += font.widthOfTextAtSize(character, size);
  }

  return width;
}

function clipText(text: string, maxWidth: number, fonts: FontBundle, size: number) {
  const ellipsis = "...";

  if (measureTextWidth(text, fonts, size) <= maxWidth) {
    return text;
  }

  let low = 0;
  let high = text.length;
  let bestLength = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = `${text.slice(0, middle)}${ellipsis}`;

    if (measureTextWidth(candidate, fonts, size) <= maxWidth) {
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

function drawTextLine(page: PDFPage, text: string, x: number, y: number, fonts: FontBundle, size: number, color = BRAND.ink) {
  if (!text) {
    return;
  }

  let currentFont: PDFFont | null = null;
  let currentText = "";
  let currentX = x;
  let runStartX = x;

  const flush = () => {
    if (!currentFont || !currentText) {
      return;
    }

    page.drawText(currentText, {
      x: runStartX,
      y,
      font: currentFont,
      size,
      color,
    });
  };

  for (const character of text) {
    const nextFont = resolveFontForCharacter(fonts, character);

    if (!currentFont) {
      currentFont = nextFont;
      currentText = character;
      runStartX = currentX;
      currentX += nextFont.widthOfTextAtSize(character, size);
      continue;
    }

    if (currentFont === nextFont) {
      currentText += character;
      currentX += nextFont.widthOfTextAtSize(character, size);
      continue;
    }

    flush();
    currentFont = nextFont;
    currentText = character;
    runStartX = currentX;
    currentX += nextFont.widthOfTextAtSize(character, size);
  }

  flush();
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

function drawReportHeader(page: PDFPage, fonts: FontBundle, administrator: { name: string; email: string }) {
  drawBanner(page);
  drawTextLine(page, "Polish-DWR", MARGIN_X + 14, PAGE_HEIGHT - 70, fonts, 10, BRAND.accent);
  drawTextLine(page, "日報集計レポート", MARGIN_X + 14, PAGE_HEIGHT - 88, fonts, 20, BRAND.ink);
  drawTextLine(page, `出力日時: ${new Date().toLocaleString("ja-JP")}`, PAGE_WIDTH - 260, PAGE_HEIGHT - 68, fonts, 9, BRAND.muted);
  drawTextLine(page, `出力者: ${administrator.name} / ${administrator.email}`, PAGE_WIDTH - 260, PAGE_HEIGHT - 84, fonts, 9, BRAND.muted);
}

function drawFilterPanel(page: PDFPage, fonts: FontBundle, filterLines: string[], y: number) {
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

  drawTextLine(page, "検索条件", MARGIN_X + 12, y - 10, fonts, 10, BRAND.accent);
  let currentY = y - 26;

  for (const line of filterLines) {
    drawTextLine(page, line, MARGIN_X + 12, currentY, fonts, 9, BRAND.muted);
    currentY -= 14;
  }

  return y - panelHeight - 8;
}

function drawSummaryCard(page: PDFPage, fonts: FontBundle, x: number, y: number, width: number, title: string, value: string) {
  page.drawRectangle({
    x,
    y,
    width,
    height: 52,
    color: BRAND.surface,
    borderColor: BRAND.line,
    borderWidth: 0.8,
  });

  drawTextLine(page, title, x + 10, y + 24, fonts, 8, BRAND.muted);
  drawTextLine(page, value, x + 10, y + 8, fonts, 12, BRAND.ink);
}

function drawSummaryPanel(
  page: PDFPage,
  fonts: FontBundle,
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

  drawSummaryCard(page, fonts, MARGIN_X, y - 46, cardWidth, "件数", `${formatNumber(summary.count)} 件`);
  drawSummaryCard(page, fonts, MARGIN_X + (cardWidth + gap) * 1, y - 46, cardWidth, "売上合計", formatCurrency(summary.salesAmountTotal));
  drawSummaryCard(page, fonts, MARGIN_X + (cardWidth + gap) * 2, y - 46, cardWidth, "作業分合計", `${formatNumber(summary.workMinutesTotal)} 分`);
  drawSummaryCard(page, fonts, MARGIN_X + (cardWidth + gap) * 3, y - 46, cardWidth, "ポイント合計", `${formatNumber(summary.pointsTotal)} pt`);

  return y - 68;
}

function drawTableHeader(page: PDFPage, fonts: FontBundle, y: number) {
  page.drawRectangle({
    x: MARGIN_X,
    y: y - 6,
    width: CONTENT_WIDTH,
    height: 20,
    color: BRAND.surfaceStrong,
  });

  for (const header of TABLE_COLUMNS) {
    drawTextLine(page, header.label, header.x, y, fonts, 7.5, BRAND.muted);
  }
}

function drawReportRow(page: PDFPage, report: SerializedReport, fonts: FontBundle, y: number, rowIndex: number) {
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
    { text: report.workDate, x: 36, width: 64 },
    { text: `${report.clientName} (${report.clientCode})`, x: 104, width: 136 },
    { text: report.carType ?? "-", x: 244, width: 52 },
    { text: report.workCode, x: 300, width: 52 },
    { text: report.customerStatus === "new" ? "新規" : "既存", x: 356, width: 40 },
    { text: formatCurrency(report.salesAmount), x: 400, width: 74 },
    { text: formatNumber(report.workMinutes), x: 478, width: 36 },
    { text: formatNumber(report.laborMinutes), x: 518, width: 36 },
    { text: formatNumber(report.travelMinutes), x: 558, width: 36 },
    { text: formatNumber(report.unitCount), x: 598, width: 30 },
    { text: report.standardMinutes === null ? "-" : formatNumber(report.standardMinutes), x: 632, width: 40 },
    { text: report.points === null ? "-" : formatNumber(report.points), x: 676, width: 40 },
    { text: report.remarks ?? "-", x: 720, width: 88 },
  ];

  page.drawLine({
    start: { x: MARGIN_X, y: y - 4 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: y - 4 },
    color: BRAND.line,
    thickness: 0.6,
  });

  for (const cell of cells) {
    drawTextLine(page, clipText(cell.text, cell.width, fonts, 7), cell.x, y, fonts, 7);
  }
}

function drawFooter(page: PDFPage, fonts: FontBundle, currentPage: number, totalPages: number) {
  page.drawLine({
    start: { x: MARGIN_X, y: 26 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: 26 },
    color: BRAND.line,
    thickness: 0.8,
  });
  drawTextLine(page, "Polish-DWR", MARGIN_X, 14, fonts, 8, BRAND.soft);
  drawTextLine(page, `${currentPage} / ${totalPages}`, PAGE_WIDTH - MARGIN_X - 28, 14, fonts, 8, BRAND.soft);
}

function createReportPage(pdfDocument: PDFDocument, fonts: FontBundle, administrator: { name: string; email: string }) {
  const page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawReportHeader(page, fonts, administrator);
  return page;
}

function serializePdfReport(report: {
  workDate: Date;
  clientCode: string;
  clientName: string;
  carType: string | null;
  workMinutes: number;
  laborMinutes: number;
  travelMinutes: number;
  workCode: string;
  customerStatus: "new" | "existing";
  unitCount: number;
  salesAmount: { toString(): string } | number;
  standardMinutes: number | null;
  points: { toString(): string } | number | null;
  remarks: string | null;
}): SerializedReport {
  return {
    workDate: report.workDate.toISOString().slice(0, 10),
    clientCode: report.clientCode,
    clientName: report.clientName,
    carType: report.carType,
    workMinutes: report.workMinutes,
    laborMinutes: report.laborMinutes,
    travelMinutes: report.travelMinutes,
    workCode: report.workCode,
    customerStatus: report.customerStatus,
    unitCount: report.unitCount,
    salesAmount: Number(report.salesAmount),
    standardMinutes: report.standardMinutes,
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

async function loadJapaneseFontSource(): Promise<LoadedFontSource[]> {
  const sources: LoadedFontSource[] = [];

  for (const fontPath of SYSTEM_FONT_CANDIDATES) {
    if ((fontPath.endsWith(".ttf") || fontPath.endsWith(".otf") || fontPath.endsWith(".woff")) && (await canAccessFile(fontPath))) {
      sources.push({
        bytes: await readFile(fontPath),
        filePath: fontPath,
      });
    }
  }

  if (await canAccessFile(PROJECT_FONT_PATH)) {
    sources.push({
      bytes: await readFile(PROJECT_FONT_PATH),
      filePath: PROJECT_FONT_PATH,
    });
  }

  if (sources.length === 0) {
    throw new Error("PDF 出力に利用できるフォントが見つかりませんでした。PDF_FONT_PATH を設定してください。");
  }

  return sources;
}

async function getJapaneseFontSource() {
  if (!cachedJapaneseFontSourcePromise) {
    cachedJapaneseFontSourcePromise = loadJapaneseFontSource();
  }

  return cachedJapaneseFontSourcePromise;
}

async function embedJapaneseFonts(pdfDocument: PDFDocument): Promise<FontBundle> {
  const fontSources = await getJapaneseFontSource();
  const fonts = await Promise.all(fontSources.map((fontSource) => pdfDocument.embedFont(fontSource.bytes, { subset: false })));

  return {
    primary: fonts[0],
    fallbacks: fonts.slice(1),
    all: fonts,
  };
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
        carType: true,
        workMinutes: true,
        laborMinutes: true,
        travelMinutes: true,
        workCode: true,
        customerStatus: true,
        unitCount: true,
        salesAmount: true,
        standardMinutes: true,
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
  const fonts = await embedJapaneseFonts(pdfDocument);
  let page = createReportPage(pdfDocument, fonts, administrator);
  let y = PAGE_HEIGHT - 152;

  y = drawFilterPanel(page, fonts, buildFilterLines(searchParams), y);
  y = drawSummaryPanel(page, fonts, y, {
    count: summary._count._all,
    salesAmountTotal: Number(summary._sum.salesAmount ?? 0),
    workMinutesTotal: summary._sum.workMinutes ?? 0,
    pointsTotal: Number(summary._sum.points ?? 0),
  });

  drawTextLine(page, "日報一覧", MARGIN_X, y, fonts, 13, BRAND.accent);
  y -= 20;
  drawTableHeader(page, fonts, y);
  y -= 24;

  for (const [index, report] of serializedReports.entries()) {
    if (y < MARGIN_BOTTOM + 24) {
      page = createReportPage(pdfDocument, fonts, administrator);
      y = PAGE_HEIGHT - 136;
      drawTextLine(page, "日報一覧", MARGIN_X, y, fonts, 12, BRAND.accent);
      y -= 18;
      drawTableHeader(page, fonts, y);
      y -= 24;
    }

    drawReportRow(page, report, fonts, y, index);
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
    drawTextLine(page, "対象の日報データはありません。", MARGIN_X + 12, y, fonts, 10, BRAND.muted);
  }

  const pages = pdfDocument.getPages();

  for (const [index, currentPage] of pages.entries()) {
    drawFooter(currentPage, fonts, index + 1, pages.length);
  }

  const pdfBytes = await pdfDocument.save();
  const fileName = buildReportExportFileName(searchParams, "pdf");
  const encodedFileName = encodeURIComponent(fileName);

  const pdfBuffer = new Uint8Array(pdfBytes).buffer;

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
      "Cache-Control": "no-store",
    },
  });
}
