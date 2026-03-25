"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AuthenticatedAdministrator } from "@/lib/auth";
import type { ReportMasterConfig } from "@/lib/report-masters";
import {
  ReportMasterForm,
  createReportMasterPayload,
  initialReportMasterFieldState,
  type ReportMasterFieldState,
} from "@/app/report-masters/report-master-form";

export function ReportMasterCreateForm({
  administrator,
  config,
}: {
  administrator: AuthenticatedAdministrator;
  config: ReportMasterConfig;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<ReportMasterFieldState>(initialReportMasterFieldState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function updateField(name: keyof ReportMasterFieldState, value: string) {
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
      const response = await fetch(config.apiPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createReportMasterPayload(fields)),
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
        setErrorMessage(json.error?.message ?? `${config.singularLabel}の登録に失敗しました。`);
        setValidationDetails(json.error?.details ?? []);
        return;
      }

      router.push(`${config.path}?status=created`);
      router.refresh();
    });
  }

  return (
    <ReportMasterForm
      administrator={administrator}
      config={config}
      title={config.createTitle}
      submitLabel={config.createSubmitLabel}
      isPending={isPending}
      fields={fields}
      errorMessage={errorMessage}
      validationDetails={validationDetails}
      onFieldChange={updateField}
      onSubmit={handleSubmit}
    />
  );
}