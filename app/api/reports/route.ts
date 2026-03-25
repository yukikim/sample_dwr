import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, readJsonBody, requireAuthenticatedAdministrator } from "@/lib/api";
import {
  buildReportOrderBy,
  buildReportWhere,
  parsePagination,
  serializeReport,
  validateCreateReportInput,
  type ReportInput,
} from "@/lib/reports";

export async function GET(request: Request) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = {
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    clientCode: searchParams.get("clientCode"),
    clientName: searchParams.get("clientName"),
    carType: searchParams.get("carType"),
    workCode: searchParams.get("workCode"),
    customerStatus: searchParams.get("customerStatus"),
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  };
  const where = buildReportWhere(query);
  const pagination = parsePagination(query);
  const [items, total] = await prisma.$transaction([
    prisma.dailyWorkReport.findMany({
      where,
      orderBy: buildReportOrderBy(),
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.dailyWorkReport.count({ where }),
  ]);

  return apiSuccess(
    {
      items: items.map(serializeReport),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const body = await readJsonBody<ReportInput>(request);

  if (!body) {
    return apiError({ code: "INVALID_JSON", message: "JSON ボディを解析できませんでした。" }, { status: 400 });
  }

  const validatedInput = validateCreateReportInput(body);

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

  const report = await prisma.dailyWorkReport.create({
    data: {
      ...validatedInput.data,
      clientCode: client.code,
      clientName: client.name,
      createdBy: administrator.id,
    },
  });

  return apiSuccess({ item: serializeReport(report) }, { status: 201 });
}
