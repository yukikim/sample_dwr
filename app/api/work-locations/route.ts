import { apiError, apiSuccess, readJsonBody, requireAuthenticatedAdministrator } from "@/lib/api";
import {
  createReportMaster,
  findReportMasterByName,
  listReportMasters,
} from "@/lib/report-masters-server";
import { validateCreateReportMasterInput, type ReportMasterInput } from "@/lib/report-masters";

export async function GET() {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  return apiSuccess({ items: await listReportMasters("workLocation") }, { status: 200 });
}

export async function POST(request: Request) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const body = await readJsonBody<ReportMasterInput>(request);

  if (!body) {
    return apiError({ code: "INVALID_JSON", message: "JSON ボディを解析できませんでした。" }, { status: 400 });
  }

  const validatedInput = validateCreateReportMasterInput(body);

  if (!validatedInput.data) {
    return apiError({ code: "VALIDATION_ERROR", message: "入力内容を確認してください。", details: validatedInput.errors }, { status: 400 });
  }

  const existingItem = await findReportMasterByName("workLocation", validatedInput.data.name);

  if (existingItem) {
    return apiError({ code: "DUPLICATE_NAME", message: "同じ作業場所名が既に存在します。" }, { status: 409 });
  }

  return apiSuccess({ item: await createReportMaster("workLocation", validatedInput.data) }, { status: 201 });
}