import { getCurrentAdministrator } from "@/lib/auth";
import { redirect } from "next/navigation";

import { AdministratorsPageClient } from "@/app/administrators/administrators-page-client";

export default async function AdministratorsPage() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  return <AdministratorsPageClient administrator={administrator} />;
}