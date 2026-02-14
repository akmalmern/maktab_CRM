require("dotenv").config();

const prisma = require("../src/prisma");
const bcrypt = require("bcrypt");

async function main() {
  const username = "admin";
  const plain = "admin123";
  const hash = await bcrypt.hash(plain, 10);

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    console.log("Admin already exists");
    return;
  }

  const user = await prisma.user.create({
    data: { role: "ADMIN", username, password: hash },
  });

  await prisma.admin.create({
    data: {
      userId: user.id,
      firstName: "Super",
      lastName: "Admin",
    },
  });

  console.log("Admin created:", { username, password: plain });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
