require("dotenv").config();

const prisma = require("../src/prisma");
const bcrypt = require("bcrypt");

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const DEFAULT_PASSWORD = "12345678";
const TEACHER_COUNT = 30;
const DEFAULT_ACADEMIC_YEAR = "2025-2026";

const SCHOOL_SUBJECTS = [
  "Ona tili va adabiyot",
  "O'zbek tili",
  "Rus tili",
  "Ingliz tili",
  "Matematika",
  "Algebra",
  "Geometriya",
  "Informatika",
  "Fizika",
  "Kimyo",
  "Biologiya",
  "Geografiya",
  "O'zbekiston tarixi",
  "Jahon tarixi",
  "Tarbiya",
  "Huquq",
  "Iqtisodiyot asoslari",
  "Texnologiya",
  "Chizmachilik",
  "Tasviriy san'at",
  "Musiqa",
  "Jismoniy tarbiya",
  "CHQBT",
  "Astronomiya",
];

const TEACHER_ASSIGNMENTS = [
  { firstName: "Akmal", lastName: "Karimov", subjectName: "Matematika" },
  { firstName: "Dilshod", lastName: "Rasulov", subjectName: "Algebra" },
  { firstName: "Aziza", lastName: "Toshpulatova", subjectName: "Geometriya" },
  { firstName: "Nodira", lastName: "Usmonova", subjectName: "Ingliz tili" },
  { firstName: "Sherzod", lastName: "Aliyev", subjectName: "Rus tili" },
  { firstName: "Shaxnoza", lastName: "Mamadaliyeva", subjectName: "Ona tili va adabiyot" },
  { firstName: "Bekzod", lastName: "Yuldashev", subjectName: "O'zbek tili" },
  { firstName: "Muhammad", lastName: "Saidov", subjectName: "Informatika" },
  { firstName: "Ulugbek", lastName: "Kadirov", subjectName: "Fizika" },
  { firstName: "Gulbahor", lastName: "Ergasheva", subjectName: "Kimyo" },
  { firstName: "Madina", lastName: "Qobilova", subjectName: "Biologiya" },
  { firstName: "Sardor", lastName: "Normatov", subjectName: "Geografiya" },
  { firstName: "Jasur", lastName: "Berdiev", subjectName: "O'zbekiston tarixi" },
  { firstName: "Laylo", lastName: "Abdullayeva", subjectName: "Jahon tarixi" },
  { firstName: "Shahzod", lastName: "Rahimov", subjectName: "Tarbiya" },
  { firstName: "Malika", lastName: "Islomova", subjectName: "Huquq" },
  { firstName: "Diyor", lastName: "Nematov", subjectName: "Iqtisodiyot asoslari" },
  { firstName: "Ozoda", lastName: "Sodiqova", subjectName: "Texnologiya" },
  { firstName: "Komil", lastName: "Murodov", subjectName: "Chizmachilik" },
  { firstName: "Zilola", lastName: "Hamidova", subjectName: "Tasviriy san'at" },
  { firstName: "Temur", lastName: "Xudoyberdiyev", subjectName: "Musiqa" },
  { firstName: "Suhrob", lastName: "Qodirov", subjectName: "Jismoniy tarbiya" },
  { firstName: "Javohir", lastName: "Eshonqulov", subjectName: "CHQBT" },
  { firstName: "Feruza", lastName: "Ruzmetova", subjectName: "Astronomiya" },
  { firstName: "Asilbek", lastName: "Tursunov", subjectName: "Matematika" },
  { firstName: "Rayhona", lastName: "Karimova", subjectName: "Ingliz tili" },
  { firstName: "Oybek", lastName: "Sobirov", subjectName: "Fizika" },
  { firstName: "Nilufar", lastName: "Raxmonova", subjectName: "Kimyo" },
  { firstName: "Ibrohim", lastName: "Yusupov", subjectName: "Biologiya" },
  { firstName: "Sitora", lastName: "Gafurova", subjectName: "Informatika" },
];

const DEFAULT_CLASSROOMS = [
  "5-A",
  "5-B",
  "6-A",
  "6-B",
  "7-A",
  "7-B",
  "8-A",
  "8-B",
  "9-A",
  "9-B",
  "10-A",
  "11-A",
];

const DEFAULT_VAQT_ORALIQLARI = [
  { nomi: "1-para", boshlanishVaqti: "08:30", tugashVaqti: "09:15", tartib: 1 },
  { nomi: "2-para", boshlanishVaqti: "09:25", tugashVaqti: "10:10", tartib: 2 },
  { nomi: "3-para", boshlanishVaqti: "10:20", tugashVaqti: "11:05", tartib: 3 },
  { nomi: "4-para", boshlanishVaqti: "11:15", tugashVaqti: "12:00", tartib: 4 },
  { nomi: "5-para", boshlanishVaqti: "12:10", tugashVaqti: "12:55", tartib: 5 },
  { nomi: "6-para", boshlanishVaqti: "13:05", tugashVaqti: "13:50", tartib: 6 },
];

