import Link from "next/link";

export default function ResetPasswordSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10 lg:px-14">
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center">
        <section className="w-full rounded-4xl border border-white/60 bg-white/88 p-8 shadow-[0_24px_80px_rgba(76,47,33,0.10)] backdrop-blur sm:p-10">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-(--ink-muted)">Password Reset Complete</p>
            <h1 className="text-3xl font-semibold tracking-tight">パスワードを更新しました</h1>
            <p className="text-sm leading-7 text-(--ink-soft)">
              新しいパスワードでログインしてください。古いログインセッションは無効化されています。
            </p>
          </div>

          <div className="mt-8 flex justify-end">
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full bg-(--accent-strong) px-6 text-sm font-semibold text-white transition hover:bg-(--accent-deep)"
            >
              ログインへ戻る
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}