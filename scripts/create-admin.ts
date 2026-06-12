import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const prisma = new PrismaClient();
  const email = process.argv[2] ?? "redtocila@gmail.com";
  const password = process.argv[3] ?? "";
  const name = process.argv[4] ?? "RedTocila";

  if (!password) {
    console.error("Password required as second argument");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      isSuperAdmin: true,
      status: "ACTIVE",
    },
    update: {
      name,
      passwordHash,
      isSuperAdmin: true,
      status: "ACTIVE",
    },
  });

  console.log(`Super admin ready: ${user.email} (${user.id})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
