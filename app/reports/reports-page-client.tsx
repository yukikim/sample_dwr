"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";

import type { AuthenticatedAdministrator } from "@/lib/auth";
import { buildInvoicePageUrl } from "@/lib/invoice-documents";

type ReportItem = {
  id: string;
  workDate: string;
  clientCode: string;
  clientName: string;
  workMinutes: number;
  laborMinutes: number;
  travelMinutes: number;
  carType: string | null;
  workCode: string;
  customerStatus: string;
  unitCount: number;
  salesAmount: number;
  standardMinutes: number | null;
  points: number | null;
  remarks: string | null;
};

type Summary = {
  count: number;
  salesAmountTotal: number;
  workMinutesTotal: number;
  laborMinutesTotal: number;
  travelMinutesTotal: number;
  unitCountTotal: number;
  standardMinutesTotal: number;
  pointsTotal: number;
};

type Filters = {
  startDate: string;
  endDate: string;
  clientCode: string;
  clientName: string;
  carType: string;
  workCode: string;
  customerStatus: string;
  page: number;
  pageSize: number;
};

type ReportsResponse = {
  data: {
    items: ReportItem[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  };
  error: {
    code: string;
    message: string;
  } | null;
};

type SummaryResponse = {
  data: Summary;
  error: {
    code: string;
    message: string;
  } | null;
};

type MonthOption = {
  value: string;
  label: string;
};

type ReportMonthsResponse = {
  data: {
    items: MonthOption[];
  };
  error: {
    code: string;
    message: string;
  } | null;
};

const initialFilters: Filters = {
  startDate: "",
  endDate: "",
  clientCode: "",
  clientName: "",
  carType: "",
  workCode: "",
  customerStatus: "",
  page: 1,
  pageSize: 20,
};

const emptySummary: Summary = {
  count: 0,
  salesAmountTotal: 0,
  workMinutesTotal: 0,
  laborMinutesTotal: 0,
  travelMinutesTotal: 0,
  unitCountTotal: 0,
  standardMinutesTotal: 0,
  pointsTotal: 0,
};

function buildQuery(filters: Filters) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "number") {
      searchParams.set(key, String(value));
      continue;
    }

    if (value.trim()) {
      searchParams.set(key, value.trim());
    }
  }

  return searchParams.toString();
}

function parseInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return parsedValue;
}

function parseFilters(searchParams: ReadonlyURLSearchParams): Filters {
  return {
    startDate: searchParams.get("startDate") ?? "",
    endDate: searchParams.get("endDate") ?? "",
    clientCode: searchParams.get("clientCode") ?? "",
    clientName: searchParams.get("clientName") ?? "",
    carType: searchParams.get("carType") ?? "",
    workCode: searchParams.get("workCode") ?? "",
    customerStatus: searchParams.get("customerStatus") ?? "",
    page: parseInteger(searchParams.get("page"), 1),
    pageSize: parseInteger(searchParams.get("pageSize"), 20),
  };
}

function areFiltersEqual(left: Filters, right: Filters) {
  return (
    left.startDate === right.startDate &&
    left.endDate === right.endDate &&
    left.clientCode === right.clientCode &&
    left.clientName === right.clientName &&
    left.carType === right.carType &&
    left.workCode === right.workCode &&
    left.customerStatus === right.customerStatus &&
    left.page === right.page &&
    left.pageSize === right.pageSize
  );
}

function buildReportsUrl(filters: Filters) {
  const query = buildQuery(filters);
  return query ? `/reports?${query}` : "/reports";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCustomerStatus(value: string) {
  if (value === "new") {
    return "新規";
  }

  if (value === "existing") {
    return "既存";
  }

  return value;
}

function formatOptionalNumber(value: number | null) {
  return value === null ? "-" : String(value);
}

function getMonthRange(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month] = value.split("-").map(Number);

  if (!year || !month) {
    return null;
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
  };
}

