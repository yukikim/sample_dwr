"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { AuthenticatedAdministrator } from "@/lib/auth";
import type { ReportMasterConfig } from "@/lib/report-masters";

type ReportMasterItem = {
  id: string;
  name: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  reportUsageCount?: number;
  isInUse?: boolean;
};

type ReportMastersResponse = {
  data: {
    items?: ReportMasterItem[];
  };
  error: {
    code: string;
    message: string;
    details?: string[];
  } | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusMessage(config: ReportMasterConfig, status: string | null) {
  if (status === "created") {
    return `${config.singularLabel}を追加しました。`;
  }

  if (status === "updated") {
    return `${config.singularLabel}を更新しました。`;
  }

  if (status === "deleted") {
    return `${config.singularLabel}を削除しました。`;
  }

  if (status === "missing") {
    return `対象の${config.singularLabel}が見つかりませんでした。`;
  }

  return null;
}

export function ReportMastersPageClient({
  administrator,
  config,
}: {
  administrator: AuthenticatedAdministrator;
  config: ReportMasterConfig;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ReportMasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const successMessage = getStatusMessage(config, searchParams.get("status"));

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch(config.apiPath, { cache: "no-store" });
      const json = (await response.json()) as ReportMastersResponse;

      if (cancelled) {
        return;
      }

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        setItems([]);
        setErrorMessage(json.error?.message ?? `${config.title}の取得に失敗しました。`);
        setIsLoading(false);
        return;
      }

      setItems(json.data.items ?? []);
      setIsLoading(false);
    }

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, [config, router]);

  function handleDelete(item: ReportMasterItem) {
    if (!window.confirm(`${item.name} を削除します。よろしいですか。`)) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const response = await fetch(`${config.apiPath}/${item.id}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as ReportMastersResponse;

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        setErrorMessage(json.error?.message ?? `${config.singularLabel}の削除に失敗しました。`);
        return;
      }

      router.push(`${config.path}?status=deleted`);
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-4xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-muted)">{config.eyebrow}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{config.title}</h1>
            <p className="text-sm text-(--ink-soft)">
              操作者: {administrator.name} / {administrator.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`${config.path}/new`}
              className="inline-flex h-11 items-center justify-center rounded-full bg-(--accent-strong) px-5 text-sm font-semibold text-white transition hover:bg-(--accent-deep)"
            >
              {config.singularLabel}を追加
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              ダッシュボードへ戻る
            </Link>
          </div>
        </header>

        {successMessage ? (
          <section className="rounded-3xl border border-[#bfd9c7] bg-[#eef9f1] px-5 py-4 text-sm text-[#1f5d35] shadow-[0_10px_30px_rgba(31,93,53,0.08)]">
            {successMessage}
          </section>
        ) : null}

        {errorMessage ? (
          <section className="rounded-3xl border border-[#e7b4ab] bg-[#fff3f0] px-5 py-4 text-sm text-[#8e2c18] shadow-[0_10px_30px_rgba(142,44,24,0.08)]">
            {errorMessage}
          </section>
        ) : null}

        <section className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] sm:p-8">
          <div className="mb-6 space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">{config.listTitle}</h2>
            <p className="text-sm text-(--ink-soft)">{config.singularLabel}マスタの確認、編集、削除を行えます。日報で使用中の項目は削除できません。</p>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-(--ink-soft)">
              {config.title}を読み込んでいます...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-(--ink-soft)">
              {config.emptyMessage}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-sm text-(--ink-muted)">
                    <th className="px-4 py-2">名称</th>
                    <th className="px-4 py-2">備考</th>
                    <th className="px-4 py-2">更新日時</th>
                    <th className="px-4 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="bg-[#fffdf9] shadow-[0_12px_30px_rgba(76,47,33,0.06)]">
                      <td className="rounded-l-3xl px-4 py-4 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{item.name}</p>
                          {item.isInUse ? (
                            <span className="inline-flex items-center rounded-full border border-[#bfd9c7] bg-[#eef9f1] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-[#1f5d35]">
                              使用中
                            </span>
                          ) : null}
                        </div>
                        {item.isInUse ? (
                          <p className="mt-1 text-xs text-(--ink-muted)">関連日報: {item.reportUsageCount ?? 0} 件</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-(--ink-soft)">{item.remarks ?? "-"}</td>
                      <td className="px-4 py-4 text-sm text-(--ink-soft)">{formatDateTime(item.updatedAt)}</td>
                      <td className="rounded-r-3xl px-4 py-4 text-sm">
                        <div className="flex flex-wrap gap-3">
                          <Link
                            href={`${config.path}/${item.id}/edit`}
                            className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
                          >
                            編集
                          </Link>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDelete(item)}
                            className="inline-flex h-10 items-center justify-center rounded-full border border-[#e7b4ab] bg-[#fff3f0] px-4 text-sm font-medium text-[#8e2c18] transition hover:bg-[#ffe9e4] disabled:opacity-70"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}