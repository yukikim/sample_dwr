"use client";

import Link from "next/link";

import type { AuthenticatedAdministrator } from "@/lib/auth";

export type ReportFieldState = {
  workDate: string;
  clientCode: string;
  clientName: string;
  workMinutes: string;
  laborMinutes: string;
  travelMinutes: string;
  carType: string;
  workCode: string;
  customerStatus: string;
  unitCount: string;
  salesAmount: string;
  standardMinutes: string;
  points: string;
  remarks: string;
};

export const initialReportFieldState: ReportFieldState = {
  workDate: new Date().toISOString().slice(0, 10),
  clientCode: "",
  clientName: "",
  workMinutes: "0",
  laborMinutes: "0",
  travelMinutes: "0",
  carType: "",
  workCode: "",
  customerStatus: "new",
  unitCount: "1",
  salesAmount: "0",
  standardMinutes: "",
  points: "",
  remarks: "",
};

export function createReportPayload(fields: ReportFieldState) {
  return {
    ...fields,
    standardMinutes: fields.standardMinutes === "" ? null : fields.standardMinutes,
    points: fields.points === "" ? null : fields.points,
    remarks: fields.remarks === "" ? null : fields.remarks,
    carType: fields.carType === "" ? null : fields.carType,
  };
}

export function reportFieldsFromItem(item: {
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
}): ReportFieldState {
  return {
    workDate: item.workDate,
    clientCode: item.clientCode,
    clientName: item.clientName,
    workMinutes: String(item.workMinutes),
    laborMinutes: String(item.laborMinutes),
    travelMinutes: String(item.travelMinutes),
    carType: item.carType ?? "",
    workCode: item.workCode,
    customerStatus: item.customerStatus,
    unitCount: String(item.unitCount),
    salesAmount: String(item.salesAmount),
    standardMinutes: item.standardMinutes === null ? "" : String(item.standardMinutes),
    points: item.points === null ? "" : String(item.points),
    remarks: item.remarks ?? "",
  };
}

type ReportFormProps = {
  administrator: AuthenticatedAdministrator;
  title: string;
  eyebrow: string;
  submitLabel: string;
  isPending: boolean;
  fields: ReportFieldState;
  errorMessage: string | null;
  validationDetails: string[];
  onFieldChange: (name: keyof ReportFieldState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function ReportForm({
  administrator,
  title,
  eyebrow,
  submitLabel,
  isPending,
  fields,
  errorMessage,
  validationDetails,
  onFieldChange,
  onSubmit,
}: ReportFormProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-4xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-muted)">{eyebrow}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-(--ink-soft)">
              操作者: {administrator.name} / {administrator.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/reports"
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
            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              日付
              <input
                type="date"
                value={fields.workDate}
                onChange={(event) => onFieldChange("workDate", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              得意先コード
              <input
                type="text"
                value={fields.clientCode}
                onChange={(event) => onFieldChange("clientCode", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="C001"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              得意先名
              <input
                type="text"
                value={fields.clientName}
                onChange={(event) => onFieldChange("clientName", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="株式会社サンプル"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              車種
              <input
                type="text"
                value={fields.carType}
                onChange={(event) => onFieldChange("carType", event.target.value)}
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="普通車"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              作業コード
              <input
                type="text"
                value={fields.workCode}
                onChange={(event) => onFieldChange("workCode", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="W001"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              新規/既存
              <select
                value={fields.customerStatus}
                onChange={(event) => onFieldChange("customerStatus", event.target.value)}
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              >
                <option value="new">新規</option>
                <option value="existing">既存</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              作業分
              <input
                type="number"
                min="0"
                value={fields.workMinutes}
                onChange={(event) => onFieldChange("workMinutes", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              工数分
              <input
                type="number"
                min="0"
                value={fields.laborMinutes}
                onChange={(event) => onFieldChange("laborMinutes", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              移動分
              <input
                type="number"
                min="0"
                value={fields.travelMinutes}
                onChange={(event) => onFieldChange("travelMinutes", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              台数
              <input
                type="number"
                min="0"
                value={fields.unitCount}
                onChange={(event) => onFieldChange("unitCount", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              売上金額
              <input
                type="number"
                min="0"
                step="0.01"
                value={fields.salesAmount}
                onChange={(event) => onFieldChange("salesAmount", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              基準分
              <input
                type="number"
                min="0"
                value={fields.standardMinutes}
                onChange={(event) => onFieldChange("standardMinutes", event.target.value)}
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              ポイント
              <input
                type="number"
                min="0"
                step="0.01"
                value={fields.points}
                onChange={(event) => onFieldChange("points", event.target.value)}
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
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
                href="/reports"
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