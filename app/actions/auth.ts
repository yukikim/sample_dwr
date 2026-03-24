"use server";

import { redirect } from "next/navigation";

import {
  clearAdministratorSession,
  createAdministratorSession,
  verifyAdministratorCredentials,
} from "@/lib/auth";

export type LoginActionState = {
  error: string | null;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return {
      error: "入力内容を確認して、もう一度ログインしてください。",
    };
  }

  const administrator = await verifyAdministratorCredentials(email, password);

  if (!administrator) {
    return {
      error: "メールアドレスまたはパスワードが正しくありません。",
    };
  }

  await createAdministratorSession(administrator.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearAdministratorSession();
  redirect("/");
}