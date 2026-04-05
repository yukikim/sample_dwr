import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import prismaPackage from "@prisma/client";
import bcrypt from "bcryptjs";

const { PrismaClient } = prismaPackage;

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function createPrismaClient() {
  const connectionString = readRequiredEnv("DATABASE_URL");

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to reset the database.");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

async function createAdministrator(prisma) {
  const name = readRequiredEnv("INITIAL_ADMIN_NAME");
  const email = readRequiredEnv("INITIAL_ADMIN_EMAIL")?.toLowerCase();
  const password = readRequiredEnv("INITIAL_ADMIN_PASSWORD");

  if (!name || !email || !password) {
    throw new Error(
      "INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, and INITIAL_ADMIN_PASSWORD are required.",
    );
  }

  if (password.length < 8) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be at least 8 characters long.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.administrator.create({
    data: {
      name,
      email,
      passwordHash,
      isActive: true,
    },
  });
}

async function resetDatabase(prisma) {
  await prisma.$transaction(async (tx) => {
    await tx.dailyWorkReport.deleteMany();
    await tx.passwordResetToken.deleteMany();
    await tx.client.deleteMany();
    await tx.carTypeMaster.deleteMany();
    await tx.workLocationMaster.deleteMany();
    await tx.workContentMaster.deleteMany();
    await tx.administrator.deleteMany();

    await createAdministrator(tx);
  });
}

async function main() {
  const prisma = createPrismaClient();

  try {
    await resetDatabase(prisma);

    console.log("Reset database and created the initial administrator only.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to reset the database with admin-only data.");
  console.error(error);
  process.exitCode = 1;
});