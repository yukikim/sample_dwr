"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AuthenticatedAdministrator } from "@/lib/auth";
import { ClientForm, createClientPayload, initialClientFieldState, type ClientFieldState } from "@/app/clients/client-form";

export function ClientCreateForm({ administrator }: { administrator: AuthenticatedAdministrator }) {
  const router = useRouter();
  const [fields, setFields] = useState<ClientFieldState>(initialClientFieldState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

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
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createClientPayload(fields)),
      });
      const json = (await response.json()) as {
        error: {
          message: string;
          details?: string[];
        } | null;
      };

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        setErrorMessage(json.error?.message ?? "得意先の登録に失敗しました。");
        setValidationDetails(json.error?.details ?? []);
        return;
      }

      router.push("/clients?status=created");
      router.refresh();
    });
  }

  return (
    <ClientForm
      administrator={administrator}
      title="得意先を新規登録"
      eyebrow="Create Client"
      submitLabel="得意先を登録する"
      isPending={isPending}
      fields={fields}
      errorMessage={errorMessage}
      validationDetails={validationDetails}
      onFieldChange={updateField}
      onSubmit={handleSubmit}
    />
  );
}