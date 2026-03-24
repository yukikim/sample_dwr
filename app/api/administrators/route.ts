import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, readJsonBody, requireAuthenticatedAdministrator } from "@/lib/api";

type CreateAdministratorBody = {
  name?: string;
  email?: string;
  password?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return apiSuccess(
    {
      items: administrators.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
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

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password?.trim() ?? "";
  const errors: string[] = [];

  if (!name) {
    errors.push("name is required.");
  }

  if (!email || !isValidEmail(email)) {
    errors.push("email must be a valid email address.");
  }

  if (password.length < 8) {
    errors.push("password must be at least 8 characters long.");
  }

  if (errors.length > 0) {
    return apiError(
      {
        code: "VALIDATION_ERROR",
        message: "入力内容を確認してください。",
        details: errors,
      },
      { status: 400 },
    );
  }

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
      createdAt: true,
      updatedAt: true,
    },
  });

  return apiSuccess(
    {
      item: {
        ...createdAdministrator,
        createdAt: createdAdministrator.createdAt.toISOString(),
        updatedAt: createdAdministrator.updatedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}