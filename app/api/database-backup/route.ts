import { apiError, requireAuthenticatedAdministrator } from "@/lib/api";
import { buildDatabaseBackupFileName, buildDatabaseBackupPayload } from "@/lib/database-backup";

export const runtime = "nodejs";

export async function GET() {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const payload = await buildDatabaseBackupPayload();
  const fileName = buildDatabaseBackupFileName(payload.exportedAt);
  const encodedFileName = encodeURIComponent(fileName);
  const body = JSON.stringify(payload, null, 2);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
      "Cache-Control": "no-store",
    },
  });
}