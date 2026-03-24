import { getCurrentAdministrator } from "@/lib/auth";
import { redirect } from "next/navigation";

import { ReportsPageClient } from "@/app/reports/reports-page-client";

export default async function ReportsPage() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  return <ReportsPageClient administrator={administrator} />;
}