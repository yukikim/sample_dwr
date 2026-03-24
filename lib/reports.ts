import { CustomerStatus, Prisma } from "@prisma/client";

export type ReportListQuery = {
  startDate?: string | null;
  endDate?: string | null;
  clientCode?: string | null;
  clientName?: string | null;
  carType?: string | null;
  workCode?: string | null;
  customerStatus?: string | null;
  page?: string | null;
  pageSize?: string | null;
};

export type ReportInput = {
  workDate?: unknown;
  clientCode?: unknown;
  clientName?: unknown;
  workMinutes?: unknown;
  laborMinutes?: unknown;
  travelMinutes?: unknown;
  carType?: unknown;
  workCode?: unknown;
  customerStatus?: unknown;
  unitCount?: unknown;
  salesAmount?: unknown;
  standardMinutes?: unknown;
  points?: unknown;
  remarks?: unknown;
};

type ValidationSuccess<T> = {
  data: T;
  errors: [];
};

type ValidationFailure = {
  data: null;
  errors: string[];
};

export type ValidatedReportInput = {
  workDate: Date;
  clientCode: string;
  clientName: string;
  workMinutes: number;
  laborMinutes: number;
  travelMinutes: number;
  carType: string | null;
  workCode: string;
  customerStatus: CustomerStatus;
  unitCount: number;
  salesAmount: Prisma.Decimal;
  standardMinutes: number | null;
  points: Prisma.Decimal | null;
  remarks: string | null;
};

export type ValidatedReportUpdateInput = Partial<ValidatedReportInput>;

export function buildReportWhere(query: ReportListQuery): Prisma.DailyWorkReportWhereInput {
  const where: Prisma.DailyWorkReportWhereInput = {};
  const dateRange: Prisma.DateTimeFilter = {};

  if (query.startDate) {
    const parsedStartDate = parseDate(query.startDate);

    if (parsedStartDate) {
      dateRange.gte = parsedStartDate;
    }
  }

  if (query.endDate) {
    const parsedEndDate = parseDate(query.endDate);

    if (parsedEndDate) {
      dateRange.lte = parsedEndDate;
    }
  }

  if (Object.keys(dateRange).length > 0) {
    where.workDate = dateRange;
  }

  if (query.clientCode?.trim()) {
    where.clientCode = {
      contains: query.clientCode.trim(),
      mode: "insensitive",
    };
  }

  if (query.clientName?.trim()) {
    where.clientName = {
      contains: query.clientName.trim(),
      mode: "insensitive",
    };
  }

  if (query.carType?.trim()) {
    where.carType = {
      contains: query.carType.trim(),
      mode: "insensitive",
    };
  }

  if (query.workCode?.trim()) {
    where.workCode = {
      contains: query.workCode.trim(),
      mode: "insensitive",
    };
  }

  if (query.customerStatus) {
    const customerStatus = parseCustomerStatus(query.customerStatus);

    if (customerStatus) {
      where.customerStatus = customerStatus;
    }
  }

  return where;
}

