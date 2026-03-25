import { redirect } from "next/navigation";

import { ReportMasterEditForm } from "@/app/report-masters/report-master-edit-form";
import { getCurrentAdministrator } from "@/lib/auth";
import { carTypeMasterConfig } from "@/lib/report-masters";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCarTypePage({ params }: PageProps) {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  const { id } = await params;

  return <ReportMasterEditForm administrator={administrator} config={carTypeMasterConfig} itemId={id} />;
}