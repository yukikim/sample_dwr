import Link from "next/link";
import { redirect } from "next/navigation";

import { buildInvoicePdfUrl, invoiceDocumentTypes, getInvoiceDocumentLabel, type InvoiceDocumentType } from "@/lib/invoice-documents";
import { getCurrentAdministrator } from "@/lib/auth";
import { formatInvoicePeriod, getInvoiceSelectionData, hasSingleInvoiceClient, invoiceIssuer } from "@/lib/invoices";
import { parseInvoiceSelectionIdsFromPage } from "@/lib/invoice-documents";

type InvoicePageSearchParams = Promise<Record<string, string | string[] | undefined>>;

function previewTheme(documentType: InvoiceDocumentType) {
  if (documentType === "work-slip") {
    return {
      primary: "#0ea56f",
      soft: "#dceee2",
      intro: "下記の通り受注致しました",
    };
  }

  if (documentType === "delivery-note") {
    return {
      primary: "#1468b3",
      soft: "#dbe6f4",
      intro: "下記の通り納品申し上げます",
    };
  }

  return {
    primary: "#ef3340",
    soft: "#f8ddd4",
    intro: "下記の通り御請求申し上げます",
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function previewDocumentDescription(documentType: InvoiceDocumentType) {
  if (documentType === "work-slip") {
    return "受注向けの作業伝票レイアウトで、車種・作業内容・金額を罫線帳票として出力します。";
  }

  if (documentType === "delivery-note") {
    return "納品書向けの配色と文言に切り替え、同じ骨格のまま納品帳票として出力します。";
  }

  return "請求書向けの配色と金額欄を中心に、請求帳票として見える構成で出力します。";
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
              <a
                href={downloadDisabled ? undefined : buildInvoicePdfUrl(selection.items.map((item) => item.id), "all")}
                aria-disabled={downloadDisabled}
                className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${downloadDisabled
                    ? "pointer-events-none border border-black/10 bg-white text-(--ink-muted) opacity-50"
                    : "bg-(--accent-strong) text-white hover:bg-(--accent-deep)"
                  }`}
              >
                3点まとめてダウンロード
              </a>
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

            <section className="grid gap-6">
              {invoiceDocumentTypes.map((documentType) => (
                <article key={documentType} className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--ink-muted)">PDF Preview</p>
                      <h2 className="mt-2 text-2xl font-semibold">{getInvoiceDocumentLabel(documentType)}</h2>
                      <p className="mt-2 text-sm text-(--ink-soft)">{previewDocumentDescription(documentType)}</p>
                    </div>
                    <a
                      href={downloadDisabled ? undefined : buildInvoicePdfUrl(selection.items.map((item) => item.id), [documentType])}
                      aria-disabled={downloadDisabled}
                      className={`inline-flex h-11 shrink-0 items-center justify-center rounded-full border px-5 text-sm font-medium transition ${downloadDisabled
                          ? "pointer-events-none border-black/10 bg-white text-(--ink-muted) opacity-50"
                          : "border-black/10 bg-white text-(--ink) hover:border-black/20 hover:bg-black/3"
                        }`}
                    >
                      ダウンロード
                    </a>
                  </div>

                  <div className="mt-6 rounded-3xl border border-[#eadfd5] bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="mx-auto w-fit border-b pb-1 text-center" style={{ color: previewTheme(documentType).primary, borderColor: previewTheme(documentType).primary }}>
                      <h3 className="pl-[0.45em] text-2xl font-semibold tracking-[0.45em]">{getInvoiceDocumentLabel(documentType)}</h3>
                    </div>

                    <div className="mt-5 flex items-start justify-between gap-6">
                      <div className="min-w-0 flex-1 pt-7">
                        <div className="border-b pb-2 text-left" style={{ color: previewTheme(documentType).primary, borderColor: previewTheme(documentType).primary }}>
                          <p className="text-2xl font-semibold">{selection.groups[0]?.clientName ?? "得意先"} 様</p>
                        </div>
                      </div>
                      <div className="w-[34%] text-left" style={{ color: previewTheme(documentType).primary }}>
                        <p className="text-2xl font-semibold">{invoiceIssuer.companyName}</p>
                        <p className="mt-1 text-xs">{invoiceIssuer.address}</p>
                        <p className="mt-1 text-xs">振込先 {invoiceIssuer.transferAccount}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-end gap-4" style={{ color: previewTheme(documentType).primary }}>
                      {[
                        { label: "年", value: new Date().getFullYear() },
                        { label: "月", value: new Date().getMonth() + 1 },
                        { label: "日", value: new Date().getDate() },
                      ].map((part, index) => (
                        <div key={`${documentType}-${part.label}-${index}`} className="w-auto mr-2 text-center text-xs flex flex-row items-center">
                          <div className="text-sm font-medium" style={{ borderColor: previewTheme(documentType).primary }}>{part.value}</div>
                          <p>{part.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: previewTheme(documentType).primary }}>
                      <div className="flex items-center h-10 w-47 border" style={{ borderColor: previewTheme(documentType).primary }}>
                        <div className="flex w-22.5 items-center px-2">得意先コード</div>
                      <div>{selection.groups[0].clientCode}</div>
                      </div>
                      <p>{previewTheme(documentType).intro}</p>
                    </div>

                    <div className="mt-3 overflow-hidden border" style={{ borderColor: previewTheme(documentType).primary }}>
                      <div className="grid min-h-8 grid-cols-[17%_22%_13%_18%_17%_13%] text-center text-xs font-semibold text-white" style={{ backgroundColor: previewTheme(documentType).primary }}>
                        <div className="flex items-center justify-center border-r border-white/80">車種</div>
                        <div className="flex items-center justify-center border-r border-white/80">登録番号又は車体番号</div>
                        <div className="flex items-center justify-center border-r border-white/80">客名</div>
                        <div className="flex items-center justify-center border-r border-white/80">作業内容</div>
                        <div className="flex items-center justify-center border-r border-white/80">金額</div>
                        <div className="flex items-center justify-center">摘要</div>
                      </div>

                      {Array.from({ length: 10 }).map((_, rowIndex) => {
                        const item = selection.groups[0]?.items[rowIndex];

                        return (
                          <div
                            key={`${documentType}-row-${rowIndex}`}
                            className="grid min-h-16 grid-cols-[17%_22%_13%_18%_17%_13%] text-xs"
                            style={{
                              color: previewTheme(documentType).primary,
                              backgroundColor: rowIndex % 2 === 1 ? previewTheme(documentType).soft : "#ffffff",
                              borderTop: `1px solid ${previewTheme(documentType).primary}`,
                            }}
                          >
                            <div className="border-r px-2 py-2" style={{ borderColor: previewTheme(documentType).primary }}>{item?.carType ?? ""}</div>
                            <div className="border-r px-2 py-2" style={{ borderColor: previewTheme(documentType).primary }}>{item?.vehicleIdentifier ?? ""}</div>
                            <div className="border-r px-2 py-2" style={{ borderColor: previewTheme(documentType).primary }}>{selection.groups[0]?.clientName ?? ""}</div>
                            <div className="border-r px-2 py-2" style={{ borderColor: previewTheme(documentType).primary }}>{item ? `${item.workCode} / 作業 ${item.workMinutes}分` : ""}</div>
                            <div className="border-r px-2 py-2 text-right" style={{ borderColor: previewTheme(documentType).primary }}>{item ? formatCurrency(item.salesAmount) : ""}</div>
                            <div className="px-2 py-2">{item?.remarks ?? item?.workDate ?? ""}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid min-h-16 grid-cols-[66%_34%] border-x border-b text-xs" style={{ borderColor: previewTheme(documentType).primary, color: previewTheme(documentType).primary }}>
                      <div>
                        <div className="grid grid-cols-[74px_1fr_108px_1fr] border-b" style={{ borderColor: previewTheme(documentType).primary }}>
                          <div className="px-2 py-2" style={{ backgroundColor: previewTheme(documentType).soft }}>作業場所</div>
                          <div className="border-l px-2 py-2" style={{ borderColor: previewTheme(documentType).primary }}>{selection.groups[0]?.items.map((item) => item.workLocation).filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join(" / ") || "-"}</div>
                          <div className="border-l px-2 py-2 text-white" style={{ borderColor: previewTheme(documentType).primary, backgroundColor: previewTheme(documentType).primary }}>担当者(サイン)</div>
                          <div className="border-l px-2 py-2" style={{ borderColor: previewTheme(documentType).primary }}>{selection.groups[0]?.items.map((item) => item.signerName).filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join(" / ") || "-"}</div>
                        </div>
                        <div className="grid grid-cols-[74px_1fr_108px_1fr]" style={{ borderColor: previewTheme(documentType).primary }}>
                          <div className="px-2 py-2" style={{ backgroundColor: previewTheme(documentType).soft }}>記入者(作業者)</div>
                          <div className="border-l px-2 py-2" style={{ borderColor: previewTheme(documentType).primary }}>{administrator.name}</div>
                          <div className="border-l px-2 py-2" style={{ borderColor: previewTheme(documentType).primary, backgroundColor: previewTheme(documentType).soft }}>消費税(10%)</div>
                          <div className="border-l px-2 py-2 text-right" style={{ borderColor: previewTheme(documentType).primary }}>{formatCurrency(Math.floor((selection.groups[0]?.totalSalesAmount ?? 0) * 0.1))}</div>
                        </div>
                      </div>

                      <div className="border-l" style={{ borderColor: previewTheme(documentType).primary }}>
                        <div className="grid grid-cols-[108px_1fr] border-b" style={{ borderColor: previewTheme(documentType).primary }}>
                          <div className="px-2 py-2" style={{ backgroundColor: previewTheme(documentType).soft }}>10%対象小計</div>
                          <div className="border-l px-2 py-2 text-right" style={{ borderColor: previewTheme(documentType).primary }}>{formatCurrency(selection.groups[0]?.totalSalesAmount ?? 0)}</div>
                        </div>
                        <div className="grid grid-cols-[108px_1fr]" style={{ borderColor: previewTheme(documentType).primary }}>
                          <div className="px-2 py-2" style={{ backgroundColor: previewTheme(documentType).soft }}>合計金額</div>
                          <div className="border-l px-2 py-2 text-right" style={{ borderColor: previewTheme(documentType).primary }}>{formatCurrency((selection.groups[0]?.totalSalesAmount ?? 0) + Math.floor((selection.groups[0]?.totalSalesAmount ?? 0) * 0.1))}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}