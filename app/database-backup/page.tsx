import { redirect } from "next/navigation";

import { DatabaseBackupPageClient } from "@/app/database-backup/database-backup-page-client";
import { getCurrentAdministrator } from "@/lib/auth";

export default async function DatabaseBackupPage() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/");
  }

  return <DatabaseBackupPageClient administrator={administrator} />;
}