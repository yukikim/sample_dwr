"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { AuthenticatedAdministrator } from "@/lib/auth";

type ClientOption = {
  id: string;
  code: string;
  name: string;
};

type MasterOption = {
  id: string;
  name: string;
};

export type ReportFieldState = {
  workDate: string;
  clientCode: string;
  clientName: string;
  purchaser: string;
  workMinutes: string;
  laborMinutes: string;
  travelMinutes: string;
  carType: string;
  workLocation: string;
  signerName: string;
  vehicleIdentifier: string;
  workCode: string;
  customerStatus: string;
  billingStatus: string;
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
  purchaser: "",
  workMinutes: "0",
  laborMinutes: "0",
  travelMinutes: "0",
  carType: "",
  workLocation: "",
  signerName: "",
  vehicleIdentifier: "",
  workCode: "",
  customerStatus: "new",
  billingStatus: "unprocessed",
  unitCount: "1",
  salesAmount: "0",
  standardMinutes: "",
  points: "",
  remarks: "",
};

export function createReportPayload(fields: ReportFieldState) {
  return {
    ...fields,
    purchaser: fields.purchaser === "" ? null : fields.purchaser,
    signerName: fields.signerName === "" ? null : fields.signerName,
    standardMinutes: fields.standardMinutes === "" ? null : fields.standardMinutes,
    points: fields.points === "" ? null : fields.points,
    remarks: fields.remarks === "" ? null : fields.remarks,
  };
}

