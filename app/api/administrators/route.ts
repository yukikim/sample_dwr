import bcrypt from "bcryptjs";

import { serializeAdministrator, validateCreateAdministratorInput } from "@/lib/administrators";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, readJsonBody, requireAuthenticatedAdministrator } from "@/lib/api";

type CreateAdministratorBody = {
  name?: string;
  email?: string;
  password?: string;
};

export async function GET() {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const administrators = await prisma.administrator.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return apiSuccess(
    {
      items: administrators.map(serializeAdministrator),
    },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const body = await readJsonBody<CreateAdministratorBody>(request);

  if (!body) {
    return apiError({ code: "INVALID_JSON", message: "JSON ボディを解析できませんでした。" }, { status: 400 });
  }

  const validatedInput = validateCreateAdministratorInput(body);

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

  const { name, email, password } = validatedInput.data;

  const existingAdministrator = await prisma.administrator.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingAdministrator) {
    return apiError(
      {
        code: "DUPLICATE_EMAIL",
        message: "同じメールアドレスの管理者が既に存在します。",
      },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const createdAdministrator = await prisma.administrator.create({
    data: {
      name,
      email,
      passwordHash,
    },
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
      item: serializeAdministrator(createdAdministrator),
    },
    { status: 201 },
  );
}
