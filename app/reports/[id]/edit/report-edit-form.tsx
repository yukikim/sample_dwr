"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AuthenticatedAdministrator } from "@/lib/auth";
import {
  createReportPayload,
  initialReportFieldState,
  ReportForm,
  reportFieldsFromItem,
  type ReportFieldState,
} from "@/app/reports/report-form";

type ReportItemResponse = {
  data: {
    item: {
      id: string;
      workDate: string;
      clientCode: string;
      clientName: string;
      purchaser: string | null;
      workMinutes: number;
      laborMinutes: number;
      travelMinutes: number;
      carType: string | null;
      workLocation: string | null;
      signerName: string | null;
      vehicleIdentifier: string | null;
      workCode: string;
      customerStatus: string;
      billingStatus: string;
      unitCount: number;
      salesAmount: number;
      standardMinutes: number | null;
      points: number | null;
      remarks: string | null;
    };
  };
  error: {
    message: string;
    details?: string[];
  } | null;
};

export function ReportEditForm({
  administrator,
  reportId,
}: {
  administrator: AuthenticatedAdministrator;
  reportId: string;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<ReportFieldState>(initialReportFieldState);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch(`/api/reports/${reportId}`, { cache: "no-store" });
      const json = (await response.json()) as ReportItemResponse;

      if (cancelled) {
        return;
      }

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (response.status === 404) {
        router.push("/reports?status=missing");
        return;
      }

      if (!response.ok) {
        setErrorMessage(json.error?.message ?? "日報の取得に失敗しました。");
        setIsLoading(false);
        return;
      }

      setFields(reportFieldsFromItem(json.data.item));
      setIsLoading(false);
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [reportId, router]);

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
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createReportPayload(fields)),
      });
      const json = (await response.json()) as ReportItemResponse;

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (response.status === 404) {
        router.push("/reports?status=missing");
        return;
      }

      if (!response.ok) {
        setErrorMessage(json.error?.message ?? "日報の更新に失敗しました。");
        setValidationDetails(json.error?.details ?? []);
        return;
      }

      router.push("/reports?status=updated");
      router.refresh();
    });
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7efe2,#f3e3ce_35%,#efe6db_70%,#f8f4ef_100%)] px-6 py-8 text-(--ink) sm:px-10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-4xl border border-white/60 bg-white/88 p-10 shadow-[0_20px_60px_rgba(76,47,33,0.10)]">
          <p className="text-sm text-(--ink-soft)">日報データを読み込んでいます...</p>
        </div>
      </main>
    );
  }

  return (
    <ReportForm
      administrator={administrator}
      title="日報を編集"
      eyebrow="Edit Daily Work Report"
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