"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AuthenticatedAdministrator } from "@/lib/auth";
import { ClientForm, clientFieldsFromItem, createClientPayload, initialClientFieldState, type ClientFieldState } from "@/app/clients/client-form";

type ClientItemResponse = {
  data: {
    item: {
      id: string;
      code: string;
      name: string;
      address: string;
      contactTel: string;
      contactEmail: string;
      contactPerson: string;
      remarks: string | null;
    };
  };
  error: {
    message: string;
    details?: string[];
  } | null;
};

export function ClientEditForm({
  administrator,
  clientId,
}: {
  administrator: AuthenticatedAdministrator;
  clientId: string;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<ClientFieldState>(initialClientFieldState);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadClient() {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch(`/api/clients/${clientId}`, { cache: "no-store" });
      const json = (await response.json()) as ClientItemResponse;

      if (cancelled) {
        return;
      }

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (response.status === 404) {
        router.push("/clients?status=missing");
        return;
      }

      if (!response.ok) {
        setErrorMessage(json.error?.message ?? "得意先の取得に失敗しました。");
        setIsLoading(false);
        return;
      }

      setFields(clientFieldsFromItem(json.data.item));
      setIsLoading(false);
    }

    void loadClient();

    return () => {
      cancelled = true;
    };
  }, [clientId, router]);

  function updateField(name: keyof ClientFieldState, value: string) {
    setFields((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setValidationDetails([]);

    startTransition(async () => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createClientPayload(fields)),
      });
      const json = (await response.json()) as ClientItemResponse;

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (response.status === 404) {
        router.push("/clients?status=missing");
        return;
      }

      if (!response.ok) {
        setErrorMessage(json.error?.message ?? "得意先の更新に失敗しました。");
        setValidationDetails(json.error?.details ?? []);
        return;
      }

      router.push("/clients?status=updated");
      router.refresh();
    });
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-4xl border border-white/60 bg-white/88 p-10 shadow-[0_20px_60px_rgba(76,47,33,0.10)]">
          <p className="text-sm text-(--ink-soft)">得意先データを読み込んでいます...</p>
        </div>
      </main>
    );
  }

  return (
    <ClientForm
      administrator={administrator}
      title="得意先を編集"
      eyebrow="Edit Client"
      submitLabel="更新する"
      isPending={isPending}
      fields={fields}
      errorMessage={errorMessage}
      validationDetails={validationDetails}
      onFieldChange={updateField}
      onSubmit={handleSubmit}
    />
  );
}