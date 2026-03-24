import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "polish_dwr_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  administratorId: string;
  expiresAt: number;
};

export type AuthenticatedAdministrator = {
  id: string;
  name: string;
  email: string;
};

function getAuthSecret() {
  const authSecret = process.env.AUTH_SECRET?.trim();

  if (authSecret) {
    return authSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "development-auth-secret-change-me";
  }

  throw new Error("AUTH_SECRET is not set.");
}

function signSessionValue(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signSessionValue(body);

  return `${body}.${signature}`;
}

function hasValidSignature(body: string, signature: string) {
  const expectedSignature = signSessionValue(body);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function decodeSession(token: string) {
  const [body, signature] = token.split(".");

  if (!body || !signature || !hasValidSignature(body, signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;

    if (!parsed.administratorId || typeof parsed.expiresAt !== "number") {
      return null;
    }

    if (parsed.expiresAt <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function verifyAdministratorCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    return null;
  }

  const administrator = await prisma.administrator.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!administrator) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(normalizedPassword, administrator.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  return {
    id: administrator.id,
    name: administrator.name,
    email: administrator.email,
  } satisfies AuthenticatedAdministrator;
}

export async function createAdministratorSession(administratorId: string) {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const token = encodeSession({ administratorId, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    expires: new Date(expiresAt),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdministratorSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentAdministrator() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = decodeSession(token);

  if (!session) {
    return null;
  }

  return prisma.administrator.findUnique({
    where: { id: session.administratorId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}