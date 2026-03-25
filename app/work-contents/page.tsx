import { redirect } from "next/navigation";

import { ReportMastersPageClient } from "@/app/report-masters/report-masters-page-client";
import { getCurrentAdministrator } from "@/lib/auth";
import { workContentMasterConfig } from "@/lib/report-masters";

export default async function WorkContentsPage() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  return <ReportMastersPageClient administrator={administrator} config={workContentMasterConfig} />;
}