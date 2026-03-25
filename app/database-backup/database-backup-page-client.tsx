"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AuthenticatedAdministrator } from "@/lib/auth";

type RestoreResponse = {
  data: {
    summary: {
      administrators: number;
      clients: number;
      carTypeMasters: number;
      workLocationMasters: number;
      workContentMasters: number;
      dailyWorkReports: number;
    };
  } | null;
  error: {
    code: string;
    message: string;
  } | null;
};

export function DatabaseBackupPageClient({ administrator }: { administrator: AuthenticatedAdministrator }) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDownloading, startDownload] = useTransition();
  const [isRestoring, startRestore] = useTransition();

  function handleDownload() {
    setErrorMessage(null);
    setSuccessMessage(null);

    startDownload(async () => {
      const response = await fetch("/api/database-backup", { cache: "no-store" });

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        setErrorMessage("バックアップファイルの生成に失敗しました。");
        return;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") ?? "";
      const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i);
      const fileName = decodeURIComponent(fileNameMatch?.[1] ?? fileNameMatch?.[2] ?? "polish-dwr-backup.json");
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setSuccessMessage("バックアップファイルをダウンロードしました。");
    });
  }

  function handleRestore() {
    if (!selectedFile) {
      setErrorMessage("リストアするバックアップファイルを選択してください。");
      return;
    }

    const confirmed = window.confirm("現在のデータベース内容をすべて置き換えます。続行しますか？");

    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startRestore(async () => {
      const formData = new FormData();
      formData.set("file", selectedFile);

      const response = await fetch("/api/database-backup/restore", {
        method: "POST",
        body: formData,
      });
      const json = (await response.json()) as RestoreResponse;

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (!response.ok || !json.data) {
        setErrorMessage(json.error?.message ?? "バックアップのリストアに失敗しました。");
        return;
      }

      setSuccessMessage(
        `リストアが完了しました。管理者 ${json.data.summary.administrators} 件、得意先 ${json.data.summary.clients} 件、日報 ${json.data.summary.dailyWorkReports} 件を反映しました。`,
      );
      setSelectedFile(null);
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-4xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-muted)">Database Backup</p>
            <h1 className="text-3xl font-semibold tracking-tight">バックアップ / リストア</h1>
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
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-3xl border border-[#e7b4ab] bg-[#fff3f0] px-5 py-4 text-sm text-[#8e2c18] shadow-[0_10px_30px_rgba(142,44,24,0.08)]">
            {errorMessage}
          </section>
        ) : null}

        {successMessage ? (
          <section className="rounded-3xl border border-[#bfd9c7] bg-[#eef9f1] px-5 py-4 text-sm text-[#1f5d35] shadow-[0_10px_30px_rgba(31,93,53,0.08)]">
            {successMessage}
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-muted)">Export</p>
            <h2 className="mt-2 text-2xl font-semibold">現在データをダウンロード</h2>
            <p className="mt-3 text-sm leading-6 text-(--ink-soft)">
              管理者、得意先、各種マスタ、日報を JSON 形式でダンプし、そのままダウンロードします。
            </p>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading || isRestoring}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-(--accent-strong) px-5 text-sm font-semibold text-white transition hover:bg-(--accent-deep) disabled:opacity-60"
            >
              {isDownloading ? "生成中..." : "バックアップをダウンロード"}
            </button>
          </article>

          <article className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-muted)">Restore</p>
            <h2 className="mt-2 text-2xl font-semibold">バックアップからリストア</h2>
            <p className="mt-3 text-sm leading-6 text-(--ink-soft)">
              ダウンロード済みの JSON バックアップをアップロードして、現在のデータベース内容を丸ごと置き換えます。
            </p>
            <label className="mt-6 flex flex-col gap-2 text-sm text-(--ink-soft)">
              バックアップファイル
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3"
              />
            </label>
            <p className="mt-3 text-xs leading-5 text-[#8e2c18]">
              リストアを実行すると、現在の管理者、得意先、各種マスタ、日報データはすべて削除され、アップロードした内容に置き換わります。
            </p>
            <button
              type="button"
              onClick={handleRestore}
              disabled={!selectedFile || isDownloading || isRestoring}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-[#e7b4ab] bg-[#fff3f0] px-5 text-sm font-semibold text-[#8e2c18] transition hover:bg-[#ffe5de] disabled:opacity-60"
            >
              {isRestoring ? "リストア中..." : "バックアップをリストア"}
            </button>
          </article>
        </section>
      </div>
    </main>
  );
}