"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AuthenticatedAdministrator } from "@/lib/auth";
import type { ReportMasterConfig } from "@/lib/report-masters";
import {
  ReportMasterForm,
  createReportMasterPayload,
  initialReportMasterFieldState,
  reportMasterFieldsFromItem,
  type ReportMasterFieldState,
} from "@/app/report-masters/report-master-form";

type ReportMasterItemResponse = {
  data: {
    item: {
      id: string;
      name: string;
      remarks: string | null;
    };
  };
  error: {
    message: string;
    details?: string[];
  } | null;
};

export function ReportMasterEditForm({
  administrator,
  config,
  itemId,
}: {
  administrator: AuthenticatedAdministrator;
  config: ReportMasterConfig;
  itemId: string;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<ReportMasterFieldState>(initialReportMasterFieldState);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadItem() {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch(`${config.apiPath}/${itemId}`, { cache: "no-store" });
      const json = (await response.json()) as ReportMasterItemResponse;

      if (cancelled) {
        return;
      }

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (response.status === 404) {
        router.push(`${config.path}?status=missing`);
        return;
      }

      if (!response.ok) {
        setErrorMessage(json.error?.message ?? `${config.singularLabel}の取得に失敗しました。`);
        setIsLoading(false);
        return;
      }

      setFields(reportMasterFieldsFromItem(json.data.item));
      setIsLoading(false);
    }

    void loadItem();

    return () => {
      cancelled = true;
    };
  }, [config, itemId, router]);

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
      const response = await fetch(`${config.apiPath}/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createReportMasterPayload(fields)),
      });
      const json = (await response.json()) as ReportMasterItemResponse;

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (response.status === 404) {
        router.push(`${config.path}?status=missing`);
        return;
      }

      if (!response.ok) {
        setErrorMessage(json.error?.message ?? `${config.singularLabel}の更新に失敗しました。`);
        setValidationDetails(json.error?.details ?? []);
        return;
      }

      router.push(`${config.path}?status=updated`);
      router.refresh();
    });
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-4xl border border-white/60 bg-white/88 p-10 shadow-[0_20px_60px_rgba(76,47,33,0.10)]">
          <p className="text-sm text-(--ink-soft)">{config.singularLabel}データを読み込んでいます...</p>
        </div>
      </main>
    );
  }

  return (
    <ReportMasterForm
      administrator={administrator}
      config={config}
      title={config.editTitle}
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