export function parsePagination(query: ReportListQuery) {
  const page = clampInteger(query.page, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInteger(query.pageSize, 20, 100);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function buildReportOrderBy(): Prisma.DailyWorkReportOrderByWithRelationInput[] {
  return [{ workDate: "desc" }, { createdAt: "desc" }, { id: "desc" }];
}

export function validateCreateReportInput(input: ReportInput): ValidationSuccess<ValidatedReportInput> | ValidationFailure {
  const errors: string[] = [];
  const workDate = parseDate(input.workDate);
  const clientCode = parseRequiredString(input.clientCode, "clientCode", errors);
  const clientName = parseRequiredString(input.clientName, "clientName", errors);
  const workCode = parseRequiredString(input.workCode, "workCode", errors);
  const workMinutes = parseRequiredNonNegativeInt(input.workMinutes, "workMinutes", errors);
  const laborMinutes = parseRequiredNonNegativeInt(input.laborMinutes, "laborMinutes", errors);
  const travelMinutes = parseRequiredNonNegativeInt(input.travelMinutes, "travelMinutes", errors);
  const unitCount = parseRequiredNonNegativeInt(input.unitCount, "unitCount", errors);
  const salesAmount = parseRequiredDecimal(input.salesAmount, "salesAmount", errors);
  const customerStatus = parseCustomerStatus(input.customerStatus);
  const standardMinutes = parseOptionalNonNegativeInt(input.standardMinutes, "standardMinutes", errors);
  const points = parseOptionalDecimal(input.points, "points", errors);

  if (!workDate) {
    errors.push("workDate must be a valid date string.");
  }

  if (!customerStatus) {
    errors.push("customerStatus must be either 'new' or 'existing'.");
  }

  if (errors.length > 0 || !workDate || !customerStatus) {
    return { data: null, errors };
  }

  return {
    data: {
      workDate,
      clientCode,
      clientName,
      workMinutes,
      laborMinutes,
      travelMinutes,
      carType: parseOptionalString(input.carType),
      workCode,
      customerStatus,
      unitCount,
      salesAmount,
      standardMinutes,
      points,
      remarks: parseOptionalString(input.remarks),
    },
    errors: [],
  };
}

export function validateUpdateReportInput(input: ReportInput): ValidationSuccess<ValidatedReportUpdateInput> | ValidationFailure {
  const errors: string[] = [];
  const data: ValidatedReportUpdateInput = {};

  if (Object.keys(input).length === 0) {
    return {
      data: null,
      errors: ["At least one field is required."],
    };
  }

  if (input.workDate !== undefined) {
    const workDate = parseDate(input.workDate);

    if (!workDate) {
      errors.push("workDate must be a valid date string.");
    } else {
      data.workDate = workDate;
    }
  }

  if (input.clientCode !== undefined) {
    data.clientCode = parseRequiredString(input.clientCode, "clientCode", errors);
  }

  if (input.clientName !== undefined) {
    data.clientName = parseRequiredString(input.clientName, "clientName", errors);
  }

  if (input.workMinutes !== undefined) {
    data.workMinutes = parseRequiredNonNegativeInt(input.workMinutes, "workMinutes", errors);
  }

  if (input.laborMinutes !== undefined) {
    data.laborMinutes = parseRequiredNonNegativeInt(input.laborMinutes, "laborMinutes", errors);
  }

  if (input.travelMinutes !== undefined) {
    data.travelMinutes = parseRequiredNonNegativeInt(input.travelMinutes, "travelMinutes", errors);
  }

  if (input.carType !== undefined) {
    data.carType = parseOptionalString(input.carType);
  }

  if (input.workCode !== undefined) {
    data.workCode = parseRequiredString(input.workCode, "workCode", errors);
  }

  if (input.customerStatus !== undefined) {
    const customerStatus = parseCustomerStatus(input.customerStatus);

    if (!customerStatus) {
      errors.push("customerStatus must be either 'new' or 'existing'.");
    } else {
      data.customerStatus = customerStatus;
    }
  }

  if (input.unitCount !== undefined) {
    data.unitCount = parseRequiredNonNegativeInt(input.unitCount, "unitCount", errors);
  }

  if (input.salesAmount !== undefined) {
    data.salesAmount = parseRequiredDecimal(input.salesAmount, "salesAmount", errors);
  }

  if (input.standardMinutes !== undefined) {
    data.standardMinutes = parseOptionalNonNegativeInt(input.standardMinutes, "standardMinutes", errors);
  }

  if (input.points !== undefined) {
    data.points = parseOptionalDecimal(input.points, "points", errors);
  }

  if (input.remarks !== undefined) {
    data.remarks = parseOptionalString(input.remarks);
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  return { data, errors: [] };
}

export function serializeReport(report: {
  id: string;
  workDate: Date;
  clientCode: string;
  clientName: string;
  workMinutes: number;
  laborMinutes: number;
  travelMinutes: number;
  carType: string | null;
  workCode: string;
  customerStatus: CustomerStatus;
  unitCount: number;
  salesAmount: Prisma.Decimal;
  standardMinutes: number | null;
  points: Prisma.Decimal | null;
  remarks: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: report.id,
    workDate: report.workDate.toISOString().slice(0, 10),
    clientCode: report.clientCode,
    clientName: report.clientName,
    workMinutes: report.workMinutes,
    laborMinutes: report.laborMinutes,
    travelMinutes: report.travelMinutes,
    carType: report.carType,
    workCode: report.workCode,
    customerStatus: report.customerStatus,
    unitCount: report.unitCount,
    salesAmount: Number(report.salesAmount),
    standardMinutes: report.standardMinutes,
    points: report.points === null ? null : Number(report.points),
    remarks: report.remarks,
    createdBy: report.createdBy,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

function parseCustomerStatus(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === CustomerStatus.new) {
    return CustomerStatus.new;
  }

  if (normalizedValue === CustomerStatus.existing) {
    return CustomerStatus.existing;
  }

  return null;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function parseRequiredString(value: unknown, fieldName: string, errors: string[]) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${fieldName} is required.`);
    return "";
  }

  return value.trim();
}

function parseOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

function parseRequiredNonNegativeInt(value: unknown, fieldName: string, errors: string[]) {
  const parsedNumber = parseNumber(value);

  if (parsedNumber === null || !Number.isInteger(parsedNumber) || parsedNumber < 0) {
    errors.push(`${fieldName} must be a non-negative integer.`);
    return 0;
  }

  return parsedNumber;
}

function parseOptionalNonNegativeInt(value: unknown, fieldName: string, errors: string[]) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedNumber = parseNumber(value);

  if (parsedNumber === null || !Number.isInteger(parsedNumber) || parsedNumber < 0) {
    errors.push(`${fieldName} must be a non-negative integer.`);
    return null;
  }

  return parsedNumber;
}

function parseRequiredDecimal(value: unknown, fieldName: string, errors: string[]) {
  const parsedNumber = parseNumber(value);

  if (parsedNumber === null || parsedNumber < 0) {
    errors.push(`${fieldName} must be a non-negative number.`);
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(parsedNumber);
}

function parseOptionalDecimal(value: unknown, fieldName: string, errors: string[]) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedNumber = parseNumber(value);

  if (parsedNumber === null || parsedNumber < 0) {
    errors.push(`${fieldName} must be a non-negative number.`);
    return null;
  }

  return new Prisma.Decimal(parsedNumber);
}

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function clampInteger(value: string | null | undefined, fallback: number, max: number) {
  const parsedValue = value ? Number(value) : fallback;

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return Math.min(parsedValue, max);
}
