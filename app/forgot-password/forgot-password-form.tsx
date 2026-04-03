"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { forgotPasswordAction, type ForgotPasswordActionState } from "@/app/actions/auth";

const initialState: ForgotPasswordActionState = {
  error: null,
  success: null,
  developmentResetUrl: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex h-12 items-center justify-center rounded-full bg-(--accent-strong) px-6 text-sm font-semibold text-white transition hover:bg-(--accent-deep) disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? "送信中..." : "再設定案内を送る"}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm font-medium text-(--ink-soft)">
        メールアドレス
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-base text-(--ink) outline-none transition focus:border-(--accent-strong) focus:ring-4 focus:ring-[rgba(180,76,58,0.12)]"
          placeholder="admin@example.com"
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-[#e7b4ab] bg-[#fff3f0] px-4 py-3 text-sm text-[#8e2c18]">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <div className="rounded-2xl border border-[#bfd9c7] bg-[#eef9f1] px-4 py-3 text-sm text-[#1f5d35]">
          <p>{state.success}</p>
          {state.developmentResetUrl ? (
            <p className="mt-2 break-all">
              開発環境用リンク: <a href={state.developmentResetUrl} className="font-medium underline">{state.developmentResetUrl}</a>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4 pt-2">
        <Link href="/" className="text-sm font-medium text-(--ink-muted) transition hover:text-(--ink)">
          ログインへ戻る
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}