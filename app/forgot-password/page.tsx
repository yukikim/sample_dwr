import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";
import { getCurrentAdministrator } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage() {
  const administrator = await getCurrentAdministrator();

  if (administrator) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10 lg:px-14">
      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[2.25rem] border border-white/60 bg-[linear-gradient(145deg,_rgba(255,255,255,0.82),_rgba(255,247,239,0.92))] p-8 shadow-[0_24px_80px_rgba(76,47,33,0.12)] sm:p-12">
          <div className="absolute -top-16 right-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(180,76,58,0.28),_rgba(180,76,58,0))] blur-2xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,_rgba(31,114,102,0.18),_rgba(31,114,102,0))] blur-2xl" />

          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="space-y-6">
              <p className="inline-flex rounded-full border border-(--line-strong) bg-white/75 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-(--ink-muted)">
                Password Reset
              </p>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  メールアドレス宛てに
                  <span className="block text-(--accent-strong)">再設定リンクを発行する。</span>
                </h1>
                <p className="max-w-xl text-base leading-8 text-(--ink-soft) sm:text-lg">
                  登録済みの管理者メールアドレスを入力すると、再設定フォームへ進むための一時リンクを発行します。
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/75 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--ink-muted)">One-Time Link</p>
                <p className="mt-2 text-sm leading-7 text-(--ink-soft)">再設定リンクは一度だけ使用でき、1時間で失効します。</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/70 bg-white/75 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--ink-muted)">Session Safety</p>
                <p className="mt-2 text-sm leading-7 text-(--ink-soft)">再設定後は古いセッションを無効化し、既存ログインを継続利用できないようにします。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[2rem] border border-white/60 bg-white/88 p-8 shadow-[0_24px_80px_rgba(76,47,33,0.10)] backdrop-blur sm:p-10">
            <div className="mb-8 space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-(--ink-muted)">Forgot Password</p>
              <h2 className="text-3xl font-semibold tracking-tight">パスワード再設定</h2>
              <p className="text-sm leading-7 text-(--ink-soft)">メール送信設定がない開発環境では、再設定リンクをこの画面に表示します。</p>
            </div>

            <ForgotPasswordForm />
          </div>
        </section>
      </div>
    </main>
  );
}