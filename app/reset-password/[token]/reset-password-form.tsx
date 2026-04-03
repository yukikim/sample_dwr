"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { resetPasswordAction, type ResetPasswordActionState } from "@/app/actions/auth";

const initialState: ResetPasswordActionState = {
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex h-12 items-center justify-center rounded-full bg-(--accent-strong) px-6 text-sm font-semibold text-white transition hover:bg-(--accent-deep) disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? "更新中..." : "パスワードを更新"}
    </button>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      <label className="flex flex-col gap-2 text-sm font-medium text-(--ink-soft)">
        新しいパスワード
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-base text-(--ink) outline-none transition focus:border-(--accent-strong) focus:ring-4 focus:ring-[rgba(180,76,58,0.12)]"
          placeholder="8文字以上で入力"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-(--ink-soft)">
        新しいパスワード(確認)
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-base text-(--ink) outline-none transition focus:border-(--accent-strong) focus:ring-4 focus:ring-[rgba(180,76,58,0.12)]"
          placeholder="確認のため再入力"
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-[#e7b4ab] bg-[#fff3f0] px-4 py-3 text-sm text-[#8e2c18]">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}