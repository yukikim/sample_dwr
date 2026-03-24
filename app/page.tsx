import { LoginForm } from "@/app/login-form";
import { getCurrentAdministrator } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const administrator = await getCurrentAdministrator();

  if (administrator) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_#f7efe2,_#f3e3ce_35%,_#efe6db_70%,_#f8f4ef_100%)] px-6 py-8 text-[var(--ink)] sm:px-10 lg:px-14">
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 lg:grid-cols-[1.2fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[2.25rem] border border-white/60 bg-[linear-gradient(145deg,_rgba(255,255,255,0.82),_rgba(255,247,239,0.92))] p-8 shadow-[0_24px_80px_rgba(76,47,33,0.12)] sm:p-12">
          <div className="absolute -top-16 right-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(180,76,58,0.28),_rgba(180,76,58,0))] blur-2xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,_rgba(31,114,102,0.18),_rgba(31,114,102,0))] blur-2xl" />

          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <p className="inline-flex rounded-full border border-[var(--line-strong)] bg-white/75 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                Daily Work Report
              </p>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  業務日報の入力、検索、集計を
                  <span className="block text-[var(--accent-strong)]">管理者専用で一元化する。</span>
                </h1>
                <p className="max-w-xl text-base leading-8 text-[var(--ink-soft)] sm:text-lg">
                  Polish-DWR は、日々の実績入力から期間検索、集計確認、PDF 出力までを扱う管理者向け業務日報アプリです。
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/75 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                  Secure Login
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                  prisma.ts を利用した管理者認証。
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/70 bg-white/75 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                  Searchable Data
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                  期間や得意先条件で日報を横断検索。
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/70 bg-white/75 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                  Export Ready
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                  集計結果を PDF 出力へ接続可能。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[2rem] border border-white/60 bg-white/88 p-8 shadow-[0_24px_80px_rgba(76,47,33,0.10)] backdrop-blur sm:p-10">
            <div className="mb-8 space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                Administrator Login
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">管理者ログイン</h2>
              <p className="text-sm leading-7 text-[var(--ink-soft)]">
                登録済みの管理者アカウントでログインしてください。認証後は管理ダッシュボードへ遷移します。
              </p>
            </div>

            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
