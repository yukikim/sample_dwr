import Link from "next/link";

import { ResetPasswordForm } from "@/app/reset-password/[token]/reset-password-form";
import { getCurrentAdministrator } from "@/lib/auth";
import { getPasswordResetTokenStatus } from "@/lib/password-reset";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function ResetPasswordTokenPage({ params }: PageProps) {
  const administrator = await getCurrentAdministrator();

  if (administrator) {
    redirect("/dashboard");
  }

  const { token } = await params;
  const status = await getPasswordResetTokenStatus(token);

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10 lg:px-14">
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center">
        <section className="w-full rounded-4xl border border-white/60 bg-white/88 p-8 shadow-[0_24px_80px_rgba(76,47,33,0.10)] backdrop-blur sm:p-10">
          <div className="mb-8 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-(--ink-muted)">Reset Password</p>
            <h1 className="text-3xl font-semibold tracking-tight">新しいパスワードを設定</h1>
            {status.valid ? (
              <p className="text-sm leading-7 text-(--ink-soft)">
                {status.administratorName} / {status.administratorEmail} のパスワードを更新します。
              </p>
            ) : (
              <p className="text-sm leading-7 text-(--ink-soft)">
                再設定リンクは無効か、有効期限切れです。もう一度再設定をやり直してください。
              </p>
            )}
          </div>

          {status.valid ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="space-y-5">
              <p className="rounded-2xl border border-[#e7b4ab] bg-[#fff3f0] px-4 py-3 text-sm text-[#8e2c18]">
                このリンクではパスワードを更新できません。
              </p>
              <div className="flex justify-between">
                <Link href="/forgot-password" className="text-sm font-medium text-(--accent-strong) transition hover:text-(--accent-deep)">
                  再設定をやり直す
                </Link>
                <Link href="/" className="text-sm font-medium text-(--ink-muted) transition hover:text-(--ink)">
                  ログインへ戻る
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}