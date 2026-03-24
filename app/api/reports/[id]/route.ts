import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, readJsonBody, requireAuthenticatedAdministrator } from "@/lib/api";
import { serializeReport, validateUpdateReportInput, type ReportInput } from "@/lib/reports";

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
  const report = await prisma.dailyWorkReport.findUnique({ where: { id } });

  if (!report) {
    return apiError({ code: "NOT_FOUND", message: "対象の日報が見つかりません。" }, { status: 404 });
  }

  return apiSuccess({ item: serializeReport(report) }, { status: 200 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await context.params;
  const existingReport = await prisma.dailyWorkReport.findUnique({ where: { id } });

  if (!existingReport) {
    return apiError({ code: "NOT_FOUND", message: "対象の日報が見つかりません。" }, { status: 404 });
  }

  const body = await readJsonBody<ReportInput>(request);

  if (!body) {
    return apiError({ code: "INVALID_JSON", message: "JSON ボディを解析できませんでした。" }, { status: 400 });
  }

  const validatedInput = validateUpdateReportInput(body);

  if (!validatedInput.data) {
    return apiError(
      {
        code: "VALIDATION_ERROR",
        message: "入力内容を確認してください。",
        details: validatedInput.errors,
      },
      { status: 400 },
    );
  }

  const report = await prisma.dailyWorkReport.update({
    where: { id },
    data: validatedInput.data,
  });

  return apiSuccess({ item: serializeReport(report) }, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await context.params;
  const existingReport = await prisma.dailyWorkReport.findUnique({ where: { id } });

  if (!existingReport) {
    return apiError({ code: "NOT_FOUND", message: "対象の日報が見つかりません。" }, { status: 404 });
  }

  await prisma.dailyWorkReport.delete({ where: { id } });

  return apiSuccess({ deleted: true }, { status: 200 });
}
