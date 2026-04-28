import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import type { InvoiceDocumentType } from "@/lib/invoice-documents";
import {
  InvoicePdfDocument,
  ensureInvoicePdfFontsRegistered,
  type PdfAdministrator,
} from "@/lib/invoice-pdf-document";
import type { InvoiceSelectionData } from "@/lib/invoice-shared";
import { getResolvedInvoicePdfFonts } from "@/lib/pdf-fonts";

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