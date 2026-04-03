import bcrypt from "bcryptjs";

import { serializeAdministrator, validateUpdateAdministratorInput } from "@/lib/administrators";
import { apiError, apiSuccess, readJsonBody, requireAuthenticatedAdministrator } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateAdministratorBody = {
  name?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
};

export async function PATCH(request: Request, context: RouteContext) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await context.params;
  const existingAdministrator = await prisma.administrator.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      isActive: true,
    },
  });

  if (!existingAdministrator) {
    return apiError({ code: "NOT_FOUND", message: "対象の管理者が見つかりません。" }, { status: 404 });
  }

  const body = await readJsonBody<UpdateAdministratorBody>(request);

  if (!body) {
    return apiError({ code: "INVALID_JSON", message: "JSON ボディを解析できませんでした。" }, { status: 400 });
  }

  const validatedInput = validateUpdateAdministratorInput(body);

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

  if (validatedInput.data.email && validatedInput.data.email !== existingAdministrator.email) {
    const duplicatedAdministrator = await prisma.administrator.findUnique({
      where: { email: validatedInput.data.email },
      select: { id: true },
    });

    if (duplicatedAdministrator) {
      return apiError(
        {
          code: "DUPLICATE_EMAIL",
          message: "同じメールアドレスの管理者が既に存在します。",
        },
        { status: 409 },
      );
    }
  }

  if (validatedInput.data.isActive === false && existingAdministrator.isActive) {
    if (administrator.id === id) {
      return apiError(
        {
          code: "SELF_DEACTIVATION_FORBIDDEN",
          message: "ログイン中の管理者自身は無効化できません。",
        },
        { status: 400 },
      );
    }

    const activeAdministratorCount = await prisma.administrator.count({
      where: { isActive: true },
    });

    if (activeAdministratorCount <= 1) {
      return apiError(
        {
          code: "LAST_ACTIVE_ADMINISTRATOR",
          message: "最後の有効管理者は無効化できません。",
        },
        { status: 400 },
      );
    }
  }

  const data: {
    name?: string;
    email?: string;
    passwordHash?: string;
    authVersion?: {
      increment: number;
    };
    isActive?: boolean;
  } = {};

  if (validatedInput.data.name !== undefined) {
    data.name = validatedInput.data.name;
  }

  if (validatedInput.data.email !== undefined) {
    data.email = validatedInput.data.email;
  }

  if (validatedInput.data.password) {
    data.passwordHash = await bcrypt.hash(validatedInput.data.password, 12);
    data.authVersion = { increment: 1 };
  }

  if (validatedInput.data.isActive !== undefined) {
    data.isActive = validatedInput.data.isActive;
  }

  const updatedAdministrator = await prisma.administrator.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return apiSuccess(
    {
      item: serializeAdministrator(updatedAdministrator),
    },
    { status: 200 },
  );
}