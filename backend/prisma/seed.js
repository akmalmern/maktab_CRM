require("dotenv").config();

const prisma = require("../src/prisma");
const bcrypt = require("bcrypt");

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const DEFAULT_PASSWORD = "12345678";

function pad(num, size = 3) {
  return String(num).padStart(size, "0");
}

function buildBirthDate(yearOffset) {
  // 1990-01-01 dan boshlab stabillik uchun deterministik sana.
  return new Date(1990 + yearOffset, yearOffset % 12, (yearOffset % 27) + 1);
}

async function ensureAdmin() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const exists = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });

  if (exists) {
    console.log("Admin already exists");
    return;
  }

  const user = await prisma.user.create({
    data: { role: "ADMIN", username: ADMIN_USERNAME, password: hash },
  });

  await prisma.admin.create({
    data: {
      userId: user.id,
      firstName: "Super",
      lastName: "Admin",
    },
  });

  console.log("Admin created:", { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
}

async function seedTeachers(count) {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= count; i += 1) {
    const username = `teacher${pad(i)}`;

    const existingUser = await prisma.user.findUnique({
      where: { username },
      include: { teacher: true },
    });

    if (existingUser) {
      skipped += 1;
      // User bor, ammo teacher profil yo'q bo'lsa, profilni to'ldiramiz.
      if (!existingUser.teacher) {
        await prisma.teacher.create({
          data: {
            userId: existingUser.id,
            firstName: `Teacher${pad(i)}`,
            lastName: "User",
            birthDate: buildBirthDate(i % 20),
            yashashManzili: "Toshkent shahri",
            specialization: i % 2 === 0 ? "Math" : "English",
          },
        });
      }
      continue;
    }

    const user = await prisma.user.create({
      data: {
        role: "TEACHER",
        username,
        password: hash,
      },
    });

    await prisma.teacher.create({
      data: {
        userId: user.id,
        firstName: `Teacher${pad(i)}`,
        lastName: "User",
        birthDate: buildBirthDate(i % 20),
        yashashManzili: "Toshkent shahri",
        specialization: i % 2 === 0 ? "Math" : "English",
      },
    });

    created += 1;
  }

  return { created, skipped };
}

async function seedStudents(count) {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= count; i += 1) {
    const username = `student${pad(i)}`;

    const existingUser = await prisma.user.findUnique({
      where: { username },
      include: { student: true },
    });

    if (existingUser) {
      skipped += 1;
      if (!existingUser.student) {
        await prisma.student.create({
          data: {
            userId: existingUser.id,
            firstName: `Student${pad(i)}`,
            lastName: "User",
            birthDate: buildBirthDate(i % 15),
            yashashManzili: "Farg'ona viloyati",
            parentPhone: `+9989000${pad(i, 4)}`,
          },
        });
      }
      continue;
    }

    const user = await prisma.user.create({
      data: {
        role: "STUDENT",
        username,
        password: hash,
      },
    });

    await prisma.student.create({
      data: {
        userId: user.id,
        firstName: `Student${pad(i)}`,
        lastName: "User",
        birthDate: buildBirthDate(i % 15),
        yashashManzili: "Farg'ona viloyati",
        parentPhone: `+9989000${pad(i, 4)}`,
      },
    });

    created += 1;
  }

  return { created, skipped };
}

async function main() {
  await ensureAdmin();

  const teacherResult = await seedTeachers(50);
  const studentResult = await seedStudents(200);

  console.log("Seed completed");
  console.log(`Teachers => created: ${teacherResult.created}, skipped: ${teacherResult.skipped}`);
  console.log(`Students => created: ${studentResult.created}, skipped: ${studentResult.skipped}`);
  console.log(`Default password for teacher/student: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
