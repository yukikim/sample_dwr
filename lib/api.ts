import { NextResponse } from "next/server";

import { getCurrentAdministrator } from "@/lib/auth";

type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(
    {
      data,
      error: null,
    },
    init,
  );
}

export function apiError(payload: ApiErrorPayload, init?: ResponseInit) {
  return NextResponse.json(
    {
      data: null,
      error: payload,
    },
    init,
  );
}

export async function requireAuthenticatedAdministrator() {
  return getCurrentAdministrator();
}

export async function readJsonBody<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}