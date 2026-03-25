export type ReportMasterKind = "carType" | "workLocation" | "workContent";

export type ReportMasterInput = {
  name?: unknown;
  remarks?: unknown;
};

export type SerializedReportMaster = {
  id: string;
  name: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  reportUsageCount?: number;
  isInUse?: boolean;
};

export type ReportMasterConfig = {
  kind: ReportMasterKind;
  path: string;
  apiPath: string;
  title: string;
  eyebrow: string;
  listTitle: string;
  singularLabel: string;
  fieldLabel: string;
  emptyMessage: string;
  createTitle: string;
  editTitle: string;
  createSubmitLabel: string;
};

type ValidatedReportMasterInput = {
  name: string;
  remarks: string | null;
};

type ValidationSuccess<T> = {
  data: T;
  errors: [];
};

type ValidationFailure = {
  data: null;
  errors: string[];
};

export const carTypeMasterConfig: ReportMasterConfig = {
  kind: "carType",
  path: "/car-types",
  apiPath: "/api/car-types",
  title: "車種管理",
  eyebrow: "Car Types",
  listTitle: "登録済み車種",
  singularLabel: "車種",
  fieldLabel: "車種名",
  emptyMessage: "車種はまだ登録されていません。",
  createTitle: "車種を新規登録",
  editTitle: "車種を編集",
  createSubmitLabel: "車種を登録する",
};

export const workLocationMasterConfig: ReportMasterConfig = {
  kind: "workLocation",
  path: "/work-locations",
  apiPath: "/api/work-locations",
  title: "作業場所管理",
  eyebrow: "Work Locations",
  listTitle: "登録済み作業場所",
  singularLabel: "作業場所",
  fieldLabel: "作業場所名",
  emptyMessage: "作業場所はまだ登録されていません。",
  createTitle: "作業場所を新規登録",
  editTitle: "作業場所を編集",
  createSubmitLabel: "作業場所を登録する",
};

export const workContentMasterConfig: ReportMasterConfig = {
  kind: "workContent",
  path: "/work-contents",
  apiPath: "/api/work-contents",
  title: "作業内容管理",
  eyebrow: "Work Contents",
  listTitle: "登録済み作業内容",
  singularLabel: "作業内容",
  fieldLabel: "作業内容名",
  emptyMessage: "作業内容はまだ登録されていません。",
  createTitle: "作業内容を新規登録",
  editTitle: "作業内容を編集",
  createSubmitLabel: "作業内容を登録する",
};

export function serializeReportMaster(item: {
  id: string;
  name: string;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedReportMaster {
  return {
    id: item.id,
    name: item.name,
    remarks: item.remarks,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function validateCreateReportMasterInput(input: ReportMasterInput): ValidationSuccess<ValidatedReportMasterInput> | ValidationFailure {
  const errors: string[] = [];
  const name = parseRequiredString(input.name, "name", errors);

  if (errors.length > 0) {
    return { data: null, errors };
  }

  return {
    data: {
      name,
      remarks: parseOptionalString(input.remarks),
    },
    errors: [],
  };
}

export function validateUpdateReportMasterInput(input: ReportMasterInput): ValidationSuccess<Partial<ValidatedReportMasterInput>> | ValidationFailure {
  if (Object.keys(input).length === 0) {
    return {
      data: null,
      errors: ["At least one field is required."],
    };
  }

  const errors: string[] = [];
  const data: Partial<ValidatedReportMasterInput> = {};

  if (input.name !== undefined) {
    data.name = parseRequiredString(input.name, "name", errors);
  }

  if (input.remarks !== undefined) {
    data.remarks = parseOptionalString(input.remarks);
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  return { data, errors: [] };
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