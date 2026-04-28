import { apiError, requireAuthenticatedAdministrator } from "@/lib/api";
import {
  buildMonthlyInvoicePdfFileName,
  parseMonthlyInvoiceMonth,
} from "@/lib/monthly-invoice-documents";
import { renderMonthlyInvoicePdfBuffer } from "@/lib/monthly-invoice-pdf";
import { getMonthlyInvoiceData } from "@/lib/monthly-invoices";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = parseMonthlyInvoiceMonth(searchParams.get("month"));
  const disposition = searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  if (!month) {
    return apiError({ code: "VALIDATION_ERROR", message: "対象月を選択してください。" }, { status: 400 });
  }

  const data = await getMonthlyInvoiceData(month);

  if (!data) {
    return apiError({ code: "VALIDATION_ERROR", message: "対象月が不正です。" }, { status: 400 });
  }

  if (data.groups.length === 0) {
    return apiError({ code: "NOT_FOUND", message: "選択された月の請求対象データが見つかりませんでした。" }, { status: 404 });
  }

  const pdfBuffer = await renderMonthlyInvoicePdfBuffer({ data });
  const fileName = buildMonthlyInvoicePdfFileName(month);
  const encodedFileName = encodeURIComponent(fileName);
  const pdfBytes = new Uint8Array(pdfBuffer);

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
      "Cache-Control": "no-store",
    },
  });
}