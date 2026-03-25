"use client";

import Link from "next/link";

import type { AuthenticatedAdministrator } from "@/lib/auth";
import type { ReportMasterConfig } from "@/lib/report-masters";

export type ReportMasterFieldState = {
  name: string;
  remarks: string;
};

export const initialReportMasterFieldState: ReportMasterFieldState = {
  name: "",
  remarks: "",
};

export function createReportMasterPayload(fields: ReportMasterFieldState) {
  return {
    ...fields,
    remarks: fields.remarks === "" ? null : fields.remarks,
  };
}

export function reportMasterFieldsFromItem(item: {
  name: string;
  remarks: string | null;
}): ReportMasterFieldState {
  return {
    name: item.name,
    remarks: item.remarks ?? "",
  };
}

type ReportMasterFormProps = {
  administrator: AuthenticatedAdministrator;
  config: ReportMasterConfig;
  title: string;
  submitLabel: string;
  isPending: boolean;
  fields: ReportMasterFieldState;
  errorMessage: string | null;
  validationDetails: string[];
  onFieldChange: (name: keyof ReportMasterFieldState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function ReportMasterForm({
  administrator,
  config,
  title,
  submitLabel,
  isPending,
  fields,
  errorMessage,
  validationDetails,
  onFieldChange,
  onSubmit,
}: ReportMasterFormProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-4xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-muted)">{config.eyebrow}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-(--ink-soft)">
              操作者: {administrator.name} / {administrator.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={config.path}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              一覧へ戻る
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              ダッシュボード
            </Link>
          </div>
        </header>

        <section className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] sm:p-8">
          <form className="grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="flex flex-col gap-2 text-sm text-(--ink-soft) md:col-span-2">
              {config.fieldLabel}
              <input
                type="text"
                value={fields.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder={`${config.singularLabel}を入力してください`}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft) md:col-span-2">
              備考
              <textarea
                value={fields.remarks}
                onChange={(event) => onFieldChange("remarks", event.target.value)}
                rows={4}
                className="rounded-3xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-(--accent-strong)"
                placeholder="補足事項があれば入力してください"
              />
            </label>

            {errorMessage ? (
              <div className="md:col-span-2 rounded-2xl border border-[#e7b4ab] bg-[#fff3f0] px-4 py-4 text-sm text-[#8e2c18]">
                <p>{errorMessage}</p>
                {validationDetails.length > 0 ? (
                  <ul className="mt-2 list-disc pl-5">
                    {validationDetails.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-12 items-center justify-center rounded-full bg-(--accent-strong) px-6 text-sm font-semibold text-white transition hover:bg-(--accent-deep) disabled:opacity-70"
              >
                {isPending ? "送信中..." : submitLabel}
              </button>
              <Link
                href={config.path}
                className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
              >
                キャンセル
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}