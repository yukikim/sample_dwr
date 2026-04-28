import Link from "next/link";
import { redirect } from "next/navigation";

import { MonthlyInvoicePdfBrowserSection } from "@/app/reports/monthly-invoices/monthly-invoice-pdf-browser-section";
import { getCurrentAdministrator } from "@/lib/auth";
import { parseMonthlyInvoiceMonthFromPage } from "@/lib/monthly-invoice-documents";
import { getMonthlyInvoiceData } from "@/lib/monthly-invoices";

type MonthlyInvoicePageSearchParams = Promise<Record<string, string | string[] | undefined>>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function MonthlyInvoicesPage({ searchParams }: { searchParams: MonthlyInvoicePageSearchParams }) {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  const month = parseMonthlyInvoiceMonthFromPage(await searchParams);
  const data = month ? await getMonthlyInvoiceData(month) : null;
  const hasData = Boolean(data && data.groups.length > 0);
  console.log("MonthlyInvoicesPage: month =", month, "data =", data);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-4xl border border-white/60 bg-white/82 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-muted)">Monthly Invoice Workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight">月次請求書ページ</h1>
            <p className="text-sm text-(--ink-soft)">
              {data ? `${data.summary.monthLabel} / 得意先 ${data.summary.clientCount} 社 / 管理者 ${administrator.name}` : "対象月を選択して月次請求書を確認します。"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/reports"
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              日報一覧へ戻る
            </Link>
          </div>
        </header>

        {!month ? (
          <section className="rounded-4xl border border-dashed border-black/10 bg-white/82 p-10 text-center shadow-[0_20px_60px_rgba(76,47,33,0.08)]">
            <h2 className="text-2xl font-semibold">対象月が選択されていません</h2>
            <p className="mt-3 text-sm text-(--ink-soft)">
              日報一覧ページの月次請求書セクションから対象月を選んでください。
            </p>
          </section>
        ) : !data || data.groups.length === 0 ? (
          <section className="rounded-4xl border border-dashed border-black/10 bg-white/82 p-10 text-center shadow-[0_20px_60px_rgba(76,47,33,0.08)]">
            <h2 className="text-2xl font-semibold">{month} の請求対象データが見つかりません</h2>
            <p className="mt-3 text-sm text-(--ink-soft)">
              別の対象月を選択するか、日報データを確認してください。
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
                <p className="text-sm text-(--ink-muted)">対象年月</p>
                <p className="mt-3 text-2xl font-semibold">{data.summary.monthLabel}</p>
              </article>
              <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
                <p className="text-sm text-(--ink-muted)">請求対象得意先</p>
                <p className="mt-3 text-2xl font-semibold">{data.summary.clientCount} 社</p>
              </article>
              <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
                <p className="text-sm text-(--ink-muted)">小計</p>
                <p className="mt-3 text-2xl font-semibold">{formatCurrency(data.summary.subtotalAmount)}</p>
              </article>
              <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
                <p className="text-sm text-(--ink-muted)">合計金額</p>
                <p className="mt-3 text-2xl font-semibold">{formatCurrency(data.summary.totalAmount)}</p>
              </article>
            </section>

            <section className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">請求対象一覧</h2>
                  <p className="mt-1 text-sm text-(--ink-soft)">対象月の日報を得意先別に集約しています。</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {data.groups.map((group) => (
                  <article key={`${group.clientCode}-${group.clientName}`} className="rounded-[1.75rem] border border-[#eadfd5] bg-[#fffdf9] p-5 shadow-[0_12px_30px_rgba(76,47,33,0.06)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">{group.clientName}</h3>
                        <p className="text-sm text-(--ink-soft)">{group.clientCode}</p>
                      </div>
                      <div className="rounded-full bg-[#f3e8de] px-3 py-1 text-xs font-semibold text-(--ink-soft)">
                        {group.reportCount} 件
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-(--ink-muted)">小計</p>
                        <p className="mt-1 text-sm font-semibold">{formatCurrency(group.subtotalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-(--ink-muted)">消費税(10%)</p>
                        <p className="mt-1 text-sm font-semibold">{formatCurrency(group.taxAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-(--ink-muted)">合計金額</p>
                        <p className="mt-1 text-sm font-semibold">{formatCurrency(group.totalAmount)}</p>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-[#eadfd5]">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-[#f7efe6] text-(--ink-soft)">
                          <tr>
                            <th className="px-4 py-3 font-medium">作業内容</th>
                            <th className="px-4 py-3 text-center font-medium">台数</th>
                            <th className="px-4 py-3 text-right font-medium">合計金額</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((item) => (
                            <tr key={`${group.clientCode}-${item.workCode}`} className="border-t border-[#f0e6dd]">
                              <td className="px-4 py-3">{item.workCode}</td>
                              <td className="px-4 py-3 text-center">{item.unitCount}</td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <MonthlyInvoicePdfBrowserSection month={data.summary.month} downloadDisabled={!hasData} />
          </>
        )}
      </div>
    </main>
  );
}