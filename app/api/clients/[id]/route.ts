import { serializeClient, validateUpdateClientInput, type ClientInput } from "@/lib/clients";
import { apiError, apiSuccess, readJsonBody, requireAuthenticatedAdministrator } from "@/lib/api";
import { prisma } from "@/lib/prisma";

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
  const client = await prisma.client.findUnique({ where: { id } });

  if (!client) {
    return apiError({ code: "NOT_FOUND", message: "対象の得意先が見つかりません。" }, { status: 404 });
  }

  return apiSuccess({ item: serializeClient(client) }, { status: 200 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await context.params;
  const existingClient = await prisma.client.findUnique({
    where: { id },
    select: { id: true, code: true },
  });

  if (!existingClient) {
    return apiError({ code: "NOT_FOUND", message: "対象の得意先が見つかりません。" }, { status: 404 });
  }

  const body = await readJsonBody<ClientInput>(request);

  if (!body) {
    return apiError({ code: "INVALID_JSON", message: "JSON ボディを解析できませんでした。" }, { status: 400 });
  }

  const validatedInput = validateUpdateClientInput(body);

  if (validatedInput.errors.length > 0 || validatedInput.data === null) {
    return apiError(
      {
        code: "VALIDATION_ERROR",
        message: "入力内容を確認してください。",
        details: validatedInput.errors,
      },
      { status: 400 },
    );
  }

  if (validatedInput.data.code && validatedInput.data.code !== existingClient.code) {
    const duplicateClient = await prisma.client.findUnique({
      where: { code: validatedInput.data.code },
      select: { id: true },
    });

    if (duplicateClient) {
      return apiError(
        {
          code: "DUPLICATE_CLIENT_CODE",
          message: "同じ得意先コードが既に存在します。",
        },
        { status: 409 },
      );
    }
  }

  const updatedClient = await prisma.client.update({
    where: { id },
    data: validatedInput.data,
  });

  return apiSuccess({ item: serializeClient(updatedClient) }, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await context.params;
  const existingClient = await prisma.client.findUnique({ where: { id }, select: { id: true, code: true, name: true } });

  if (!existingClient) {
    return apiError({ code: "NOT_FOUND", message: "対象の得意先が見つかりません。" }, { status: 404 });
  }

  const usageCount = await prisma.dailyWorkReport.count({
    where: {
      clientCode: existingClient.code,
    },
  });

  if (usageCount > 0) {
    return apiError(
      {
        code: "CLIENT_IN_USE",
        message: `この得意先は ${usageCount} 件の日報で使用中のため削除できません。`,
        details: {
          usageCount,
          clientCode: existingClient.code,
          clientName: existingClient.name,
        },
      },
      { status: 409 },
    );
  }

  await prisma.client.delete({ where: { id } });

  return apiSuccess({ deleted: true }, { status: 200 });
}