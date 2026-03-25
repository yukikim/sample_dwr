"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SummaryResponse = {
  data: {
    count: number;
    salesAmountTotal: number;
    workMinutesTotal: number;
    laborMinutesTotal: number;
    travelMinutesTotal: number;
    unitCountTotal: number;
    standardMinutesTotal: number;
    pointsTotal: number;
  };
  error: {
    code: string;
    message: string;
  } | null;
};

type AdministratorsResponse = {
  data: {
    items: Array<{
      id: string;
      name: string;
      email: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  error: {
    code: string;
    message: string;
  } | null;
};

type DashboardStats = {
  reportCount: number;
  salesAmountTotal: number;
  pointsTotal: number;
  activeAdministratorCount: number;
};

const initialStats: DashboardStats = {
  reportCount: 0,
  salesAmountTotal: 0,
  pointsTotal: 0,
  activeAdministratorCount: 0,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardSummary() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setIsLoading(true);
      setErrorMessage(null);

      const [summaryResponse, administratorsResponse] = await Promise.all([
        fetch("/api/reports/summary", { cache: "no-store" }),
        fetch("/api/administrators", { cache: "no-store" }),
      ]);

      if (summaryResponse.status === 401 || administratorsResponse.status === 401) {
        router.push("/");
        return;
      }

      const summaryJson = (await summaryResponse.json()) as SummaryResponse;
      const administratorsJson = (await administratorsResponse.json()) as AdministratorsResponse;

      if (cancelled) {
        return;
      }

      if (!summaryResponse.ok) {
        setErrorMessage(summaryJson.error?.message ?? "ダッシュボード集計の取得に失敗しました。");
        setIsLoading(false);
        return;
      }

      if (!administratorsResponse.ok) {
        setErrorMessage(administratorsJson.error?.message ?? "管理者数の取得に失敗しました。");
        setIsLoading(false);
        return;
      }

      setStats({
        reportCount: summaryJson.data.count,
        salesAmountTotal: summaryJson.data.salesAmountTotal,
        pointsTotal: summaryJson.data.pointsTotal,
        activeAdministratorCount: administratorsJson.data.items.filter((item) => item.isActive).length,
      });
      setIsLoading(false);
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <>
      {errorMessage ? (
        <section className="rounded-3xl border border-[#e7b4ab] bg-[#fff3f0] px-5 py-4 text-sm text-[#8e2c18] shadow-[0_10px_30px_rgba(142,44,24,0.08)]">
          {errorMessage}
        </section>
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-6 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
          <p className="text-sm text-(--ink-muted)">登録済み日報</p>
          <p className="mt-3 text-2xl font-semibold">{isLoading ? "..." : `${stats.reportCount} 件`}</p>
          <p className="mt-2 text-sm text-(--ink-soft)">現在登録されている日報件数です。</p>
        </article>

        <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-6 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
          <p className="text-sm text-(--ink-muted)">売上合計</p>
          <p className="mt-3 text-2xl font-semibold">{isLoading ? "..." : formatCurrency(stats.salesAmountTotal)}</p>
          <p className="mt-2 text-sm text-(--ink-soft)">全日報を対象にした売上の累計です。</p>
          <div className="mt-5 flex gap-3">
            <Link
              href="/reports"
              className="inline-flex h-10 items-center justify-center rounded-full bg-(--accent-strong) px-4 text-sm font-semibold text-white transition hover:bg-(--accent-deep)"
            >
              日報一覧へ
            </Link>
            <Link
              href="/reports/new"
              className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              新規登録
            </Link>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-6 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
          <p className="text-sm text-(--ink-muted)">有効管理者数 / ポイント</p>
          <p className="mt-3 text-2xl font-semibold">
            {isLoading ? "..." : `${stats.activeAdministratorCount} 名 / ${stats.pointsTotal} pt`}
          </p>
          <p className="mt-2 text-sm text-(--ink-soft)">有効な管理者アカウント数とポイント累計を表示します。</p>
          <div className="mt-5 flex gap-3">
            <Link
              href="/administrators"
              className="inline-flex h-10 items-center justify-center rounded-full bg-(--accent-strong) px-4 text-sm font-semibold text-white transition hover:bg-(--accent-deep)"
            >
              管理者追加
            </Link>
            <Link
              href="/clients"
              className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              得意先管理
            </Link>
            <Link
              href="/car-types"
              className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              車種管理
            </Link>
            <Link
              href="/work-locations"
              className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              作業場所管理
            </Link>
            <Link
              href="/work-contents"
              className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              作業内容管理
            </Link>
            <Link
              href="/database-backup"
              className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              バックアップ
            </Link>
          </div>
        </article>
      </section>
    </>
  );
}