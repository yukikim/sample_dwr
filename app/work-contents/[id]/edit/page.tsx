import { redirect } from "next/navigation";

import { ReportMasterEditForm } from "@/app/report-masters/report-master-edit-form";
import { getCurrentAdministrator } from "@/lib/auth";
import { workContentMasterConfig } from "@/lib/report-masters";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditWorkContentPage({ params }: PageProps) {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  const { id } = await params;

  return <ReportMasterEditForm administrator={administrator} config={workContentMasterConfig} itemId={id} />;
}