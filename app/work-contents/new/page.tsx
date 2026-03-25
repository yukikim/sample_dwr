import { redirect } from "next/navigation";

import { ReportMasterCreateForm } from "@/app/report-masters/report-master-create-form";
import { getCurrentAdministrator } from "@/lib/auth";
import { workContentMasterConfig } from "@/lib/report-masters";

export default async function NewWorkContentPage() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  return <ReportMasterCreateForm administrator={administrator} config={workContentMasterConfig} />;
}