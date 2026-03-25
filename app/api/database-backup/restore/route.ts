import { apiError, apiSuccess, requireAuthenticatedAdministrator } from "@/lib/api";
import { restoreDatabaseBackup } from "@/lib/database-backup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return apiError({ code: "MISSING_FILE", message: "バックアップファイルを選択してください。" }, { status: 400 });
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(await file.text()) as unknown;
  } catch {
    return apiError({ code: "INVALID_JSON", message: "バックアップファイルをJSONとして解析できませんでした。" }, { status: 400 });
  }

  try {
    const summary = await restoreDatabaseBackup(parsedBody);
    return apiSuccess({ summary }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "バックアップのリストアに失敗しました。";
    return apiError({ code: "RESTORE_FAILED", message }, { status: 400 });
  }
}