function pad(num, size = 3) {
  return String(num).padStart(size, "0");
}

function buildBirthDate(yearOffset) {
  // 1990-01-01 dan boshlab stabillik uchun deterministik sana.
  return new Date(1990 + yearOffset, yearOffset % 12, (yearOffset % 27) + 1);
}

async function ensureDefaultSubjects() {
  const byName = {};

  for (const name of SCHOOL_SUBJECTS) {
    const subject = await prisma.subject.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    byName[name] = subject.id;
  }

  return byName;
}

async function ensureDefaultClassrooms() {
  const classrooms = [];

  for (const name of DEFAULT_CLASSROOMS) {
    const classroom = await prisma.classroom.upsert({
      where: {
        name_academicYear: {
          name,
          academicYear: DEFAULT_ACADEMIC_YEAR,
        },
      },
      update: { isArchived: false },
      create: {
        name,
        academicYear: DEFAULT_ACADEMIC_YEAR,
      },
    });
    classrooms.push(classroom);
  }

  return classrooms;
}

async function ensureDefaultVaqtOraliqlari() {
  for (const item of DEFAULT_VAQT_ORALIQLARI) {
    const exists = await prisma.vaqtOraliq.findFirst({
      where: {
        OR: [
          { tartib: item.tartib },
          { boshlanishVaqti: item.boshlanishVaqti, tugashVaqti: item.tugashVaqti },
        ],
      },
      select: { id: true },
    });

    if (!exists) {
      await prisma.vaqtOraliq.create({ data: item });
    }
  }
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

async function seedTeachers(count, subjectIds) {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= count; i += 1) {
    const username = `teacher${pad(i)}`;
    const assignment = TEACHER_ASSIGNMENTS[(i - 1) % TEACHER_ASSIGNMENTS.length];
    const subjectId = subjectIds[assignment.subjectName];

    if (!subjectId) {
      throw new Error(`Subject topilmadi: ${assignment.subjectName}`);
    }

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
            firstName: assignment.firstName,
            lastName: assignment.lastName,
            birthDate: buildBirthDate(i % 20),
            yashashManzili: "Toshkent shahri",
            subjectId,
          },
        });
      } else {
        await prisma.teacher.update({
          where: { id: existingUser.teacher.id },
          data: {
            firstName: assignment.firstName,
            lastName: assignment.lastName,
            yashashManzili: "Toshkent shahri",
            subjectId,
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
        firstName: assignment.firstName,
        lastName: assignment.lastName,
        birthDate: buildBirthDate(i % 20),
        yashashManzili: "Toshkent shahri",
        subjectId,
      },
    });

    created += 1;
  }

  return { created, skipped };
}

async function seedStudents(count, classrooms) {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= count; i += 1) {
    const username = `student${pad(i)}`;
    const classroom = classrooms[(i - 1) % classrooms.length];

    const existingUser = await prisma.user.findUnique({
      where: { username },
      include: { student: true },
    });

    if (existingUser) {
      skipped += 1;
      if (!existingUser.student) {
        const student = await prisma.student.create({
          data: {
            userId: existingUser.id,
            firstName: `Student${pad(i)}`,
            lastName: "User",
            birthDate: buildBirthDate(i % 15),
            yashashManzili: "Farg'ona viloyati",
            parentPhone: `+9989000${pad(i, 4)}`,
          },
        });

        await prisma.enrollment.create({
          data: {
            studentId: student.id,
            classroomId: classroom.id,
          },
        });
      } else {
        const activeEnrollment = await prisma.enrollment.findFirst({
          where: { studentId: existingUser.student.id, isActive: true },
          select: { id: true },
        });
        if (!activeEnrollment) {
          await prisma.enrollment.create({
            data: {
              studentId: existingUser.student.id,
              classroomId: classroom.id,
            },
          });
        }
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

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        firstName: `Student${pad(i)}`,
        lastName: "User",
        birthDate: buildBirthDate(i % 15),
        yashashManzili: "Farg'ona viloyati",
        parentPhone: `+9989000${pad(i, 4)}`,
      },
    });

    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classroomId: classroom.id,
      },
    });

    created += 1;
  }

  return { created, skipped };
}

async function main() {
  await ensureAdmin();
  const subjectIds = await ensureDefaultSubjects();
  const classrooms = await ensureDefaultClassrooms();
  await ensureDefaultVaqtOraliqlari();

  const teacherResult = await seedTeachers(TEACHER_COUNT, subjectIds);
  const studentResult = await seedStudents(200, classrooms);

  console.log("Seed completed");
  console.log(`Subjects => total: ${Object.keys(subjectIds).length}`);
  console.log(`Classrooms => total: ${classrooms.length}`);
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
