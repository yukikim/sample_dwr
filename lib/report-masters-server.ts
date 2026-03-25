import { prisma } from "@/lib/prisma";
import { serializeReportMaster, type ReportMasterKind } from "@/lib/report-masters";

export async function listReportMasters(kind: ReportMasterKind) {
  const items = await findManyByKind(kind);
  const usageCountByName = await getUsageCountByName(kind);

  return items.map((item) => {
    const reportUsageCount = usageCountByName.get(item.name) ?? 0;

    return {
      ...serializeReportMaster(item),
      reportUsageCount,
      isInUse: reportUsageCount > 0,
    };
  });
}

export async function findReportMasterById(kind: ReportMasterKind, id: string) {
  switch (kind) {
    case "carType":
      return prisma.carTypeMaster.findUnique({ where: { id } });
    case "workLocation":
      return prisma.workLocationMaster.findUnique({ where: { id } });
    case "workContent":
      return prisma.workContentMaster.findUnique({ where: { id } });
  }
}

export async function findReportMasterByName(kind: ReportMasterKind, name: string) {
  switch (kind) {
    case "carType":
      return prisma.carTypeMaster.findUnique({ where: { name } });
    case "workLocation":
      return prisma.workLocationMaster.findUnique({ where: { name } });
    case "workContent":
      return prisma.workContentMaster.findUnique({ where: { name } });
  }
}

export async function createReportMaster(kind: ReportMasterKind, data: { name: string; remarks: string | null }) {
  switch (kind) {
    case "carType":
      return prisma.carTypeMaster.create({ data });
    case "workLocation":
      return prisma.workLocationMaster.create({ data });
    case "workContent":
      return prisma.workContentMaster.create({ data });
  }
}

export async function updateReportMaster(kind: ReportMasterKind, id: string, data: { name?: string; remarks?: string | null }) {
  switch (kind) {
    case "carType":
      return prisma.carTypeMaster.update({ where: { id }, data });
    case "workLocation":
      return prisma.workLocationMaster.update({ where: { id }, data });
    case "workContent":
      return prisma.workContentMaster.update({ where: { id }, data });
  }
}

export async function deleteReportMaster(kind: ReportMasterKind, id: string) {
  switch (kind) {
    case "carType":
      return prisma.carTypeMaster.delete({ where: { id } });
    case "workLocation":
      return prisma.workLocationMaster.delete({ where: { id } });
    case "workContent":
      return prisma.workContentMaster.delete({ where: { id } });
  }
}

export async function countReportMasterUsage(kind: ReportMasterKind, name: string) {
  switch (kind) {
    case "carType":
      return prisma.dailyWorkReport.count({ where: { carType: name } });
    case "workLocation":
      return prisma.dailyWorkReport.count({ where: { workLocation: name } });
    case "workContent":
      return prisma.dailyWorkReport.count({ where: { workCode: name } });
  }
}

async function findManyByKind(kind: ReportMasterKind) {
  switch (kind) {
    case "carType":
      return prisma.carTypeMaster.findMany({ orderBy: [{ name: "asc" }, { createdAt: "desc" }] });
    case "workLocation":
      return prisma.workLocationMaster.findMany({ orderBy: [{ name: "asc" }, { createdAt: "desc" }] });
    case "workContent":
      return prisma.workContentMaster.findMany({ orderBy: [{ name: "asc" }, { createdAt: "desc" }] });
  }
}

async function getUsageCountByName(kind: ReportMasterKind) {
  switch (kind) {
    case "carType": {
      const groups = await prisma.dailyWorkReport.groupBy({
        by: ["carType"],
        where: { carType: { not: null } },
        _count: { _all: true },
      });

      return new Map(groups.flatMap((group) => (group.carType ? [[group.carType, group._count._all] as const] : [])));
    }
    case "workLocation": {
      const groups = await prisma.dailyWorkReport.groupBy({
        by: ["workLocation"],
        where: { workLocation: { not: null } },
        _count: { _all: true },
      });

      return new Map(groups.flatMap((group) => (group.workLocation ? [[group.workLocation, group._count._all] as const] : [])));
    }
    case "workContent": {
      const groups = await prisma.dailyWorkReport.groupBy({
        by: ["workCode"],
        _count: { _all: true },
      });

      return new Map(groups.map((group) => [group.workCode, group._count._all] as const));
    }
  }
}