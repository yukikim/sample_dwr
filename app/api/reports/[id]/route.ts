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

  if (validatedInput.data.clientCode !== undefined) {
    const client = await prisma.client.findUnique({
      where: { code: validatedInput.data.clientCode },
      select: { code: true, name: true },
    });

    if (!client) {
      return apiError(
        {
          code: "CLIENT_NOT_FOUND",
          message: "指定された得意先が見つかりません。",
        },
        { status: 400 },
      );
    }

    validatedInput.data.clientCode = client.code;
    validatedInput.data.clientName = client.name;
  }

  if (validatedInput.data.carType !== undefined) {
    const carTypeMaster = await prisma.carTypeMaster.findUnique({
      where: { name: validatedInput.data.carType },
      select: { name: true },
    });

    if (!carTypeMaster) {
      return apiError({ code: "CAR_TYPE_NOT_FOUND", message: "指定された車種が見つかりません。" }, { status: 400 });
    }

    validatedInput.data.carType = carTypeMaster.name;
  }

  if (validatedInput.data.workLocation !== undefined) {
    const workLocationMaster = await prisma.workLocationMaster.findUnique({
      where: { name: validatedInput.data.workLocation },
      select: { name: true },
    });

    if (!workLocationMaster) {
      return apiError({ code: "WORK_LOCATION_NOT_FOUND", message: "指定された作業場所が見つかりません。" }, { status: 400 });
    }

    validatedInput.data.workLocation = workLocationMaster.name;
  }

  if (validatedInput.data.workCode !== undefined) {
    const workContentMaster = await prisma.workContentMaster.findUnique({
      where: { name: validatedInput.data.workCode },
      select: { name: true },
    });

    if (!workContentMaster) {
      return apiError({ code: "WORK_CONTENT_NOT_FOUND", message: "指定された作業内容が見つかりません。" }, { status: 400 });
    }

    validatedInput.data.workCode = workContentMaster.name;
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
