"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AuthenticatedAdministrator } from "@/lib/auth";

type AdministratorItem = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type AdministratorsResponse = {
  data: {
    items?: AdministratorItem[];
    item?: AdministratorItem;
  };
  error: {
    code: string;
    message: string;
    details?: string[];
  } | null;
};

type FormState = {
  name: string;
  email: string;
  password: string;
};

type EditFormState = {
  name: string;
  email: string;
  password: string;
};

const initialFormState: FormState = {
  name: "",
  email: "",
  password: "",
};

const initialEditFormState: EditFormState = {
  name: "",
  email: "",
  password: "",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(isActive: boolean) {
  return isActive ? "有効" : "無効";
}

export function AdministratorsPageClient({ administrator }: { administrator: AuthenticatedAdministrator }) {
  const router = useRouter();
  const [items, setItems] = useState<AdministratorItem[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(initialEditFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAdministrators() {
      setIsLoading(true);

      const response = await fetch("/api/administrators", { cache: "no-store" });
      const json = (await response.json()) as AdministratorsResponse;

      if (cancelled) {
        return;
      }

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        setItems([]);
        setErrorMessage(json.error?.message ?? "管理者一覧の取得に失敗しました。");
        setIsLoading(false);
        return;
      }

      setItems(json.data.items ?? []);
      setIsLoading(false);
    }

    void loadAdministrators();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateEditField(name: keyof EditFormState, value: string) {
    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function startEditing(item: AdministratorItem) {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      email: item.email,
      password: "",
    });
    setErrorMessage(null);
    setValidationDetails([]);
    setSuccessMessage(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm(initialEditFormState);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setValidationDetails([]);
    setSuccessMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/administrators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const json = (await response.json()) as AdministratorsResponse;

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        setErrorMessage(json.error?.message ?? "管理者の追加に失敗しました。");
        setValidationDetails(json.error?.details ?? []);
        return;
      }

      const createdItem = json.data.item;

      setItems((current) => (createdItem ? [createdItem, ...current] : current));
      setForm(initialFormState);
      setSuccessMessage("管理者を追加しました。");
    });
  }

  function handleUpdate(itemId: string) {
    setErrorMessage(null);
    setValidationDetails([]);
    setSuccessMessage(null);
    setSavingId(itemId);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/administrators/${itemId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editForm),
        });
        const json = (await response.json()) as AdministratorsResponse;

        if (response.status === 401) {
          router.push("/");
          return;
        }

        if (!response.ok) {
          setErrorMessage(json.error?.message ?? "管理者の更新に失敗しました。");
          setValidationDetails(json.error?.details ?? []);
          return;
        }

        const updatedItem = json.data.item;

        setItems((current) => current.map((item) => (item.id === itemId && updatedItem ? updatedItem : item)));
        setEditingId(null);
        setEditForm(initialEditFormState);
        setSuccessMessage("管理者情報を更新しました。");
      } finally {
        setSavingId(null);
      }
    });
  }

  function handleToggleActive(item: AdministratorItem) {
    const nextIsActive = !item.isActive;
    const message = nextIsActive
      ? `${item.name} を再有効化します。`
      : `${item.name} を無効化します。ログインできなくなります。`;

    if (!window.confirm(message)) {
      return;
    }

    setErrorMessage(null);
    setValidationDetails([]);
    setSuccessMessage(null);
    setTogglingId(item.id);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/administrators/${item.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive: nextIsActive }),
        });
        const json = (await response.json()) as AdministratorsResponse;

        if (response.status === 401) {
          router.push("/");
          return;
        }

        if (!response.ok) {
          setErrorMessage(json.error?.message ?? "管理者状態の更新に失敗しました。");
          setValidationDetails(json.error?.details ?? []);
          return;
        }

        const updatedItem = json.data.item;

        setItems((current) => current.map((currentItem) => (currentItem.id === item.id && updatedItem ? updatedItem : currentItem)));

        if (editingId === item.id) {
          cancelEditing();
        }

        setSuccessMessage(nextIsActive ? "管理者を再有効化しました。" : "管理者を無効化しました。");
      } finally {
        setTogglingId(null);
      }
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-4xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--ink-muted)">Administrator Management</p>
            <h1 className="text-3xl font-semibold tracking-tight">管理者管理</h1>
            <p className="text-sm text-(--ink-soft)">
              操作者: {administrator.name} / {administrator.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              ダッシュボードへ戻る
            </Link>
            <Link
              href="/reports"
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
            >
              日報一覧へ
            </Link>
          </div>
        </header>

        {successMessage ? (
          <section className="rounded-3xl border border-[#bfd9c7] bg-[#eef9f1] px-5 py-4 text-sm text-[#1f5d35] shadow-[0_10px_30px_rgba(31,93,53,0.08)]">
            {successMessage}
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.25fr]">
          <section className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] sm:p-8">
            <div className="mb-6 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">新規管理者を追加</h2>
              <p className="text-sm text-(--ink-soft)">
                名前、メールアドレス、パスワードを入力して新しい管理者アカウントを発行します。
              </p>
            </div>

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
                名前
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                  className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                  placeholder="Sub Admin"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
                メールアドレス
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                  className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                  placeholder="sub-admin@example.com"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-(--ink-soft)">
                パスワード
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  required
                  minLength={8}
                  className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                  placeholder="8文字以上で入力"
                />
              </label>

              {errorMessage ? (
                <div className="rounded-2xl border border-[#e7b4ab] bg-[#fff3f0] px-4 py-4 text-sm text-[#8e2c18]">
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

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-(--accent-strong) px-6 text-sm font-semibold text-white transition hover:bg-(--accent-deep) disabled:opacity-70"
                >
                  {isPending ? "登録中..." : "管理者を追加する"}
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
                >
                  キャンセル
                </Link>
              </div>
            </form>
          </section>

          <section className="rounded-4xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_60px_rgba(76,47,33,0.10)] sm:p-8">
            <div className="mb-6 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">登録済み管理者</h2>
              <p className="text-sm text-(--ink-soft)">管理者の編集と有効/無効の切り替えを行えます。</p>
            </div>

            {isLoading ? (
              <div className="rounded-3xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-(--ink-soft)">
                管理者一覧を読み込んでいます...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-(--ink-soft)">
                管理者はまだ登録されていません。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-sm text-(--ink-muted)">
                      <th className="px-4 py-2">名前</th>
                      <th className="px-4 py-2">メールアドレス</th>
                      <th className="px-4 py-2">状態</th>
                      <th className="px-4 py-2">更新日時</th>
                      <th className="px-4 py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="bg-[#fffdf9] shadow-[0_12px_30px_rgba(76,47,33,0.06)]">
                        <td className="rounded-l-3xl px-4 py-4 text-sm font-medium">
                          {editingId === item.id ? (
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(event) => updateEditField("name", event.target.value)}
                              className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                            />
                          ) : (
                            item.name
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-(--ink-soft)">
                          {editingId === item.id ? (
                            <div className="space-y-3">
                              <input
                                type="email"
                                value={editForm.email}
                                onChange={(event) => updateEditField("email", event.target.value)}
                                className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                              />
                              <input
                                type="password"
                                value={editForm.password}
                                onChange={(event) => updateEditField("password", event.target.value)}
                                className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-(--accent-strong)"
                                placeholder="変更時のみ 8 文字以上で入力"
                              />
                            </div>
                          ) : (
                            item.email
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              item.isActive ? "bg-[#eef9f1] text-[#1f5d35]" : "bg-[#fff3f0] text-[#8e2c18]"
                            }`}
                          >
                            {getStatusLabel(item.isActive)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-(--ink-soft)">{formatDateTime(item.updatedAt)}</td>
                        <td className="rounded-r-3xl px-4 py-4 text-sm">
                          <div className="flex flex-wrap gap-2">
                            {editingId === item.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdate(item.id)}
                                  disabled={savingId === item.id || isPending}
                                  className="inline-flex h-10 items-center justify-center rounded-full bg-(--accent-strong) px-4 text-sm font-semibold text-white transition hover:bg-(--accent-deep) disabled:opacity-60"
                                >
                                  {savingId === item.id ? "保存中..." : "保存"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
                                >
                                  キャンセル
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditing(item)}
                                  className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-(--ink) transition hover:border-black/20 hover:bg-black/3"
                                >
                                  編集
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(item)}
                                  disabled={togglingId === item.id || isPending || administrator.id === item.id}
                                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition disabled:opacity-60 ${
                                    item.isActive
                                      ? "border border-[#e7b4ab] bg-[#fff3f0] text-[#8e2c18] hover:bg-[#ffe5de]"
                                      : "border border-[#bfd9c7] bg-[#eef9f1] text-[#1f5d35] hover:bg-[#e3f4e8]"
                                  }`}
                                >
                                  {togglingId === item.id ? "更新中..." : item.isActive ? "無効化" : "再有効化"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}