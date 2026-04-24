import Link from "next/link";
import { redirect } from "next/navigation";

import { InvoicePdfBrowserSection } from "@/app/invoices/invoice-pdf-browser-section";
import { InvoicePdfDownloadLink } from "@/app/invoices/invoice-pdf-download-link";
import { getCurrentAdministrator } from "@/lib/auth";
import { formatInvoicePeriod } from "@/lib/invoice-shared";
import { getInvoiceSelectionData, hasSingleInvoiceClient } from "@/lib/invoices";
import { parseInvoiceSelectionIdsFromPage } from "@/lib/invoice-documents";

type InvoicePageSearchParams = Promise<Record<string, string | string[] | undefined>>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function InvoicesPage({ searchParams }: { searchParams: InvoicePageSearchParams }) {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  const selectedIds = parseInvoiceSelectionIdsFromPage(await searchParams);
  const selection = await getInvoiceSelectionData(selectedIds);
  const hasSelection = selection.items.length > 0;
  const hasSingleClient = hasSingleInvoiceClient(selection);
  const downloadDisabled = !hasSelection || !hasSingleClient;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-4xl border border-white/60 bg-white/82 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-muted)">Invoice Workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight">伝票ページ</h1>
            <p className="text-sm text-(--ink-soft)">
              選択済み日報 {selection.summary.reportCount} 件 / 得意先 {selection.summary.clientCount} 社 / 管理者 {administrator.name}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/reports"
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              日報一覧へ戻る
            </Link>
            {hasSelection ? (
              <InvoicePdfDownloadLink
                className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${downloadDisabled
                  ? "pointer-events-none border border-black/10 bg-white text-(--ink-muted) opacity-50"
                  : "bg-(--accent-strong) text-white hover:bg-(--accent-deep)"
                }`}
                disabled={downloadDisabled}
                documentTypes={["work-slip", "delivery-note", "invoice"]}
                label="3点まとめてダウンロード"
                selectedIds={selection.items.map((item) => item.id)}
              />
            ) : null}
          </div>
        </header>

        {!hasSelection ? (
          <section className="rounded-4xl border border-dashed border-black/10 bg-white/82 p-10 text-center shadow-[0_20px_60px_rgba(76,47,33,0.08)]">
            <h2 className="text-2xl font-semibold">出力対象の日報が選択されていません</h2>
            <p className="mt-3 text-sm text-(--ink-soft)">
              日報一覧で対象データをチェックしてから伝票ページへ進んでください。
            </p>
          </section>
        ) : (
          <>
            {selection.missingIds.length > 0 ? (
              <section className="rounded-3xl border border-[#e7b4ab] bg-[#fff3f0] px-5 py-4 text-sm text-[#8e2c18] shadow-[0_10px_30px_rgba(142,44,24,0.08)]">
                選択された日報のうち {selection.missingIds.length} 件は見つからなかったため、存在するデータのみを対象にしています。
              </section>
            ) : null}

            {!hasSingleClient ? (
              <section className="rounded-3xl border border-[#e7b4ab] bg-[#fff3f0] px-5 py-4 text-sm text-[#8e2c18] shadow-[0_10px_30px_rgba(142,44,24,0.08)]">
                複数得意先の日報が含まれています。伝票は同一得意先のみ出力できます。
              </section>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
                <p className="text-sm text-(--ink-muted)">対象期間</p>
                <p className="mt-3 text-2xl font-semibold">{formatInvoicePeriod(selection.summary)}</p>
              </article>
              <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
                <p className="text-sm text-(--ink-muted)">売上合計</p>
                <p className="mt-3 text-2xl font-semibold">{formatCurrency(selection.summary.totalSalesAmount)}</p>
              </article>
              <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
                <p className="text-sm text-(--ink-muted)">作業分合計</p>
                <p className="mt-3 text-2xl font-semibold">{selection.summary.totalWorkMinutes} 分</p>
              </article>
              <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
                <p className="text-sm text-(--ink-muted)">台数合計</p>
                <p className="mt-3 text-2xl font-semibold">{selection.summary.totalUnitCount}</p>
              </article>
            </section>

            <section className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">選択内容</h2>
                  <p className="mt-1 text-sm text-(--ink-soft)">同一得意先の日報を1セットの帳票として出力します。</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {selection.groups.map((group) => (
                  <article key={`${group.clientCode}-${group.clientName}`} className="rounded-[1.75rem] border border-[#eadfd5] bg-[#fffdf9] p-5 shadow-[0_12px_30px_rgba(76,47,33,0.06)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">{group.clientName}</h3>
                        <p className="text-sm text-(--ink-soft)">{group.clientCode}</p>
                      </div>
                      <div className="rounded-full bg-[#f3e8de] px-3 py-1 text-xs font-semibold text-(--ink-soft)">
                        {group.items.length} 件
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-(--ink-muted)">売上合計</p>
                        <p className="mt-1 text-sm font-semibold">{formatCurrency(group.totalSalesAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-(--ink-muted)">作業 / 工数</p>
                        <p className="mt-1 text-sm font-semibold">{group.totalWorkMinutes} / {group.totalLaborMinutes} 分</p>
                      </div>
                      <div>
                        <p className="text-xs text-(--ink-muted)">移動 / 台数</p>
                        <p className="mt-1 text-sm font-semibold">{group.totalTravelMinutes} 分 / {group.totalUnitCount}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <InvoicePdfBrowserSection
              downloadDisabled={downloadDisabled}
              selectedIds={selection.items.map((item) => item.id)}
            />
          </>
        )}
      </div>
    </main>
  );
}