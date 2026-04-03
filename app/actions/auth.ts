"use server";

import { redirect } from "next/navigation";

import { isValidEmail } from "@/lib/administrators";
import {
  clearAdministratorSession,
  createAdministratorSession,
  verifyAdministratorCredentials,
} from "@/lib/auth";
import { createPasswordResetRequest, resetPasswordWithToken } from "@/lib/password-reset";

export type LoginActionState = {
  error: string | null;
};

export type ForgotPasswordActionState = {
  error: string | null;
  success: string | null;
  developmentResetUrl: string | null;
};

export type ResetPasswordActionState = {
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

export async function forgotPasswordAction(
  _previousState: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const email = formData.get("email");

  if (typeof email !== "string" || !isValidEmail(email.trim().toLowerCase())) {
    return {
      error: "メールアドレスを確認してください。",
      success: null,
      developmentResetUrl: null,
    };
  }

  try {
    const result = await createPasswordResetRequest(email);

    return {
      error: null,
      success: "該当アカウントが存在する場合、パスワード再設定の案内を送信しました。",
      developmentResetUrl: result.developmentResetUrl,
    };
  } catch {
    return {
      error: "再設定案内の作成に失敗しました。時間をおいて再度お試しください。",
      success: null,
      developmentResetUrl: null,
    };
  }
}

export async function resetPasswordAction(
  _previousState: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  const token = formData.get("token");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof token !== "string" || token.trim() === "") {
    return {
      error: "再設定トークンが見つかりません。",
    };
  }

  if (typeof password !== "string" || typeof confirmPassword !== "string") {
    return {
      error: "入力内容を確認してください。",
    };
  }

  const normalizedPassword = password.trim();

  if (normalizedPassword.length < 8) {
    return {
      error: "パスワードは8文字以上で入力してください。",
    };
  }

  if (normalizedPassword !== confirmPassword.trim()) {
    return {
      error: "確認用パスワードが一致しません。",
    };
  }

  const result = await resetPasswordWithToken(token, normalizedPassword);

  if (!result.ok) {
    return {
      error: "再設定リンクが無効か、有効期限が切れています。もう一度やり直してください。",
    };
  }

  await clearAdministratorSession();
  redirect("/reset-password/success");
}