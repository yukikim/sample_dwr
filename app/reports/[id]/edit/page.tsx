import { getCurrentAdministrator } from "@/lib/auth";
import { redirect } from "next/navigation";

import { ReportEditForm } from "@/app/reports/[id]/edit/report-edit-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditReportPage({ params }: PageProps) {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  const { id } = await params;

  return <ReportEditForm administrator={administrator} reportId={id} />;
}