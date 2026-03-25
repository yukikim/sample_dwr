import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { CustomerStatus, PrismaClient } from "@prisma/client";

import { INITIAL_CLIENTS } from "./seed-data/clients.mjs";

const DUMMY_REPORT_MARKER = "[seed:dummy-reports-v1]";
const SEED_MONTHS = 3;

const CLIENTS = INITIAL_CLIENTS.map((client) => ({
  code: client.code,
  name: client.name,
}));

const WORK_PATTERNS = [
  { code: "W001", label: "洗車・内装清掃", baseMinutes: 70, laborRatio: 0.85, baseSales: 7800, pointsRate: 0.12 },
  { code: "W002", label: "定期点検", baseMinutes: 95, laborRatio: 0.92, baseSales: 12800, pointsRate: 0.18 },
  { code: "W003", label: "コーティング補修", baseMinutes: 120, laborRatio: 0.95, baseSales: 16500, pointsRate: 0.24 },
  { code: "W004", label: "納車前仕上げ", baseMinutes: 80, laborRatio: 0.88, baseSales: 9800, pointsRate: 0.16 },
  { code: "W005", label: "外装ポリッシュ", baseMinutes: 145, laborRatio: 0.93, baseSales: 19800, pointsRate: 0.28 },
];

const CAR_TYPES = ["軽自動車", "普通車", "SUV", "ミニバン", "商用バン"];
const REMARK_TEMPLATES = [
  "納車予定に合わせて前倒し対応",
  "午前中に引取、午後返却",
  "追加清掃あり",
  "小キズ補修を同時実施",
  "代車返却確認済み",
  "週次依頼分をまとめて対応",
  "担当者立会いで確認済み",
];

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function createPrismaClient() {
  const connectionString = readRequiredEnv("DATABASE_URL");

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run the dummy report seed script.");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function atUtcDate(year, month, day) {
  return new Date(Date.UTC(year, month, day));
}

function startDateFromToday(monthsBack) {
  const today = new Date();
  return atUtcDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (monthsBack * 30 - 1));
}

function endDateToday() {
  const today = new Date();
  return atUtcDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
}

function createRng(seed) {
  let state = seed >>> 0;

  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function numericSeed(date, sequence) {
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
  return Number(yyyymmdd) + sequence * 97;
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick(rng, items) {
  return items[randomInt(rng, 0, items.length - 1)];
}

function buildReportRecord({ administratorId, workDate, sequence }) {
  const rng = createRng(numericSeed(workDate, sequence));
  const client = pick(rng, CLIENTS);
  const pattern = pick(rng, WORK_PATTERNS);
  const customerStatus = rng() > 0.42 ? CustomerStatus.existing : CustomerStatus.new;
  const unitCount = randomInt(rng, 1, customerStatus === CustomerStatus.new ? 2 : 4);
  const workMinutes = pattern.baseMinutes + randomInt(rng, -18, 32);
  const laborMinutes = Math.max(20, Math.round(workMinutes * pattern.laborRatio));
  const travelMinutes = randomInt(rng, 10, 45);
  const standardMinutes = Math.max(30, Math.round(pattern.baseMinutes * (0.9 + rng() * 0.25)));
  const carType = pick(rng, CAR_TYPES);
  const salesAmount = pattern.baseSales * unitCount + randomInt(rng, -1200, 2400);
  const points = Number((salesAmount * pattern.pointsRate / 100).toFixed(2));
  const createdAt = new Date(workDate.getTime() + randomInt(rng, 8, 17) * 60 * 60 * 1000);
  const updatedAt = new Date(createdAt.getTime() + randomInt(rng, 10, 180) * 60 * 1000);
  const remark = `${DUMMY_REPORT_MARKER} ${pattern.label} / ${pick(rng, REMARK_TEMPLATES)}`;

  return {
    workDate,
    clientCode: client.code,
    clientName: client.name,
    workMinutes,
    laborMinutes,
    travelMinutes,
    carType,
    workCode: pattern.code,
    customerStatus,
    unitCount,
    salesAmount,
    standardMinutes,
    points,
    remarks: remark,
    createdBy: administratorId,
    createdAt,
    updatedAt,
  };
}

function shouldCreateEntriesForDate(date) {
  const day = date.getUTCDay();

  if (day === 0) {
    return false;
  }

  if (day === 6) {
    return date.getUTCDate() % 2 === 0;
  }

  return true;
}

function entryCountForDate(date) {
  const rng = createRng(numericSeed(date, 0));
  const day = date.getUTCDay();

  if (day === 6) {
    return rng() > 0.55 ? 1 : 2;
  }

  if (rng() > 0.72) {
    return 3;
  }

  if (rng() > 0.28) {
    return 2;
  }

  return 1;
}

function buildDummyReports(administratorId) {
  const reports = [];
  const startDate = startDateFromToday(SEED_MONTHS);
  const endDate = endDateToday();

  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 1)) {
    if (!shouldCreateEntriesForDate(cursor)) {
      continue;
    }

    const entryCount = entryCountForDate(cursor);

    for (let index = 0; index < entryCount; index += 1) {
      reports.push(
        buildReportRecord({
          administratorId,
          workDate: cursor,
          sequence: index + 1,
        }),
      );
    }
  }

  return reports;
}

async function main() {
  const prisma = createPrismaClient();

  try {
    const administrator = await prisma.administrator.findFirst({
      where: { isActive: true },
      select: { id: true, email: true },
      orderBy: [{ createdAt: "asc" }],
    });

    if (!administrator) {
      throw new Error("No active administrator found. Run npm run prisma:seed first.");
    }

    const deleted = await prisma.dailyWorkReport.deleteMany({
      where: {
        remarks: {
          contains: DUMMY_REPORT_MARKER,
        },
      },
    });

    const reports = buildDummyReports(administrator.id);

    if (reports.length === 0) {
      console.warn("No dummy reports generated.");
      return;
    }

    const created = await prisma.dailyWorkReport.createMany({
      data: reports,
    });

    console.log(`Deleted previous dummy reports: ${deleted.count}`);
    console.log(`Created dummy reports: ${created.count}`);
    console.log(`Assigned creator: ${administrator.email}`);
    console.log(`Date range: ${reports[0].workDate.toISOString().slice(0, 10)} to ${reports[reports.length - 1].workDate.toISOString().slice(0, 10)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to seed dummy daily work reports.");
  console.error(error);
  process.exitCode = 1;
});