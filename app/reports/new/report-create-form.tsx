"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AuthenticatedAdministrator } from "@/lib/auth";
import {
  createReportPayload,
  initialReportFieldState,
  ReportForm,
  type ReportFieldState,
} from "@/app/reports/report-form";

export function ReportCreateForm({ administrator }: { administrator: AuthenticatedAdministrator }) {
  const router = useRouter();
  const [fields, setFields] = useState<ReportFieldState>(initialReportFieldState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function updateField(name: keyof ReportFieldState, value: string) {
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
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createReportPayload(fields)),
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
        setErrorMessage(json.error?.message ?? "日報の登録に失敗しました。");
        setValidationDetails(json.error?.details ?? []);
        return;
      }

      router.push("/reports?status=created");
      router.refresh();
    });
  }

  return (
    <ReportForm
      administrator={administrator}
      title="日報を新規登録"
      eyebrow="Create Daily Work Report"
      submitLabel="日報を登録する"
      isPending={isPending}
      fields={fields}
      errorMessage={errorMessage}
      validationDetails={validationDetails}
      onFieldChange={updateField}
      onSubmit={handleSubmit}
    />
  );
}