type AdministratorRecord = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ValidationSuccess<T> = {
  data: T;
  errors: [];
};

type ValidationFailure = {
  data: null;
  errors: string[];
};

export type CreateAdministratorInput = {
  name: string;
  email: string;
  password: string;
};

export type UpdateAdministratorInput = {
  name?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
};

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function serializeAdministrator(item: AdministratorRecord) {
  return {
    id: item.id,
    name: item.name,
    email: item.email,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function validateCreateAdministratorInput(input: {
  name?: string;
  email?: string;
  password?: string;
}): ValidationSuccess<CreateAdministratorInput> | ValidationFailure {
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password?.trim() ?? "";
  const errors: string[] = [];

  if (!name) {
    errors.push("name is required.");
  }

  if (!email || !isValidEmail(email)) {
    errors.push("email must be a valid email address.");
  }

  if (password.length < 8) {
    errors.push("password must be at least 8 characters long.");
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  return {
    data: {
      name,
      email,
      password,
    },
    errors: [],
  };
}

export function validateUpdateAdministratorInput(input: {
  name?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
}): ValidationSuccess<UpdateAdministratorInput> | ValidationFailure {
  const errors: string[] = [];
  const data: UpdateAdministratorInput = {};

  if (typeof input.name === "string") {
    const name = input.name.trim();

    if (!name) {
      errors.push("name is required.");
    } else {
      data.name = name;
    }
  }

  if (typeof input.email === "string") {
    const email = input.email.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      errors.push("email must be a valid email address.");
    } else {
      data.email = email;
    }
  }

  if (typeof input.password === "string") {
    const password = input.password.trim();

    if (password) {
      if (password.length < 8) {
        errors.push("password must be at least 8 characters long.");
      } else {
        data.password = password;
      }
    }
  }

  if (input.isActive !== undefined) {
    if (typeof input.isActive !== "boolean") {
      errors.push("isActive must be a boolean value.");
    } else {
      data.isActive = input.isActive;
    }
  }

  if (Object.keys(data).length === 0) {
    errors.push("At least one field is required.");
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  return { data, errors: [] };
}