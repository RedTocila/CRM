import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createPgPool } from "../src/lib/db/pool";
import "dotenv/config";

export function createSeedPrismaClient() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const pool = createPgPool(connectionString);
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
