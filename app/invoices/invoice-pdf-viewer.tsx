import { buildInvoicePdfUrl, type InvoiceDocumentType } from "@/lib/invoice-documents";

type InvoicePdfViewerProps = {
  documentType: InvoiceDocumentType;
  selectedIds: string[];
  active: boolean;
};

export function InvoicePdfViewer({ documentType, selectedIds, active }: InvoicePdfViewerProps) {
  if (!active) {
    return (
      <div className="rounded-3xl border border-dashed border-[#d9c8b8] bg-[#fffaf4] px-6 py-12 text-center text-sm text-(--ink-soft)">
        Viewerで開くを押した帳票だけをサーバーでPDF化して表示します。
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[#eadfd5] bg-[#f6efe6] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <iframe
        className="h-[70vh] min-h-[540px] w-full bg-white"
        src={buildInvoicePdfUrl(selectedIds, [documentType], "inline")}
        title={`PDF Preview ${documentType}`}
      />
    </div>
  );
}