"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction } from "@/app/actions/auth";

const initialState = {
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent-strong)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? "認証中..." : "ログイン"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink-soft)]">
        メールアドレス
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-base text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[color:rgba(180,76,58,0.12)]"
          placeholder="admin@example.com"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink-soft)]">
        パスワード
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-base text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)] focus:ring-4 focus:ring-[color:rgba(180,76,58,0.12)]"
          placeholder="********"
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-[#e7b4ab] bg-[#fff3f0] px-4 py-3 text-sm text-[#8e2c18]">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-sm text-[var(--ink-muted)]">
          初期管理者は seed で投入したアカウントを利用します。
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}