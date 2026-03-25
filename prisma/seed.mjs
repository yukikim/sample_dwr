import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import prismaPackage from "@prisma/client";
import bcrypt from "bcryptjs";

import { INITIAL_CLIENTS } from "./seed-data/clients.mjs";
import {
  INITIAL_CAR_TYPES,
  INITIAL_WORK_CONTENTS,
  INITIAL_WORK_LOCATIONS,
} from "./seed-data/report-masters.mjs";

const { PrismaClient } = prismaPackage;

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
    } else {
      const normalizedEmail = email.toLowerCase();
      const existingAdministrator = await prisma.administrator.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingAdministrator) {
        console.log(`Initial administrator already exists: ${normalizedEmail}`);
      } else {
        const passwordHash = await bcrypt.hash(password, 12);

        await prisma.administrator.create({
          data: {
            name,
            email: normalizedEmail,
            passwordHash,
          },
        });

        console.log(`Created initial administrator: ${normalizedEmail}`);
      }
    }

    const seededClients = await Promise.all(
      INITIAL_CLIENTS.map((client) =>
        prisma.client.upsert({
          where: { code: client.code },
          update: {
            name: client.name,
            address: client.address,
            contactTel: client.contactTel,
            contactEmail: client.contactEmail,
            contactPerson: client.contactPerson,
            remarks: client.remarks,
          },
          create: client,
        }),
      ),
    );

    const seededCarTypes = await Promise.all(
      INITIAL_CAR_TYPES.map((name) =>
        prisma.carTypeMaster.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
      ),
    );

    const seededWorkLocations = await Promise.all(
      INITIAL_WORK_LOCATIONS.map((name) =>
        prisma.workLocationMaster.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
      ),
    );

    const seededWorkContents = await Promise.all(
      INITIAL_WORK_CONTENTS.map((name) =>
        prisma.workContentMaster.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
      ),
    );

    console.log(`Upserted initial clients: ${seededClients.length}`);
    console.log(`Upserted car types: ${seededCarTypes.length}`);
    console.log(`Upserted work locations: ${seededWorkLocations.length}`);
    console.log(`Upserted work contents: ${seededWorkContents.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to seed initial administrator.");
  console.error(error);
  process.exitCode = 1;
});