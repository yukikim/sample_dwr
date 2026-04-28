import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { ensureMonthlyInvoicePdfFontsRegistered, MonthlyInvoicePdfDocument } from "@/lib/monthly-invoice-pdf-document";
import { getResolvedInvoicePdfFonts } from "@/lib/pdf-fonts";
import type { MonthlyInvoiceData } from "@/lib/monthly-invoices";

export async function renderMonthlyInvoicePdfBuffer({
  data,
}: {
  data: MonthlyInvoiceData;
}) {
  const fontSources = await getResolvedInvoicePdfFonts();

  ensureMonthlyInvoicePdfFontsRegistered(fontSources);

  return renderToBuffer(
    <MonthlyInvoicePdfDocument data={data} />,
  );
}