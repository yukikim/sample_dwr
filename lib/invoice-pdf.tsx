import "server-only";

import { access } from "node:fs/promises";
import path from "node:path";

import { renderToBuffer } from "@react-pdf/renderer";

import type { InvoiceDocumentType } from "@/lib/invoice-documents";
import {
  InvoicePdfDocument,
  ensureInvoicePdfFontsRegistered,
  type InvoicePdfFontSources,
  type PdfAdministrator,
} from "@/lib/invoice-pdf-document";
import type { InvoiceSelectionData } from "@/lib/invoice-shared";

type ResolvedInvoicePdfFonts = InvoicePdfFontSources & {
  label: string;
};

const SOURCE_HAN_COLLECTION_PATH = "/Library/Fonts/SourceHanCodeJP.ttc";
const HIRAGINO_COLLECTION_PATH = "/System/Library/Fonts/Hiragino Sans GB.ttc";
const BUNDLED_NOTO_REGULAR_PATH = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "noto-sans-jp",
  "files",
  "noto-sans-jp-japanese-400-normal.woff",
);
const BUNDLED_NOTO_BOLD_PATH = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "noto-sans-jp",
  "files",
  "noto-sans-jp-japanese-700-normal.woff",
);

let resolvedInvoicePdfFontsPromise: Promise<ResolvedInvoicePdfFonts> | null = null;

function resolveFontPath(fontPath: string) {
  return path.isAbsolute(fontPath) ? fontPath : path.resolve(process.cwd(), fontPath);
}

async function isReadable(fontPath: string) {
  try {
    await access(fontPath);
    return true;
  } catch {
    return false;
  }
}

function getEnvironmentFontCandidate(): ResolvedInvoicePdfFonts | null {
  const regularPath = process.env.PDF_FONT_PATH;

  if (!regularPath) {
    return null;
  }

  const boldPath = process.env.PDF_FONT_BOLD_PATH ?? regularPath;
  const regularPostscriptName = process.env.PDF_FONT_POSTSCRIPT_NAME;
  const boldPostscriptName = process.env.PDF_FONT_BOLD_POSTSCRIPT_NAME ?? regularPostscriptName;

  return {
    label: "PDF_FONT_PATH",
    regular: {
      src: resolveFontPath(regularPath),
      postscriptName: regularPostscriptName || undefined,
    },
    bold: {
      src: resolveFontPath(boldPath),
      postscriptName: boldPostscriptName || undefined,
    },
  };
}

function getFontCandidates(): ResolvedInvoicePdfFonts[] {
  return [
    getEnvironmentFontCandidate(),
    {
      label: "Source Han Code JP",
      regular: {
        src: SOURCE_HAN_COLLECTION_PATH,
        postscriptName: "SourceHanCodeJP-Regular",
      },
      bold: {
        src: SOURCE_HAN_COLLECTION_PATH,
        postscriptName: "SourceHanCodeJP-Bold",
      },
    },
    {
      label: "Hiragino Sans GB",
      regular: {
        src: HIRAGINO_COLLECTION_PATH,
        postscriptName: "HiraginoSansGB-W3",
      },
      bold: {
        src: HIRAGINO_COLLECTION_PATH,
        postscriptName: "HiraginoSansGB-W6",
      },
    },
    {
      label: "Bundled Noto Sans JP",
      regular: {
        src: BUNDLED_NOTO_REGULAR_PATH,
      },
      bold: {
        src: BUNDLED_NOTO_BOLD_PATH,
      },
    },
  ].filter((candidate): candidate is ResolvedInvoicePdfFonts => Boolean(candidate));
}

async function resolveInvoicePdfFonts() {
  for (const candidate of getFontCandidates()) {
    const regularReadable = await isReadable(candidate.regular.src);
    const boldReadable = candidate.bold.src === candidate.regular.src
      ? regularReadable
      : await isReadable(candidate.bold.src);

    if (regularReadable && boldReadable) {
      return candidate;
    }
  }

  throw new Error("PDF 用フォントを解決できませんでした。");
}

async function getResolvedInvoicePdfFonts() {
  if (!resolvedInvoicePdfFontsPromise) {
    resolvedInvoicePdfFontsPromise = resolveInvoicePdfFonts();
  }

  return resolvedInvoicePdfFontsPromise;
}

export async function renderInvoicePdfBuffer({
  administrator,
  documentTypes,
  selection,
}: {
  administrator: PdfAdministrator;
  documentTypes: InvoiceDocumentType[];
  selection: InvoiceSelectionData;
}) {
  const fontSources = await getResolvedInvoicePdfFonts();

  ensureInvoicePdfFontsRegistered(fontSources);

  return renderToBuffer(
    <InvoicePdfDocument administrator={administrator} documentTypes={documentTypes} selection={selection} />,
  );
}

export type { PdfAdministrator };