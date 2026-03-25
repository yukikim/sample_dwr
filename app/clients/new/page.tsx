import { getCurrentAdministrator } from "@/lib/auth";
import { redirect } from "next/navigation";

import { ClientCreateForm } from "@/app/clients/new/client-create-form";

export default async function NewClientPage() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  return <ClientCreateForm administrator={administrator} />;
}