import { apiError, apiSuccess, requireAuthenticatedAdministrator } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const items = await prisma.dailyWorkReport.findMany({
    where: {
      vehicleIdentifier: {
        not: null,
      },
    },
    select: {
      vehicleIdentifier: true,
    },
    distinct: ["vehicleIdentifier"],
    orderBy: {
      vehicleIdentifier: "asc",
    },
  });

  return apiSuccess({
    items: items
      .map((item) => item.vehicleIdentifier?.trim() ?? "")
      .filter((value) => value.length > 0),
  }, { status: 200 });
}