function getSelectedMonthValue(filters: Pick<Filters, "startDate" | "endDate">) {
  if (!filters.startDate || !filters.endDate) {
    return "";
  }

  const startDate = new Date(`${filters.startDate}T00:00:00Z`);
  const endDate = new Date(`${filters.endDate}T00:00:00Z`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "";
  }

  if (
    startDate.getUTCFullYear() !== endDate.getUTCFullYear() ||
    startDate.getUTCMonth() !== endDate.getUTCMonth() ||
    startDate.getUTCDate() !== 1
  ) {
    return "";
  }

  const lastDay = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0)).getUTCDate();

  if (endDate.getUTCDate() !== lastDay) {
    return "";
  }

  return filters.startDate.slice(0, 7);
}

export function ReportsPageClient({ administrator }: { administrator: AuthenticatedAdministrator }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrlFilters = parseFilters(searchParams);
  const [draftFilters, setDraftFilters] = useState<Filters>(initialUrlFilters);
  const [activeFilters, setActiveFilters] = useState<Filters>(initialUrlFilters);
  const [items, setItems] = useState<ReportItem[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([]);
  const [total, setTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFetching, startFetching] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);

  const status = searchParams.get("status");

  useEffect(() => {
    const nextFilters = parseFilters(searchParams);

    setDraftFilters((current) => (areFiltersEqual(current, nextFilters) ? current : nextFilters));
    setActiveFilters((current) => (areFiltersEqual(current, nextFilters) ? current : nextFilters));
  }, [searchParams]);

  useEffect(() => {
    if (status === "created") {
      setSuccessMessage("日報を登録しました。");
      return;
    }

    if (status === "updated") {
      setSuccessMessage("日報を更新しました。");
      return;
    }

    if (status === "missing") {
      setSuccessMessage("対象の日報が見つからなかったため一覧へ戻りました。");
      return;
    }

    setSuccessMessage(null);
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    async function loadMonthOptions() {
      const response = await fetch("/api/reports/months", { cache: "no-store" });

      if (response.status === 401) {
        router.push("/");
        return;
      }

      const json = (await response.json()) as ReportMonthsResponse;

      if (cancelled || !response.ok) {
        return;
      }

      setMonthOptions(json.data.items);
    }

    void loadMonthOptions();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    startFetching(async () => {
      setErrorMessage(null);

      const query = buildQuery(activeFilters);
      const [reportsResponse, summaryResponse] = await Promise.all([
        fetch(`/api/reports?${query}`, { cache: "no-store" }),
        fetch(`/api/reports/summary?${query}`, { cache: "no-store" }),
      ]);

      if (reportsResponse.status === 401 || summaryResponse.status === 401) {
        router.push("/");
        return;
      }

      const reportsJson = (await reportsResponse.json()) as ReportsResponse;
      const summaryJson = (await summaryResponse.json()) as SummaryResponse;

      if (cancelled) {
        return;
      }

      if (!reportsResponse.ok) {
        setItems([]);
        setSummary(emptySummary);
        setTotal(0);
        setErrorMessage(reportsJson.error?.message ?? "日報一覧の取得に失敗しました。");
        return;
      }

      if (!summaryResponse.ok) {
        setItems(reportsJson.data.items);
        setTotal(reportsJson.data.pagination.total);
        setSummary(emptySummary);
        setErrorMessage(summaryJson.error?.message ?? "集計結果の取得に失敗しました。");
        return;
      }

      setItems(reportsJson.data.items);
      setTotal(reportsJson.data.pagination.total);
      setSummary(summaryJson.data);
    });

    return () => {
      cancelled = true;
    };
  }, [activeFilters, router]);

  const totalPages = Math.max(1, Math.ceil(total / activeFilters.pageSize));
  const selectedCount = selectedReportIds.length;
  const selectedReportIdSet = new Set(selectedReportIds);
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedReportIdSet.has(item.id));

  async function handleDelete(reportId: string) {
    const shouldDelete = window.confirm("この日報を削除します。元に戻せません。");

    if (!shouldDelete) {
      return;
    }

    setDeletingId(reportId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as { error: { message: string } | null };

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        setErrorMessage(json.error?.message ?? "削除に失敗しました。");
        return;
      }

      setSuccessMessage("日報を削除しました。");
      setSelectedReportIds((current) => current.filter((id) => id !== reportId));
      setActiveFilters((current) => ({ ...current }));
    } finally {
      setDeletingId(null);
    }
  }

  function handleToggleReportSelection(reportId: string) {
    setSelectedReportIds((current) => {
      if (current.includes(reportId)) {
        return current.filter((id) => id !== reportId);
      }

      return [...current, reportId];
    });
  }

  function handleToggleVisibleSelections() {
    const visibleIds = items.map((item) => item.id);

    setSelectedReportIds((current) => {
      if (visibleIds.every((id) => current.includes(id))) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  function clearSelections() {
    setSelectedReportIds([]);
  }

  function handleFilterChange(name: keyof Filters, value: string) {
    setDraftFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleMonthChange(value: string) {
    if (!value) {
      setDraftFilters((current) => ({
        ...current,
        startDate: "",
        endDate: "",
      }));
      return;
    }

    const monthRange = getMonthRange(value);

    if (!monthRange) {
      return;
    }

    setDraftFilters((current) => ({
      ...current,
      startDate: monthRange.startDate,
      endDate: monthRange.endDate,
    }));
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters = {
      ...draftFilters,
      page: 1,
    };

    setActiveFilters(nextFilters);
    router.replace(buildReportsUrl(nextFilters));
  }

  function handleReset() {
    setDraftFilters(initialFilters);
    setActiveFilters(initialFilters);
    router.replace("/reports");
  }

  function dismissStatusMessage() {
    setSuccessMessage(null);

    if (!status) {
      return;
    }

    router.replace("/reports");
  }

  function movePage(nextPage: number) {
    const nextFilters = {
      ...activeFilters,
      page: nextPage,
    };

    setActiveFilters(nextFilters);
    setDraftFilters((current) => ({
      ...current,
      page: nextPage,
    }));
    router.replace(buildReportsUrl(nextFilters));
  }

  function handleExportCsv() {
    const query = buildQuery(activeFilters);
    window.location.href = query ? `/api/reports/export.csv?${query}` : "/api/reports/export.csv";
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-4xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-muted)">Daily Work Reports</p>
            <h1 className="text-3xl font-semibold tracking-tight">日報一覧</h1>
            <p className="text-sm text-(--ink-soft)">
              管理者: {administrator.name} / {administrator.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              ダッシュボードへ戻る
            </Link>
            <Link
              href="/reports/new"
              className="inline-flex h-11 items-center justify-center rounded-full bg-(--accent-strong) px-5 text-sm font-semibold text-white transition hover:bg-(--accent-deep)"
            >
              日報を新規登録
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
            <p className="text-sm text-(--ink-muted)">件数</p>
            <p className="mt-3 text-3xl font-semibold">{summary.count}</p>
          </article>
          <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
            <p className="text-sm text-(--ink-muted)">売上合計</p>
            <p className="mt-3 text-3xl font-semibold">{formatCurrency(summary.salesAmountTotal)}</p>
          </article>
          <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
            <p className="text-sm text-(--ink-muted)">作業分合計</p>
            <p className="mt-3 text-3xl font-semibold">{summary.workMinutesTotal}</p>
          </article>
          <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
            <p className="text-sm text-(--ink-muted)">工数分合計</p>
            <p className="mt-3 text-3xl font-semibold">{summary.laborMinutesTotal}</p>
          </article>
          <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
            <p className="text-sm text-(--ink-muted)">移動分合計</p>
            <p className="mt-3 text-3xl font-semibold">{summary.travelMinutesTotal}</p>
          </article>
          <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
            <p className="text-sm text-(--ink-muted)">台数合計</p>
            <p className="mt-3 text-3xl font-semibold">{summary.unitCountTotal}</p>
          </article>
          <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
            <p className="text-sm text-(--ink-muted)">基準分合計</p>
            <p className="mt-3 text-3xl font-semibold">{summary.standardMinutesTotal}</p>
          </article>
          <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-5 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
            <p className="text-sm text-(--ink-muted)">ポイント合計</p>
            <p className="mt-3 text-3xl font-semibold">{summary.pointsTotal}</p>
          </article>
        </section>

        {successMessage ? (
          <section className="rounded-3xl border border-[#bfd9c7] bg-[#eef9f1] px-5 py-4 text-sm text-[#1f5d35] shadow-[0_10px_30px_rgba(31,93,53,0.08)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{successMessage}</p>
              <button
                type="button"
                onClick={dismissStatusMessage}
                className="inline-flex h-9 items-center justify-center rounded-full border border-[#bfd9c7] bg-white px-4 text-sm font-medium text-[#1f5d35]"
              >
                閉じる
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)]">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSearchSubmit}>
            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              対象月
              <select
                value={getSelectedMonthValue(draftFilters)}
                onChange={(event) => handleMonthChange(event.target.value)}
                className="h-11 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              >
                <option value="">月を選択</option>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              開始日
              <input
                type="date"
                value={draftFilters.startDate}
                onChange={(event) => handleFilterChange("startDate", event.target.value)}
                className="h-11 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              終了日
              <input
                type="date"
                value={draftFilters.endDate}
                onChange={(event) => handleFilterChange("endDate", event.target.value)}
                className="h-11 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              得意先コード
              <input
                type="text"
                value={draftFilters.clientCode}
                onChange={(event) => handleFilterChange("clientCode", event.target.value)}
                className="h-11 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="C001"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              得意先名
              <input
                type="text"
                value={draftFilters.clientName}
                onChange={(event) => handleFilterChange("clientName", event.target.value)}
                className="h-11 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="株式会社サンプル"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              車種
              <input
                type="text"
                value={draftFilters.carType}
                onChange={(event) => handleFilterChange("carType", event.target.value)}
                className="h-11 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="普通車"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              作業コード
              <input
                type="text"
                value={draftFilters.workCode}
                onChange={(event) => handleFilterChange("workCode", event.target.value)}
                className="h-11 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="W001"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              新規/既存
              <select
                value={draftFilters.customerStatus}
                onChange={(event) => handleFilterChange("customerStatus", event.target.value)}
                className="h-11 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              >
                <option value="">すべて</option>
                <option value="new">新規</option>
                <option value="existing">既存</option>
              </select>
            </label>

            <div className="flex items-end gap-3 xl:col-span-1">
              <button
                type="submit"
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-(--accent-strong) px-5 text-sm font-semibold text-white transition hover:bg-(--accent-deep) disabled:opacity-70"
                disabled={isFetching}
              >
                {isFetching ? "検索中..." : "検索する"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
              >
                リセット
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)]">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">検索結果</h2>
              <p className="mt-1 text-sm text-(--ink-soft)">
                {total} 件中 {(activeFilters.page - 1) * activeFilters.pageSize + 1} 件目から {Math.min(activeFilters.page * activeFilters.pageSize, total)} 件目を表示
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={buildInvoicePageUrl(selectedReportIds)}
                aria-disabled={selectedCount === 0}
                className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                  selectedCount === 0
                    ? "pointer-events-none border border-black/10 bg-white text-(--ink-muted) opacity-50"
                    : "bg-(--accent-strong) text-white hover:bg-(--accent-deep)"
                }`}
              >
                選択した日報で伝票作成
              </Link>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isFetching}
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3 disabled:opacity-50"
              >
                CSV をダウンロード
              </button>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-[#eadfd5] bg-[#fff8f2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-(--ink)">選択中の日報 {selectedCount} 件</p>
              <p className="mt-1 text-sm text-(--ink-soft)">
                複数ページにまたがって選択できます。選択した日報を伝票ページへ引き継ぎます。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleToggleVisibleSelections}
                disabled={items.length === 0}
                className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3 disabled:opacity-50"
              >
                {allVisibleSelected ? "表示中を選択解除" : "表示中をすべて選択"}
              </button>
              <button
                type="button"
                onClick={clearSelections}
                disabled={selectedCount === 0}
                className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3 disabled:opacity-50"
              >
                選択をクリア
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-[#e7b4ab] bg-[#fff3f0] px-4 py-3 text-sm text-[#8e2c18]">
              {errorMessage}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-sm text-(--ink-muted)">
                  <th className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleToggleVisibleSelections}
                      aria-label="表示中の日報をすべて選択"
                      className="h-4 w-4 rounded border border-black/20 accent-(--accent-strong)"
                    />
                  </th>
                  <th className="px-4 py-2">日付</th>
                  <th className="px-4 py-2">得意先</th>
                  <th className="px-4 py-2">車種</th>
                  <th className="px-4 py-2">作業コード</th>
                  <th className="px-4 py-2">状態</th>
                  <th className="px-4 py-2">売上</th>
                  <th className="px-4 py-2">作業分</th>
                  <th className="px-4 py-2">工数分</th>
                  <th className="px-4 py-2">移動分</th>
                  <th className="px-4 py-2">台数</th>
                  <th className="px-4 py-2">基準分</th>
                  <th className="px-4 py-2">ポイント</th>
                  <th className="px-4 py-2">備考</th>
                  <th className="px-4 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="rounded-3xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-(--ink-soft)">
                      {isFetching ? "日報データを読み込んでいます..." : "条件に一致する日報はありません。"}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="rounded-3xl bg-[#fffdf9] shadow-[0_12px_30px_rgba(76,47,33,0.06)]">
                      <td className="rounded-l-3xl px-4 py-4 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedReportIdSet.has(item.id)}
                          onChange={() => handleToggleReportSelection(item.id)}
                          aria-label={`${item.clientName} を選択`}
                          className="h-4 w-4 rounded border border-black/20 accent-(--accent-strong)"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm">{item.workDate}</td>
                      <td className="px-4 py-4 text-sm">
                        <div className="font-medium">{item.clientName}</div>
                        <div className="text-(--ink-muted)">{item.clientCode}</div>
                      </td>
                      <td className="px-4 py-4 text-sm">{item.carType ?? "-"}</td>
                      <td className="px-4 py-4 text-sm">{item.workCode}</td>
                      <td className="px-4 py-4 text-sm">{formatCustomerStatus(item.customerStatus)}</td>
                      <td className="px-4 py-4 text-sm">{formatCurrency(item.salesAmount)}</td>
                      <td className="px-4 py-4 text-sm">{item.workMinutes}</td>
                      <td className="px-4 py-4 text-sm">{item.laborMinutes}</td>
                      <td className="px-4 py-4 text-sm">{item.travelMinutes}</td>
                      <td className="px-4 py-4 text-sm">{item.unitCount}</td>
                      <td className="px-4 py-4 text-sm">{formatOptionalNumber(item.standardMinutes)}</td>
                      <td className="px-4 py-4 text-sm">{formatOptionalNumber(item.points)}</td>
                      <td className="px-4 py-4 text-sm text-(--ink-soft)">{item.remarks ?? "-"}</td>
                      <td className="rounded-r-3xl px-4 py-4 text-sm">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/reports/${item.id}/edit`}
                            className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
                          >
                            編集
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="inline-flex h-10 items-center justify-center rounded-full border border-[#e7b4ab] bg-[#fff3f0] px-4 text-sm font-medium text-[#8e2c18] transition hover:bg-[#ffe5de] disabled:opacity-60"
                          >
                            {deletingId === item.id ? "削除中..." : "削除"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => movePage(Math.max(1, activeFilters.page - 1))}
              disabled={activeFilters.page <= 1 || isFetching}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3 disabled:opacity-50"
            >
              前へ
            </button>

            <p className="text-sm text-(--ink-soft)">
              {activeFilters.page} / {totalPages} ページ
            </p>

            <button
              type="button"
              onClick={() => movePage(Math.min(totalPages, activeFilters.page + 1))}
              disabled={activeFilters.page >= totalPages || isFetching}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3 disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}