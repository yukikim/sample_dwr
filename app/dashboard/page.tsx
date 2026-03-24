import { logoutAction } from "@/app/actions/auth";
import { getCurrentAdministrator } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-4xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-muted)">
              Polish-DWR
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">管理ダッシュボード</h1>
            <p className="text-sm text-(--ink-soft)">
              ログイン中: {administrator.name} / {administrator.email}
            </p>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              ログアウト
            </button>
          </form>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-6 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
            <p className="text-sm text-(--ink-muted)">認証状態</p>
            <p className="mt-3 text-2xl font-semibold">有効</p>
            <p className="mt-2 text-sm text-(--ink-soft)">管理者セッションが確立されています。</p>
          </article>

          <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-6 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
            <p className="text-sm text-(--ink-muted)">次の実装候補</p>
            <p className="mt-3 text-2xl font-semibold">日報 CRUD</p>
            <p className="mt-2 text-sm text-(--ink-soft)">認証後の登録・一覧画面をここから接続できます。</p>
          </article>

          <article className="rounded-[1.75rem] border border-white/60 bg-white/85 p-6 shadow-[0_14px_40px_rgba(76,47,33,0.08)]">
            <p className="text-sm text-(--ink-muted)">DB 接続</p>
            <p className="mt-3 text-2xl font-semibold">Prisma</p>
            <p className="mt-2 text-sm text-(--ink-soft)">認証処理は prisma.ts 経由の PostgreSQL 接続を利用しています。</p>
          </article>
        </section>
      </div>
    </main>
  );
}