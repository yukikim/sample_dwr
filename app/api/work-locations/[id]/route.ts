import { apiError, apiSuccess, readJsonBody, requireAuthenticatedAdministrator } from "@/lib/api";
import {
  countReportMasterUsage,
  deleteReportMaster,
  findReportMasterById,
  findReportMasterByName,
  updateReportMaster,
} from "@/lib/report-masters-server";
import { serializeReportMaster, validateUpdateReportMasterInput, type ReportMasterInput } from "@/lib/report-masters";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await context.params;
  const item = await findReportMasterById("workLocation", id);

  if (!item) {
    return apiError({ code: "NOT_FOUND", message: "対象の作業場所が見つかりません。" }, { status: 404 });
  }

  return apiSuccess({ item: serializeReportMaster(item) }, { status: 200 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await context.params;
  const existingItem = await findReportMasterById("workLocation", id);

  if (!existingItem) {
    return apiError({ code: "NOT_FOUND", message: "対象の作業場所が見つかりません。" }, { status: 404 });
  }

  const body = await readJsonBody<ReportMasterInput>(request);

  if (!body) {
    return apiError({ code: "INVALID_JSON", message: "JSON ボディを解析できませんでした。" }, { status: 400 });
  }

  const validatedInput = validateUpdateReportMasterInput(body);

  if (!validatedInput.data) {
    return apiError({ code: "VALIDATION_ERROR", message: "入力内容を確認してください。", details: validatedInput.errors }, { status: 400 });
  }

  if (validatedInput.data.name && validatedInput.data.name !== existingItem.name) {
    const duplicateItem = await findReportMasterByName("workLocation", validatedInput.data.name);

    if (duplicateItem) {
      return apiError({ code: "DUPLICATE_NAME", message: "同じ作業場所名が既に存在します。" }, { status: 409 });
    }
  }

  return apiSuccess({ item: serializeReportMaster(await updateReportMaster("workLocation", id, validatedInput.data)) }, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await context.params;
  const existingItem = await findReportMasterById("workLocation", id);

  if (!existingItem) {
    return apiError({ code: "NOT_FOUND", message: "対象の作業場所が見つかりません。" }, { status: 404 });
  }

  const usageCount = await countReportMasterUsage("workLocation", existingItem.name);

  if (usageCount > 0) {
    return apiError({ code: "MASTER_IN_USE", message: `この作業場所は ${usageCount} 件の日報で使用中のため削除できません。` }, { status: 409 });
  }

  await deleteReportMaster("workLocation", id);

  return apiSuccess({ deleted: true }, { status: 200 });
}