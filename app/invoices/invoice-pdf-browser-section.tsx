"use client";

import { useState } from "react";

import { getInvoiceDocumentLabel, invoiceDocumentTypes, type InvoiceDocumentType } from "@/lib/invoice-documents";

import { InvoicePdfDownloadLink } from "./invoice-pdf-download-link";
import { InvoicePdfViewer } from "./invoice-pdf-viewer";

type InvoicePdfBrowserSectionProps = {
  selectedIds: string[];
  downloadDisabled: boolean;
};

function previewDocumentDescription(documentType: InvoiceDocumentType) {
  if (documentType === "work-slip") {
    return "作業伝票レイアウトをブラウザ上で確認し、そのままダウンロードできます。";
  }

  if (documentType === "delivery-note") {
    return "納品書の配色と文言を反映したPDFをブラウザ内で確認し、そのまま保存できます。";
  }

  return "請求書レイアウトの最終PDFをブラウザ内で確認し、そのまま保存できます。";
}

export function InvoicePdfBrowserSection({
  selectedIds,
  downloadDisabled,
}: InvoicePdfBrowserSectionProps) {
  const [activeDocumentType, setActiveDocumentType] = useState<InvoiceDocumentType>(invoiceDocumentTypes[0]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <section className="grid gap-6">
      <article className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--ink-muted)">Browser PDF</p>
            <h2 className="mt-2 text-2xl font-semibold">PDF Viewer</h2>
            <p className="mt-2 text-sm text-(--ink-soft)">
              初期表示ではPDFを生成しません。開いた帳票だけをサーバーで生成して表示するため、ブラウザ負荷を抑えています。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {invoiceDocumentTypes.map((documentType) => {
            const isActive = activeDocumentType === documentType;

            return (
              <section
                key={documentType}
                className={`rounded-3xl border p-5 transition ${isActive
                  ? "border-[#c68b59] bg-[#fff9f2] shadow-[0_16px_40px_rgba(76,47,33,0.08)]"
                  : "border-[#eadfd5] bg-[#fffdf9]"
                }`}
              >
                <div>
                  <h3 className="text-lg font-semibold">{getInvoiceDocumentLabel(documentType)}</h3>
                  <p className="mt-2 text-sm text-(--ink-soft)">{previewDocumentDescription(documentType)}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDocumentType(documentType);
                      setIsPreviewOpen(true);
                    }}
                    className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition ${isActive
                      ? "bg-(--accent-strong) text-white hover:bg-(--accent-deep)"
                      : "border border-black/10 bg-white text-(--ink) hover:border-black/20 hover:bg-black/3"
                    }`}
                  >
                    {isActive && isPreviewOpen ? "表示中" : "Viewerで開く"}
                  </button>

                  <InvoicePdfDownloadLink
                    className={`inline-flex h-11 shrink-0 items-center justify-center rounded-full border px-5 text-sm font-medium transition ${downloadDisabled
                      ? "pointer-events-none border-black/10 bg-white text-(--ink-muted) opacity-50"
                      : "border-black/10 bg-white text-(--ink) hover:border-black/20 hover:bg-black/3"
                    }`}
                    disabled={downloadDisabled}
                    documentTypes={[documentType]}
                    label="ダウンロード"
                    selectedIds={selectedIds}
                  />
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="mb-4 flex justify-end">
            {isPreviewOpen ? (
              <button
                type="button"
                onClick={() => {
                  setIsPreviewOpen(false);
                }}
                className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
              >
                プレビューを閉じる
              </button>
            ) : null}
          </div>
          <InvoicePdfViewer documentType={activeDocumentType} selectedIds={selectedIds} active={isPreviewOpen} />
        </div>
      </article>
    </section>
  );
}