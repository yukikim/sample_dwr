"use client";

import { useState } from "react";

import { MonthlyInvoicePdfDownloadLink } from "@/app/reports/monthly-invoices/monthly-invoice-pdf-download-link";
import { MonthlyInvoicePdfViewer } from "@/app/reports/monthly-invoices/monthly-invoice-pdf-viewer";

type MonthlyInvoicePdfBrowserSectionProps = {
  month: string;
  downloadDisabled: boolean;
};

export function MonthlyInvoicePdfBrowserSection({
  month,
  downloadDisabled,
}: MonthlyInvoicePdfBrowserSectionProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <section className="grid gap-6">
      <article className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--ink-muted)">Browser PDF</p>
            <h2 className="mt-2 text-2xl font-semibold">PDF Viewer</h2>
            <p className="mt-2 text-sm text-(--ink-soft)">
              月次請求書は初期表示でPDF生成しません。開いたときだけ生成してプレビューし、そのままダウンロードできます。
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-[#c68b59] bg-[#fff9f2] p-5 shadow-[0_16px_40px_rgba(76,47,33,0.08)]">
          <div>
            <h3 className="text-lg font-semibold">請求書</h3>
            <p className="mt-2 text-sm text-(--ink-soft)">
              選択月の得意先ごとにA4サイズの請求書をまとめて出力します。ブラウザ上で確認後、そのままPDF保存できます。
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setIsPreviewOpen(true);
              }}
              className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition ${isPreviewOpen
                ? "bg-(--accent-strong) text-white hover:bg-(--accent-deep)"
                : "border border-black/10 bg-white text-(--ink) hover:border-black/20 hover:bg-black/3"
              }`}
            >
              {isPreviewOpen ? "表示中" : "Viewerで開く"}
            </button>

            <MonthlyInvoicePdfDownloadLink
              month={month}
              className={`inline-flex h-11 shrink-0 items-center justify-center rounded-full border px-5 text-sm font-medium transition ${downloadDisabled
                ? "pointer-events-none border-black/10 bg-white text-(--ink-muted) opacity-50"
                : "border-black/10 bg-white text-(--ink) hover:border-black/20 hover:bg-black/3"
              }`}
              disabled={downloadDisabled}
              label="ダウンロード"
            />
          </div>
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
          <MonthlyInvoicePdfViewer month={month} active={isPreviewOpen} />
        </div>
      </article>
    </section>
  );
}