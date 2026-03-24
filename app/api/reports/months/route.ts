import { apiError, apiSuccess, requireAuthenticatedAdministrator } from "@/lib/api";
import { prisma } from "@/lib/prisma";

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-");
  return `${year}年${Number(month)}月`;
}

export async function GET() {
  const administrator = await requireAuthenticatedAdministrator();

  if (!administrator) {
    return apiError({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const reports = await prisma.dailyWorkReport.findMany({
    select: {
      workDate: true,
    },
    orderBy: [{ workDate: "desc" }],
  });

  const monthValues = Array.from(new Set(reports.map((report) => report.workDate.toISOString().slice(0, 7))));

  return apiSuccess(
    {
      items: monthValues.map((value) => ({
        value,
        label: formatMonthLabel(value),
      })),
    },
    { status: 200 },
  );
}