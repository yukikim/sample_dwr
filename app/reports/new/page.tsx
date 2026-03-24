import { getCurrentAdministrator } from "@/lib/auth";
import { redirect } from "next/navigation";

import { ReportCreateForm } from "@/app/reports/new/report-create-form";

export default async function NewReportPage() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  return <ReportCreateForm administrator={administrator} />;
}