export function reportFieldsFromItem(item: {
  workDate: string;
  clientCode: string;
  clientName: string;
  purchaser: string | null;
  workMinutes: number;
  laborMinutes: number;
  travelMinutes: number;
  carType: string | null;
  workLocation: string | null;
  signerName: string | null;
  vehicleIdentifier: string | null;
  workCode: string;
  customerStatus: string;
  billingStatus: string;
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
    purchaser: item.purchaser ?? "",
    workMinutes: String(item.workMinutes),
    laborMinutes: String(item.laborMinutes),
    travelMinutes: String(item.travelMinutes),
    carType: item.carType ?? "",
    workLocation: item.workLocation ?? "",
    signerName: item.signerName ?? "",
    vehicleIdentifier: item.vehicleIdentifier ?? "",
    workCode: item.workCode,
    customerStatus: item.customerStatus,
    billingStatus: item.billingStatus,
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
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [carTypeOptions, setCarTypeOptions] = useState<MasterOption[]>([]);
  const [workLocationOptions, setWorkLocationOptions] = useState<MasterOption[]>([]);
  const [workContentOptions, setWorkContentOptions] = useState<MasterOption[]>([]);
  const [isReferenceLoading, setIsReferenceLoading] = useState(true);
  const [referenceLoadError, setReferenceLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReferenceData() {
      setIsReferenceLoading(true);
      setReferenceLoadError(null);

      const [clientsResponse, carTypesResponse, workLocationsResponse, workContentsResponse] = await Promise.all([
        fetch("/api/clients", { cache: "no-store" }),
        fetch("/api/car-types", { cache: "no-store" }),
        fetch("/api/work-locations", { cache: "no-store" }),
        fetch("/api/work-contents", { cache: "no-store" }),
      ]);

      const [clientsJson, carTypesJson, workLocationsJson, workContentsJson] = await Promise.all([
        clientsResponse.json() as Promise<{ data?: { items?: ClientOption[] }; error?: { message?: string } | null }>,
        carTypesResponse.json() as Promise<{ data?: { items?: MasterOption[] }; error?: { message?: string } | null }>,
        workLocationsResponse.json() as Promise<{ data?: { items?: MasterOption[] }; error?: { message?: string } | null }>,
        workContentsResponse.json() as Promise<{ data?: { items?: MasterOption[] }; error?: { message?: string } | null }>,
      ]);

      if (cancelled) {
        return;
      }

      if (!clientsResponse.ok || !carTypesResponse.ok || !workLocationsResponse.ok || !workContentsResponse.ok) {
        setClientOptions([]);
        setCarTypeOptions([]);
        setWorkLocationOptions([]);
        setWorkContentOptions([]);
        setReferenceLoadError(
          clientsJson.error?.message
            ?? carTypesJson.error?.message
            ?? workLocationsJson.error?.message
            ?? workContentsJson.error?.message
            ?? "マスタ一覧の取得に失敗しました。",
        );
        setIsReferenceLoading(false);
        return;
      }

      setClientOptions(clientsJson.data?.items ?? []);
      setCarTypeOptions(carTypesJson.data?.items ?? []);
      setWorkLocationOptions(workLocationsJson.data?.items ?? []);
      setWorkContentOptions(workContentsJson.data?.items ?? []);
      setIsReferenceLoading(false);
    }

    void loadReferenceData();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedClient = useMemo(
    () => clientOptions.find((option) => option.code === fields.clientCode) ?? null,
    [clientOptions, fields.clientCode],
  );

  useEffect(() => {
    if (!selectedClient) {
      return;
    }

    if (fields.clientName !== selectedClient.name) {
      onFieldChange("clientName", selectedClient.name);
    }
  }, [fields.clientName, onFieldChange, selectedClient]);

  function handleClientSelection(value: string) {
    const nextClient = clientOptions.find((option) => option.code === value);

    onFieldChange("clientCode", value);
    onFieldChange("clientName", nextClient?.name ?? "");
  }

  const shouldShowFallbackOption =
    fields.clientCode !== "" && !clientOptions.some((option) => option.code === fields.clientCode) && fields.clientName !== "";

  const shouldShowCarTypeFallbackOption = fields.carType !== "" && !carTypeOptions.some((option) => option.name === fields.carType);
  const shouldShowWorkLocationFallbackOption = fields.workLocation !== "" && !workLocationOptions.some((option) => option.name === fields.workLocation);
  const shouldShowWorkContentFallbackOption = fields.workCode !== "" && !workContentOptions.some((option) => option.name === fields.workCode);
  const missingMasterLabels = [
    clientOptions.length === 0 ? "得意先" : null,
    carTypeOptions.length === 0 ? "車種" : null,
    workLocationOptions.length === 0 ? "作業場所" : null,
    workContentOptions.length === 0 ? "作業内容" : null,
  ].filter((value): value is string => value !== null);
  const isReferenceReady =
    clientOptions.length > 0 && carTypeOptions.length > 0 && workLocationOptions.length > 0 && workContentOptions.length > 0;

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
              請求処理
              <select
                value={fields.billingStatus}
                onChange={(event) => onFieldChange("billingStatus", event.target.value)}
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              >
                <option value="unprocessed">未</option>
                <option value="processed">済</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              得意先コード
              <input
                type="text"
                value={fields.clientCode}
                readOnly
                required
                className="h-12 rounded-2xl border border-black/10 bg-[#f8f5f0] px-4 outline-none"
                placeholder="得意先を選択すると自動入力されます"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              得意先名
              <select
                value={fields.clientCode}
                onChange={(event) => handleClientSelection(event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                disabled={isReferenceLoading || clientOptions.length === 0}
              >
                <option value="">得意先を選択してください</option>
                {shouldShowFallbackOption ? (
                  <option value={fields.clientCode}>{fields.clientName} ({fields.clientCode})</option>
                ) : null}
                {clientOptions.map((option) => (
                  <option key={option.id} value={option.code}>
                    {option.name} ({option.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              車種
              <select
                value={fields.carType}
                onChange={(event) => onFieldChange("carType", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                disabled={isReferenceLoading || carTypeOptions.length === 0}
              >
                <option value="">車種を選択してください</option>
                {shouldShowCarTypeFallbackOption ? <option value={fields.carType}>{fields.carType}</option> : null}
                {carTypeOptions.map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              購入者
              <input
                type="text"
                value={fields.purchaser}
                onChange={(event) => onFieldChange("purchaser", event.target.value)}
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="客名欄に表示する購入者名"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              作業場所
              <select
                value={fields.workLocation}
                onChange={(event) => onFieldChange("workLocation", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                disabled={isReferenceLoading || workLocationOptions.length === 0}
              >
                <option value="">作業場所を選択してください</option>
                {shouldShowWorkLocationFallbackOption ? <option value={fields.workLocation}>{fields.workLocation}</option> : null}
                {workLocationOptions.map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              登録番号または車体番号
              <input
                type="text"
                value={fields.vehicleIdentifier}
                onChange={(event) => onFieldChange("vehicleIdentifier", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="品川500あ12-34"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              作業内容
              <select
                value={fields.workCode}
                onChange={(event) => onFieldChange("workCode", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                disabled={isReferenceLoading || workContentOptions.length === 0}
              >
                <option value="">作業内容を選択してください</option>
                {shouldShowWorkContentFallbackOption ? <option value={fields.workCode}>{fields.workCode}</option> : null}
                {workContentOptions.map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
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
              担当者(サイン)
              <input
                type="text"
                value={fields.signerName}
                onChange={(event) => onFieldChange("signerName", event.target.value)}
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="山田 太郎"
              />
            </label>

            <label className="hidden flex flex-col gap-2 text-sm text-(--ink-soft)">
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

            <label className="hidden flex flex-col gap-2 text-sm text-(--ink-soft)">
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

            <label className="hidden flex flex-col gap-2 text-sm text-(--ink-soft)">
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

            <label className="hidden flex flex-col gap-2 text-sm text-(--ink-soft)">
              基準分
              <input
                type="number"
                min="0"
                value={fields.standardMinutes}
                onChange={(event) => onFieldChange("standardMinutes", event.target.value)}
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
              />
            </label>

            <label className="hidden flex flex-col gap-2 text-sm text-(--ink-soft)">
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

            {referenceLoadError ? (
              <div className="md:col-span-2 rounded-2xl border border-[#e7b4ab] bg-[#fff3f0] px-4 py-4 text-sm text-[#8e2c18]">
                {referenceLoadError}
              </div>
            ) : null}

            {!isReferenceLoading && missingMasterLabels.length > 0 ? (
              <div className="md:col-span-2 rounded-2xl border border-[#ead9bf] bg-[#fff9ee] px-4 py-4 text-sm text-[#7b5a1c]">
                登録済みマスタが不足しています。先に {missingMasterLabels.join("、")} を登録してください。
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={isPending || isReferenceLoading || !isReferenceReady || fields.clientCode === ""}
                className="inline-flex h-12 items-center justify-center rounded-full bg-(--accent-strong) px-6 text-sm font-semibold text-white transition hover:bg-(--accent-deep) disabled:opacity-70"
              >
                {isPending ? "送信中..." : submitLabel}
              </button>
              <Link
                href="/clients/new"
                className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
              >
                得意先を追加
              </Link>
              <Link
                href="/car-types/new"
                className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
              >
                車種を追加
              </Link>
              <Link
                href="/work-locations/new"
                className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
              >
                作業場所を追加
              </Link>
              <Link
                href="/work-contents/new"
                className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
              >
                作業内容を追加
              </Link>
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