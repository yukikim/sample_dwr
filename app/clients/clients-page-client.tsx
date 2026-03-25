"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { AuthenticatedAdministrator } from "@/lib/auth";

type ClientItem = {
  id: string;
  code: string;
  name: string;
  address: string;
  contactTel: string;
  contactEmail: string;
  contactPerson: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  reportUsageCount?: number;
  isInUse?: boolean;
};

type ClientsResponse = {
  data: {
    items?: ClientItem[];
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

function getStatusMessage(status: string | null) {
  if (status === "created") {
    return "得意先を追加しました。";
  }

  if (status === "updated") {
    return "得意先情報を更新しました。";
  }

  if (status === "deleted") {
    return "得意先を削除しました。";
  }

  if (status === "missing") {
    return "対象の得意先が見つかりませんでした。";
  }

  return null;
}

export function ClientsPageClient({ administrator }: { administrator: AuthenticatedAdministrator }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ClientItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const successMessage = getStatusMessage(searchParams.get("status"));

  useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch("/api/clients", { cache: "no-store" });
      const json = (await response.json()) as ClientsResponse;

      if (cancelled) {
        return;
      }

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        setItems([]);
        setErrorMessage(json.error?.message ?? "得意先一覧の取得に失敗しました。");
        setIsLoading(false);
        return;
      }

      setItems(json.data.items ?? []);
      setIsLoading(false);
    }

    void loadClients();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleDelete(item: ClientItem) {
    if (!window.confirm(`${item.name} を削除します。よろしいですか。`)) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/clients/${item.id}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as ClientsResponse;

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        setErrorMessage(json.error?.message ?? "得意先の削除に失敗しました。");
        return;
      }

      router.push("/clients?status=deleted");
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-4xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-muted)">Client Management</p>
            <h1 className="text-3xl font-semibold tracking-tight">得意先管理</h1>
            <p className="text-sm text-(--ink-soft)">
              操作者: {administrator.name} / {administrator.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/clients/new"
              className="inline-flex h-11 items-center justify-center rounded-full bg-(--accent-strong) px-5 text-sm font-semibold text-white transition hover:bg-(--accent-deep)"
            >
              得意先を追加
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
            <h2 className="text-2xl font-semibold tracking-tight">登録済み得意先</h2>
            <p className="text-sm text-(--ink-soft)">得意先マスタの確認、編集、削除を行えます。日報で使用中の得意先は削除できません。</p>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-(--ink-soft)">
              得意先一覧を読み込んでいます...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-(--ink-soft)">
              得意先はまだ登録されていません。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-sm text-(--ink-muted)">
                    <th className="px-4 py-2">コード</th>
                    <th className="px-4 py-2">名称</th>
                    <th className="px-4 py-2">TEL / Email</th>
                    <th className="px-4 py-2">担当者</th>
                    <th className="px-4 py-2">更新日時</th>
                    <th className="px-4 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="bg-[#fffdf9] shadow-[0_12px_30px_rgba(76,47,33,0.06)]">
                      <td className="rounded-l-3xl px-4 py-4 text-sm font-medium">{item.code}</td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{item.name}</p>
                          {item.isInUse ? (
                            <span className="inline-flex items-center rounded-full border border-[#bfd9c7] bg-[#eef9f1] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-[#1f5d35]">
                              使用中
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-(--ink-soft)">{item.address}</p>
                        {item.isInUse ? (
                          <p className="mt-1 text-xs text-(--ink-muted)">関連日報: {item.reportUsageCount ?? 0} 件</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <p>{item.contactTel}</p>
                        <p className="mt-1 text-xs text-(--ink-soft)">{item.contactEmail}</p>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <p>{item.contactPerson}</p>
                        {item.remarks ? <p className="mt-1 text-xs text-(--ink-soft)">{item.remarks}</p> : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-(--ink-soft)">{formatDateTime(item.updatedAt)}</td>
                      <td className="rounded-r-3xl px-4 py-4 text-sm">
                        <div className="flex flex-wrap gap-3">
                          <Link
                            href={`/clients/${item.id}/edit`}
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