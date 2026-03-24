import { apiError, requireAuthenticatedAdministrator } from "@/lib/api";

export async function GET() {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  return apiError(
    {
      code: "NOT_IMPLEMENTED",
      message: "PDF 出力 API は未実装です。帳票テンプレート確定後に実装します。",
    },
    { status: 501 },
  );
}