import { redirect } from "next/navigation";

import { ReportMasterCreateForm } from "@/app/report-masters/report-master-create-form";
import { getCurrentAdministrator } from "@/lib/auth";
import { workLocationMasterConfig } from "@/lib/report-masters";

export default async function NewWorkLocationPage() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  return <ReportMasterCreateForm administrator={administrator} config={workLocationMasterConfig} />;
}