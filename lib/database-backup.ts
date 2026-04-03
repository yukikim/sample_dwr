import { BillingStatus, CustomerStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const BACKUP_VERSION = 1;
const BACKUP_FILE_PREFIX = "polish-dwr-backup";

type SerializedAdministrator = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SerializedClient = {
  id: string;
  code: string;
  name: string;
  address: string;
  contactTel: string;
  contactEmail: string;
  contactPerson: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
};

type SerializedReportMaster = {
  id: string;
  name: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
};

type SerializedDailyWorkReport = {
  id: string;
  workDate: string;
  clientCode: string;
  clientName: string;
  purchaser: string | null;
  workMinutes: number;
  laborMinutes: number;
  travelMinutes: number;
  carType: string | null;
  workLocation: string | null;
  signerName: string | null;
  vehicleIdentifier: string | null;
  workCode: string;
  customerStatus: CustomerStatus;
  billingStatus: BillingStatus;
  unitCount: number;
  salesAmount: string;
  standardMinutes: number | null;
  points: string | null;
  remarks: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type DatabaseBackupPayload = {
  version: number;
  source: string;
  exportedAt: string;
  data: {
    administrators: SerializedAdministrator[];
    clients: SerializedClient[];
    carTypeMasters: SerializedReportMaster[];
    workLocationMasters: SerializedReportMaster[];
    workContentMasters: SerializedReportMaster[];
    dailyWorkReports: SerializedDailyWorkReport[];
  };
};

export type RestoreSummary = {
  administrators: number;
  clients: number;
  carTypeMasters: number;
  workLocationMasters: number;
  workContentMasters: number;
  dailyWorkReports: number;
};

function serializeDate(value: Date) {
  return value.toISOString();
}

function serializeAdministrator(item: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SerializedAdministrator {
  return {
    ...item,
    createdAt: serializeDate(item.createdAt),
    updatedAt: serializeDate(item.updatedAt),
  };
}

function serializeClient(item: {
  id: string;
  code: string;
  name: string;
  address: string;
  contactTel: string;
  contactEmail: string;
  contactPerson: string;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedClient {
  return {
    ...item,
    createdAt: serializeDate(item.createdAt),
    updatedAt: serializeDate(item.updatedAt),
  };
}

function serializeMaster(item: {
  id: string;
  name: string;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedReportMaster {
  return {
    ...item,
    createdAt: serializeDate(item.createdAt),
    updatedAt: serializeDate(item.updatedAt),
  };
}

function serializeDailyWorkReport(item: {
  id: string;
  workDate: Date;
  clientCode: string;
  clientName: string;
  purchaser: string | null;
  workMinutes: number;
  laborMinutes: number;
  travelMinutes: number;
  carType: string | null;
  workLocation: string | null;
  signerName: string | null;
  vehicleIdentifier: string | null;
  workCode: string;
  customerStatus: CustomerStatus;
  billingStatus: BillingStatus;
  unitCount: number;
  salesAmount: Prisma.Decimal;
  standardMinutes: number | null;
  points: Prisma.Decimal | null;
  remarks: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}): SerializedDailyWorkReport {
  return {
    ...item,
    workDate: serializeDate(item.workDate),
    salesAmount: item.salesAmount.toString(),
    points: item.points?.toString() ?? null,
    createdAt: serializeDate(item.createdAt),
    updatedAt: serializeDate(item.updatedAt),
  };
}

function parseString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required.`);
  }

  return value;
}

function parseNullableString(value: unknown, fieldName: string) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string or null.`);
  }

  return value;
}

function parseBoolean(value: unknown, fieldName: string) {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be a boolean.`);
  }

  return value;
}

function parseInteger(value: unknown, fieldName: string) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }

  return value;
}

function parseNullableInteger(value: unknown, fieldName: string) {
  if (value === null) {
    return null;
  }

  return parseInteger(value, fieldName);
}

function parseDate(value: unknown, fieldName: string) {
  const rawValue = parseString(value, fieldName);
  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO date string.`);
  }

  return date;
}

function parseDecimal(value: unknown, fieldName: string) {
  const rawValue = parseString(value, fieldName);

  try {
    return new Prisma.Decimal(rawValue);
  } catch {
    throw new Error(`${fieldName} must be a valid decimal string.`);
  }
}

function parseNullableDecimal(value: unknown, fieldName: string) {
  if (value === null) {
    return null;
  }

  return parseDecimal(value, fieldName);
}

function parseCustomerStatus(value: unknown, fieldName: string) {
  if (value === CustomerStatus.new || value === CustomerStatus.existing) {
    return value;
  }

  throw new Error(`${fieldName} must be a valid customer status.`);
}

function parseBillingStatus(value: unknown, fieldName: string) {
  if (value === BillingStatus.unprocessed || value === BillingStatus.processed) {
    return value;
  }

  throw new Error(`${fieldName} must be a valid billing status.`);
}

function parseArray(value: unknown, fieldName: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array.`);
  }

  return value;
}

function parseAdministratorRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("administrators[] must contain objects.");
  }

  const record = value as Record<string, unknown>;

  return {
    id: parseString(record.id, "administrators[].id"),
    name: parseString(record.name, "administrators[].name"),
    email: parseString(record.email, "administrators[].email"),
    passwordHash: parseString(record.passwordHash, "administrators[].passwordHash"),
    isActive: parseBoolean(record.isActive, "administrators[].isActive"),
    createdAt: parseDate(record.createdAt, "administrators[].createdAt"),
    updatedAt: parseDate(record.updatedAt, "administrators[].updatedAt"),
  };
}

function parseClientRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("clients[] must contain objects.");
  }

  const record = value as Record<string, unknown>;

  return {
    id: parseString(record.id, "clients[].id"),
    code: parseString(record.code, "clients[].code"),
    name: parseString(record.name, "clients[].name"),
    address: parseString(record.address, "clients[].address"),
    contactTel: parseString(record.contactTel, "clients[].contactTel"),
    contactEmail: parseString(record.contactEmail, "clients[].contactEmail"),
    contactPerson: parseString(record.contactPerson, "clients[].contactPerson"),
    remarks: parseNullableString(record.remarks, "clients[].remarks"),
    createdAt: parseDate(record.createdAt, "clients[].createdAt"),
    updatedAt: parseDate(record.updatedAt, "clients[].updatedAt"),
  };
}

function parseMasterRecord(value: unknown, fieldPrefix: string) {
  if (!value || typeof value !== "object") {
    throw new Error(`${fieldPrefix}[] must contain objects.`);
  }

  const record = value as Record<string, unknown>;

  return {
    id: parseString(record.id, `${fieldPrefix}[].id`),
    name: parseString(record.name, `${fieldPrefix}[].name`),
    remarks: parseNullableString(record.remarks, `${fieldPrefix}[].remarks`),
    createdAt: parseDate(record.createdAt, `${fieldPrefix}[].createdAt`),
    updatedAt: parseDate(record.updatedAt, `${fieldPrefix}[].updatedAt`),
  };
}

function parseDailyWorkReportRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("dailyWorkReports[] must contain objects.");
  }

  const record = value as Record<string, unknown>;

  return {
    id: parseString(record.id, "dailyWorkReports[].id"),
    workDate: parseDate(record.workDate, "dailyWorkReports[].workDate"),
    clientCode: parseString(record.clientCode, "dailyWorkReports[].clientCode"),
    clientName: parseString(record.clientName, "dailyWorkReports[].clientName"),
    purchaser: record.purchaser === undefined ? null : parseNullableString(record.purchaser, "dailyWorkReports[].purchaser"),
    workMinutes: parseInteger(record.workMinutes, "dailyWorkReports[].workMinutes"),
    laborMinutes: parseInteger(record.laborMinutes, "dailyWorkReports[].laborMinutes"),
    travelMinutes: parseInteger(record.travelMinutes, "dailyWorkReports[].travelMinutes"),
    carType: parseNullableString(record.carType, "dailyWorkReports[].carType"),
    workLocation: parseNullableString(record.workLocation, "dailyWorkReports[].workLocation"),
    signerName: parseNullableString(record.signerName, "dailyWorkReports[].signerName"),
    vehicleIdentifier: parseNullableString(record.vehicleIdentifier, "dailyWorkReports[].vehicleIdentifier"),
    workCode: parseString(record.workCode, "dailyWorkReports[].workCode"),
    customerStatus: parseCustomerStatus(record.customerStatus, "dailyWorkReports[].customerStatus"),
    billingStatus: parseBillingStatus(record.billingStatus, "dailyWorkReports[].billingStatus"),
    unitCount: parseInteger(record.unitCount, "dailyWorkReports[].unitCount"),
    salesAmount: parseDecimal(record.salesAmount, "dailyWorkReports[].salesAmount"),
    standardMinutes: parseNullableInteger(record.standardMinutes, "dailyWorkReports[].standardMinutes"),
    points: parseNullableDecimal(record.points, "dailyWorkReports[].points"),
    remarks: parseNullableString(record.remarks, "dailyWorkReports[].remarks"),
    createdBy: parseString(record.createdBy, "dailyWorkReports[].createdBy"),
    createdAt: parseDate(record.createdAt, "dailyWorkReports[].createdAt"),
    updatedAt: parseDate(record.updatedAt, "dailyWorkReports[].updatedAt"),
  };
}

export async function buildDatabaseBackupPayload(): Promise<DatabaseBackupPayload> {
  const [administrators, clients, carTypeMasters, workLocationMasters, workContentMasters, dailyWorkReports] = await Promise.all([
    prisma.administrator.findMany({ orderBy: [{ createdAt: "asc" }, { email: "asc" }] }),
    prisma.client.findMany({ orderBy: [{ code: "asc" }, { createdAt: "asc" }] }),
    prisma.carTypeMaster.findMany({ orderBy: [{ name: "asc" }, { createdAt: "asc" }] }),
    prisma.workLocationMaster.findMany({ orderBy: [{ name: "asc" }, { createdAt: "asc" }] }),
    prisma.workContentMaster.findMany({ orderBy: [{ name: "asc" }, { createdAt: "asc" }] }),
    prisma.dailyWorkReport.findMany({ orderBy: [{ workDate: "asc" }, { createdAt: "asc" }, { id: "asc" }] }),
  ]);

  return {
    version: BACKUP_VERSION,
    source: "polish_dwr",
    exportedAt: new Date().toISOString(),
    data: {
      administrators: administrators.map(serializeAdministrator),
      clients: clients.map(serializeClient),
      carTypeMasters: carTypeMasters.map(serializeMaster),
      workLocationMasters: workLocationMasters.map(serializeMaster),
      workContentMasters: workContentMasters.map(serializeMaster),
      dailyWorkReports: dailyWorkReports.map(serializeDailyWorkReport),
    },
  };
}

export function buildDatabaseBackupFileName(exportedAt: string) {
  const timestamp = exportedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `${BACKUP_FILE_PREFIX}_${timestamp}.json`;
}

export function parseDatabaseBackupPayload(input: unknown) {
  if (!input || typeof input !== "object") {
    throw new Error("バックアップファイルの形式が不正です。");
  }

  const payload = input as Record<string, unknown>;
  const version = payload.version;

  if (version !== BACKUP_VERSION) {
    throw new Error("このバックアップファイルのバージョンには対応していません。");
  }

  if (payload.source !== "polish_dwr") {
    throw new Error("このバックアップファイルは対象アプリのものではありません。");
  }

  parseDate(payload.exportedAt, "exportedAt");

  if (!payload.data || typeof payload.data !== "object") {
    throw new Error("バックアップデータ本体が存在しません。");
  }

  const data = payload.data as Record<string, unknown>;
  const administrators = parseArray(data.administrators, "data.administrators").map(parseAdministratorRecord);
  const clients = parseArray(data.clients, "data.clients").map(parseClientRecord);
  const carTypeMasters = parseArray(data.carTypeMasters, "data.carTypeMasters").map((value) => parseMasterRecord(value, "carTypeMasters"));
  const workLocationMasters = parseArray(data.workLocationMasters, "data.workLocationMasters").map((value) => parseMasterRecord(value, "workLocationMasters"));
  const workContentMasters = parseArray(data.workContentMasters, "data.workContentMasters").map((value) => parseMasterRecord(value, "workContentMasters"));
  const dailyWorkReports = parseArray(data.dailyWorkReports, "data.dailyWorkReports").map(parseDailyWorkReportRecord);

  if (administrators.length === 0) {
    throw new Error("バックアップには少なくとも1件の管理者が必要です。");
  }

  if (!administrators.some((item) => item.isActive)) {
    throw new Error("リストア後にログインできるよう、有効な管理者を1件以上含めてください。");
  }

  const administratorIds = new Set(administrators.map((item) => item.id));

  for (const report of dailyWorkReports) {
    if (!administratorIds.has(report.createdBy)) {
      throw new Error("日報の作成者に存在しない管理者IDが含まれています。");
    }
  }

  return {
    administrators,
    clients,
    carTypeMasters,
    workLocationMasters,
    workContentMasters,
    dailyWorkReports,
  };
}

export async function restoreDatabaseBackup(input: unknown): Promise<RestoreSummary> {
  const parsed = parseDatabaseBackupPayload(input);

  await prisma.$transaction(async (tx) => {
    await tx.dailyWorkReport.deleteMany();
    await tx.workContentMaster.deleteMany();
    await tx.workLocationMaster.deleteMany();
    await tx.carTypeMaster.deleteMany();
    await tx.client.deleteMany();
    await tx.administrator.deleteMany();

    await tx.administrator.createMany({ data: parsed.administrators });
    await tx.client.createMany({ data: parsed.clients });
    await tx.carTypeMaster.createMany({ data: parsed.carTypeMasters });
    await tx.workLocationMaster.createMany({ data: parsed.workLocationMasters });
    await tx.workContentMaster.createMany({ data: parsed.workContentMasters });
    await tx.dailyWorkReport.createMany({ data: parsed.dailyWorkReports });
  });

  return {
    administrators: parsed.administrators.length,
    clients: parsed.clients.length,
    carTypeMasters: parsed.carTypeMasters.length,
    workLocationMasters: parsed.workLocationMasters.length,
    workContentMasters: parsed.workContentMasters.length,
    dailyWorkReports: parsed.dailyWorkReports.length,
  };
}