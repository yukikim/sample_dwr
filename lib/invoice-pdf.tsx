import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import type { InvoiceDocumentType } from "@/lib/invoice-documents";
import {
  InvoicePdfDocument,
  ensureInvoicePdfFontsRegistered,
  type PdfAdministrator,
} from "@/lib/invoice-pdf-document";
import type { InvoiceSelectionData } from "@/lib/invoice-shared";

const FONT_COLLECTION_PATH = "/Library/Fonts/SourceHanCodeJP.ttc";

export async function renderInvoicePdfBuffer({
  administrator,
  documentTypes,
  selection,
}: {
  administrator: PdfAdministrator;
  documentTypes: InvoiceDocumentType[];
  selection: InvoiceSelectionData;
}) {
  ensureInvoicePdfFontsRegistered({
    regular: {
      src: FONT_COLLECTION_PATH,
      postscriptName: "SourceHanCodeJP-Regular",
    },
    bold: {
      src: FONT_COLLECTION_PATH,
      postscriptName: "SourceHanCodeJP-Bold",
    },
  });

  return renderToBuffer(
    <InvoicePdfDocument administrator={administrator} documentTypes={documentTypes} selection={selection} />,
  );
}

export type { PdfAdministrator };