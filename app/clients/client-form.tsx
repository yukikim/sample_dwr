"use client";

import Link from "next/link";

import type { AuthenticatedAdministrator } from "@/lib/auth";

export type ClientFieldState = {
  code: string;
  name: string;
  address: string;
  contactTel: string;
  contactEmail: string;
  contactPerson: string;
  remarks: string;
};

export const initialClientFieldState: ClientFieldState = {
  code: "",
  name: "",
  address: "",
  contactTel: "",
  contactEmail: "",
  contactPerson: "",
  remarks: "",
};

export function createClientPayload(fields: ClientFieldState) {
  return {
    ...fields,
    remarks: fields.remarks === "" ? null : fields.remarks,
  };
}

export function clientFieldsFromItem(item: {
  code: string;
  name: string;
  address: string;
  contactTel: string;
  contactEmail: string;
  contactPerson: string;
  remarks: string | null;
}): ClientFieldState {
  return {
    code: item.code,
    name: item.name,
    address: item.address,
    contactTel: item.contactTel,
    contactEmail: item.contactEmail,
    contactPerson: item.contactPerson,
    remarks: item.remarks ?? "",
  };
}

type ClientFormProps = {
  administrator: AuthenticatedAdministrator;
  title: string;
  eyebrow: string;
  submitLabel: string;
  isPending: boolean;
  fields: ClientFieldState;
  errorMessage: string | null;
  validationDetails: string[];
  onFieldChange: (name: keyof ClientFieldState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function ClientForm({
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
}: ClientFormProps) {
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
              href="/clients"
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              得意先一覧へ戻る
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
              得意先コード
              <input
                type="text"
                value={fields.code}
                onChange={(event) => onFieldChange("code", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="C001"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              名称
              <input
                type="text"
                value={fields.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="株式会社サンプル"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft) md:col-span-2">
              住所
              <input
                type="text"
                value={fields.address}
                onChange={(event) => onFieldChange("address", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="千葉県印西市..."
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              連絡先TEL
              <input
                type="text"
                value={fields.contactTel}
                onChange={(event) => onFieldChange("contactTel", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="0476-00-0000"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              連絡先Email
              <input
                type="email"
                value={fields.contactEmail}
                onChange={(event) => onFieldChange("contactEmail", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="client@example.com"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
              担当者
              <input
                type="text"
                value={fields.contactPerson}
                onChange={(event) => onFieldChange("contactPerson", event.target.value)}
                required
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                placeholder="山田 太郎"
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
                href="/clients"
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