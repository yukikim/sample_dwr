export type ClientInput = {
  code?: unknown;
  name?: unknown;
  address?: unknown;
  contactTel?: unknown;
  contactEmail?: unknown;
  contactPerson?: unknown;
  remarks?: unknown;
};

export type SerializedClient = {
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
  reportUsageCount?: number;
  isInUse?: boolean;
};

type ValidatedClientInput = {
  code: string;
  name: string;
  address: string;
  contactTel: string;
  contactEmail: string;
  contactPerson: string;
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

export function serializeClient(client: {
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
    id: client.id,
    code: client.code,
    name: client.name,
    address: client.address,
    contactTel: client.contactTel,
    contactEmail: client.contactEmail,
    contactPerson: client.contactPerson,
    remarks: client.remarks,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

export function validateCreateClientInput(input: ClientInput): ValidationSuccess<ValidatedClientInput> | ValidationFailure {
  const errors: string[] = [];
  const code = parseRequiredString(input.code, "code", errors);
  const name = parseRequiredString(input.name, "name", errors);
  const address = parseRequiredString(input.address, "address", errors);
  const contactTel = parseRequiredString(input.contactTel, "contactTel", errors);
  const contactEmail = parseRequiredEmail(input.contactEmail, "contactEmail", errors);
  const contactPerson = parseRequiredString(input.contactPerson, "contactPerson", errors);

  if (errors.length > 0) {
    return { data: null, errors };
  }

  return {
    data: {
      code,
      name,
      address,
      contactTel,
      contactEmail,
      contactPerson,
      remarks: parseOptionalString(input.remarks),
    },
    errors: [],
  };
}

export function validateUpdateClientInput(input: ClientInput): ValidationSuccess<Partial<ValidatedClientInput>> | ValidationFailure {
  if (Object.keys(input).length === 0) {
    return {
      data: null,
      errors: ["At least one field is required."],
    };
  }

  const errors: string[] = [];
  const data: Partial<ValidatedClientInput> = {};

  if (input.code !== undefined) {
    data.code = parseRequiredString(input.code, "code", errors);
  }

  if (input.name !== undefined) {
    data.name = parseRequiredString(input.name, "name", errors);
  }

  if (input.address !== undefined) {
    data.address = parseRequiredString(input.address, "address", errors);
  }

  if (input.contactTel !== undefined) {
    data.contactTel = parseRequiredString(input.contactTel, "contactTel", errors);
  }

  if (input.contactEmail !== undefined) {
    data.contactEmail = parseRequiredEmail(input.contactEmail, "contactEmail", errors);
  }

  if (input.contactPerson !== undefined) {
    data.contactPerson = parseRequiredString(input.contactPerson, "contactPerson", errors);
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

function parseRequiredEmail(value: unknown, fieldName: string, errors: string[]) {
  const email = parseRequiredString(value, fieldName, errors);

  if (email === "") {
    return "";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    errors.push(`${fieldName} must be a valid email address.`);
    return "";
  }

  return email;
}

function parseOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}