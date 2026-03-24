import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function createPrismaClient() {
  const connectionString = readRequiredEnv("DATABASE_URL");

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run the seed script.");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrismaClient();

  try {
    const name = readRequiredEnv("INITIAL_ADMIN_NAME");
    const email = readRequiredEnv("INITIAL_ADMIN_EMAIL");
    const password = readRequiredEnv("INITIAL_ADMIN_PASSWORD");

    if (!name || !email || !password) {
      console.warn(
        "Skipping initial administrator seed because INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, or INITIAL_ADMIN_PASSWORD is missing.",
      );
      return;
    }

    const normalizedEmail = email.toLowerCase();
    const existingAdministrator = await prisma.administrator.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingAdministrator) {
      console.log(`Initial administrator already exists: ${normalizedEmail}`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.administrator.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
      },
    });

    console.log(`Created initial administrator: ${normalizedEmail}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to seed initial administrator.");
  console.error(error);
  process.exitCode = 1;
});