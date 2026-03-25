import { apiError, requireAuthenticatedAdministrator } from "@/lib/api";
import {
  buildInvoicePdfFileName,
  parseInvoiceDocumentTypes,
  parseInvoiceSelectionIds,
} from "@/lib/invoice-documents";
import { renderInvoicePdfBuffer } from "@/lib/invoice-pdf";
import { getInvoiceSelectionData, hasSingleInvoiceClient } from "@/lib/invoices";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const selectedIds = parseInvoiceSelectionIds(searchParams);
  const documentTypes = parseInvoiceDocumentTypes(searchParams);

  if (selectedIds.length === 0) {
    return apiError({ code: "VALIDATION_ERROR", message: "出力対象の日報が選択されていません。" }, { status: 400 });
  }

  const selection = await getInvoiceSelectionData(selectedIds);

  if (selection.items.length === 0) {
    return apiError({ code: "NOT_FOUND", message: "選択された日報が見つかりませんでした。" }, { status: 404 });
  }

  if (!hasSingleInvoiceClient(selection)) {
    return apiError(
      { code: "VALIDATION_ERROR", message: "伝票出力は同一得意先の日報のみ選択できます。" },
      { status: 400 },
    );
  }

  const pdfBuffer = await renderInvoicePdfBuffer({
    administrator,
    documentTypes,
    selection,
  });
  const fileName = buildInvoicePdfFileName(documentTypes);
  const encodedFileName = encodeURIComponent(fileName);
  const pdfBytes = new Uint8Array(pdfBuffer);

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
      "Cache-Control": "no-store",
    },
  });
}