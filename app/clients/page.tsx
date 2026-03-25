import { getCurrentAdministrator } from "@/lib/auth";
import { redirect } from "next/navigation";

import { ClientsPageClient } from "@/app/clients/clients-page-client";

export default async function ClientsPage() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  return <ClientsPageClient administrator={administrator} />;
}