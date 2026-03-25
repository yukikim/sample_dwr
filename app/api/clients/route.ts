import { serializeClient, validateCreateClientInput, type ClientInput } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, readJsonBody, requireAuthenticatedAdministrator } from "@/lib/api";

export async function GET() {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    orderBy: [{ code: "asc" }, { createdAt: "desc" }],
  });

  const usageGroups = await prisma.dailyWorkReport.groupBy({
    by: ["clientCode"],
    _count: {
      _all: true,
    },
  });

  const usageCountByCode = new Map(
    usageGroups.map((group) => [group.clientCode, group._count._all]),
  );

  return apiSuccess(
    {
      items: clients.map((client) => {
        const reportUsageCount = usageCountByCode.get(client.code) ?? 0;

        return {
          ...serializeClient(client),
          reportUsageCount,
          isInUse: reportUsageCount > 0,
        };
      }),
    },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const body = await readJsonBody<ClientInput>(request);

  if (!body) {
    return apiError({ code: "INVALID_JSON", message: "JSON ボディを解析できませんでした。" }, { status: 400 });
  }

  const validatedInput = validateCreateClientInput(body);

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

  const existingClient = await prisma.client.findUnique({
    where: { code: validatedInput.data.code },
    select: { id: true },
  });

  if (existingClient) {
    return apiError(
      {
        code: "DUPLICATE_CLIENT_CODE",
        message: "同じ得意先コードが既に存在します。",
      },
      { status: 409 },
    );
  }

  const client = await prisma.client.create({
    data: validatedInput.data,
  });

  return apiSuccess({ item: serializeClient(client) }, { status: 201 });
}