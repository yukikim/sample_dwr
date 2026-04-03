import "server-only";

import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

type PasswordResetRequestResult = {
  developmentResetUrl: string | null;
};

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getAppUrl() {
  const configuredUrl = process.env.APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  return null;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !portRaw || !from) {
    return null;
  }

  const port = Number(portRaw);

  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  const secure = process.env.SMTP_SECURE?.trim().toLowerCase() === "true" || port === 465;

  return {
    host,
    port,
    secure,
    from,
    auth: user && password ? { user, pass: password } : undefined,
  };
}

async function sendPasswordResetEmail({
  to,
  administratorName,
  resetUrl,
}: {
  to: string;
  administratorName: string;
  resetUrl: string;
}) {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    return false;
  }

  const transport = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.auth,
  });

  await transport.sendMail({
    from: smtpConfig.from,
    to,
    subject: "[Polish-DWR] パスワード再設定のご案内",
    text: [
      `${administratorName} 様`,
      "",
      "パスワード再設定のリクエストを受け付けました。",
      "以下のURLを開いて、新しいパスワードを設定してください。",
      "",
      resetUrl,
      "",
      "このリンクの有効期限は1時間です。",
      "心当たりがない場合は、このメールを破棄してください。",
    ].join("\n"),
  });

  return true;
}

export async function createPasswordResetRequest(email: string): Promise<PasswordResetRequestResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const administrator = await prisma.administrator.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
    },
  });

  if (!administrator || !administrator.isActive) {
    return {
      developmentResetUrl: null,
    };
  }

  const baseUrl = getAppUrl();

  if (!baseUrl) {
    throw new Error("APP_URL is not configured.");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const resetUrl = `${baseUrl}/reset-password/${token}`;

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({
      where: {
        administratorId: administrator.id,
      },
    });

    await tx.passwordResetToken.create({
      data: {
        administratorId: administrator.id,
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });
  });

  const emailed = await sendPasswordResetEmail({
    to: administrator.email,
    administratorName: administrator.name,
    resetUrl,
  });

  return {
    developmentResetUrl: !emailed && process.env.NODE_ENV !== "production" ? resetUrl : null,
  };
}

export async function getPasswordResetTokenStatus(token: string) {
  const tokenHash = hashResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      expiresAt: true,
      usedAt: true,
      administrator: {
        select: {
          name: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  if (!resetToken) {
    return { valid: false } as const;
  }

  if (resetToken.usedAt || resetToken.expiresAt.getTime() <= Date.now() || !resetToken.administrator.isActive) {
    return { valid: false } as const;
  }

  return {
    valid: true,
    administratorName: resetToken.administrator.name,
    administratorEmail: resetToken.administrator.email,
  } as const;
}

export async function resetPasswordWithToken(token: string, nextPassword: string) {
  const tokenHash = hashResetToken(token);
  const passwordHash = await bcrypt.hash(nextPassword, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const resetToken = await tx.passwordResetToken.findUnique({
        where: {
          tokenHash,
        },
        select: {
          id: true,
          administratorId: true,
          expiresAt: true,
          usedAt: true,
          administrator: {
            select: {
              isActive: true,
            },
          },
        },
      });

      if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= Date.now() || !resetToken.administrator.isActive) {
        throw new Error("INVALID_TOKEN");
      }

      await tx.administrator.update({
        where: {
          id: resetToken.administratorId,
        },
        data: {
          passwordHash,
          authVersion: {
            increment: 1,
          },
        },
      });

      await tx.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await tx.passwordResetToken.deleteMany({
        where: {
          administratorId: resetToken.administratorId,
          id: {
            not: resetToken.id,
          },
        },
      });
    });

    return { ok: true } as const;
  } catch {
    return { ok: false } as const;
  }
}