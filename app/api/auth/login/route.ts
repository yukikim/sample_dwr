import { createAdministratorSession, verifyAdministratorCredentials } from "@/lib/auth";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = await readJsonBody<LoginRequestBody>(request);

  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return apiError(
      {
        code: "VALIDATION_ERROR",
        message: "メールアドレスとパスワードを指定してください。",
      },
      { status: 400 },
    );
  }

  const administrator = await verifyAdministratorCredentials(body.email, body.password);

  if (!administrator) {
    return apiError(
      {
        code: "INVALID_CREDENTIALS",
        message: "メールアドレスまたはパスワードが正しくありません。",
      },
      { status: 401 },
    );
  }

  await createAdministratorSession(administrator.id);

  return apiSuccess(
    {
      administrator,
    },
    { status: 200 },
  );
}