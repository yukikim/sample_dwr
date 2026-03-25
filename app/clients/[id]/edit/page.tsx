import { getCurrentAdministrator } from "@/lib/auth";
import { redirect } from "next/navigation";

import { ClientEditForm } from "@/app/clients/[id]/edit/client-edit-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditClientPage({ params }: PageProps) {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  const { id } = await params;

  return <ClientEditForm administrator={administrator} clientId={id} />;
}