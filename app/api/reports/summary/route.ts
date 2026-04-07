import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuthenticatedAdministrator } from "@/lib/api";
import { buildReportWhere } from "@/lib/reports";

export async function GET(request: Request) {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const where = buildReportWhere({
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    clientCode: searchParams.get("clientCode"),
    clientName: searchParams.get("clientName"),
    purchaser: searchParams.get("purchaser"),
    carType: searchParams.get("carType"),
    workLocation: searchParams.get("workLocation"),
    vehicleIdentifier: searchParams.get("vehicleIdentifier"),
    workCode: searchParams.get("workCode"),
    customerStatus: searchParams.get("customerStatus"),
    billingStatus: searchParams.get("billingStatus"),
  });
  const summary = await prisma.dailyWorkReport.aggregate({
    where,
    _count: {
      _all: true,
    },
    _sum: {
      salesAmount: true,
      workMinutes: true,
      laborMinutes: true,
      travelMinutes: true,
      unitCount: true,
      standardMinutes: true,
      points: true,
    },
  });

  return apiSuccess(
    {
      count: summary._count._all,
      salesAmountTotal: Number(summary._sum.salesAmount ?? 0),
      workMinutesTotal: summary._sum.workMinutes ?? 0,
      laborMinutesTotal: summary._sum.laborMinutes ?? 0,
      travelMinutesTotal: summary._sum.travelMinutes ?? 0,
      unitCountTotal: summary._sum.unitCount ?? 0,
      standardMinutesTotal: summary._sum.standardMinutes ?? 0,
      pointsTotal: Number(summary._sum.points ?? 0),
    },
    { status: 200 },
  );
}