import "dotenv/config";
import bcrypt from "bcryptjs";
import { createSeedPrismaClient } from "../prisma/seed-client";

const email = process.argv[2] ?? "redtocila@gmail.com";
const password = process.argv[3] ?? "Komardarja_1";

async function main() {
  const prisma = createSeedPrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "RedTocila",
      passwordHash,
      isSuperAdmin: true,
      status: "ACTIVE",
    },
    update: { passwordHash, isSuperAdmin: true, status: "ACTIVE" },
  });

  console.log(`✓ Password updated for ${user.email}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
