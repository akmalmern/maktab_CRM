require("dotenv").config();

const prisma = require("../src/prisma");
const bcrypt = require("bcrypt");
const { syncStudentOyMajburiyatlar } = require("../src/services/financeMajburiyatService");
const payrollService = require("../src/services/payroll/payrollService");
const { combineLocalDateAndTimeToUtc, utcDateToTashkentIsoDate } = require("../src/utils/tashkentTime");

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const MANAGER_USERNAME = "manager";
const MANAGER_PASSWORD = "manager123";
const DEFAULT_PASSWORD = "12345678";
const DEFAULT_ACADEMIC_YEAR = "2025-2026";

const STUDENT_COUNT = 500;
const STUDENTS_PER_CLASSROOM = 30;
const TEACHERS_PER_SUBJECT = 3;
const ATTENDANCE_BATCH_SIZE = 5000;
const GRADE_BATCH_SIZE = 5000;
const REAL_LESSON_BATCH_SIZE = 3000;

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

const DEFAULT_VAQT_ORALIQLARI = [
  { nomi: "1-para", boshlanishVaqti: "08:30", tugashVaqti: "09:15", tartib: 1 },
  { nomi: "2-para", boshlanishVaqti: "09:25", tugashVaqti: "10:10", tartib: 2 },
  { nomi: "3-para", boshlanishVaqti: "10:20", tugashVaqti: "11:05", tartib: 3 },
  { nomi: "4-para", boshlanishVaqti: "11:15", tugashVaqti: "12:00", tartib: 4 },
  { nomi: "5-para", boshlanishVaqti: "12:10", tugashVaqti: "12:55", tartib: 5 },
  { nomi: "6-para", boshlanishVaqti: "13:05", tugashVaqti: "13:50", tartib: 6 },
];

const HAFTA_KUNLARI = [
  "DUSHANBA",
  "SESHANBA",
  "CHORSHANBA",
  "PAYSHANBA",
  "JUMA",
  "SHANBA",
];

const HAFTA_KUNI_BY_JS_DAY = {
  1: "DUSHANBA",
  2: "SESHANBA",
  3: "CHORSHANBA",
  4: "PAYSHANBA",
  5: "JUMA",
  6: "SHANBA",
};

const TEACHER_FIRST_NAMES = [
  "Akmal", "Dilshod", "Aziza", "Nodira", "Sherzod", "Shaxnoza", "Bekzod",
  "Muhammad", "Ulugbek", "Gulbahor", "Madina", "Sardor", "Jasur", "Laylo",
  "Shahzod", "Malika", "Diyor", "Ozoda", "Komil", "Zilola", "Temur",
  "Suhrob", "Javohir", "Feruza", "Asilbek", "Rayhona", "Oybek", "Nilufar",
  "Ibrohim", "Sitora", "Kamron", "Durdona", "Rustam", "Mavluda", "Bobur",
  "Mohira", "Sanjar", "Munisa", "Abbos", "Dildora",
];

const TEACHER_LAST_NAMES = [
  "Karimov", "Rasulov", "Toshpulatova", "Usmonova", "Aliyev", "Mamadaliyeva",
  "Yuldashev", "Saidov", "Qodirov", "Ergasheva", "Qobilova", "Normatov",
  "Berdiev", "Abdullayeva", "Rahimov", "Islomova", "Nematov", "Sodiqova",
  "Murodov", "Hamidova", "Xudoyberdiyev", "Eshonqulov", "Ruzmetova",
  "Tursunov", "Karimova", "Sobirov", "Raxmonova", "Yusupov", "Gafurova",
  "Shukurov", "Oripova", "Tojiboyev", "Sharipova", "Rafiqov", "Yoqubova",
];

function pad(num, size = 3) {
  return String(num).padStart(size, "0");
}

function buildBirthDate(yearOffset) {
  return new Date(1989 + yearOffset, yearOffset % 12, (yearOffset % 27) + 1);
}

async function pickUniqueTeacherBirthDate({ firstName, lastName, seedIndex, excludeTeacherId = null }) {
  // Existing DBda manual teacher bo'lsa yoki oldingi seeddan orphan data qolgan bo'lsa
  // (firstName,lastName,birthDate) unique collision bo'lishi mumkin.
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = buildBirthDate((seedIndex % 20) + (attempt * 23));
    const conflict = await prisma.teacher.findFirst({
      where: {
        firstName,
        lastName,
        birthDate: candidate,
        ...(excludeTeacherId ? { id: { not: excludeTeacherId } } : {}),
      },
      select: { id: true },
    });
    if (!conflict) return candidate;
  }

  throw new Error(`Teacher birthDate unique topilmadi: ${firstName} ${lastName} (seedIndex=${seedIndex})`);
}

async function pickUniqueStudentBirthDate({ firstName, lastName, seedIndex, excludeStudentId = null }) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = buildBirthDate((seedIndex % 15) + (attempt * 19));
    const conflict = await prisma.student.findFirst({
      where: {
        firstName,
        lastName,
        birthDate: candidate,
        ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}),
      },
      select: { id: true },
    });
    if (!conflict) return candidate;
  }

  throw new Error(`Student birthDate unique topilmadi: ${firstName} ${lastName} (seedIndex=${seedIndex})`);
}

function toUtcDateOnly(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDaysUtc(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function startOfCurrentYearUtc(baseDate) {
  return new Date(Date.UTC(baseDate.getUTCFullYear(), 0, 1));
}

function startOfMonthsAgoUtc(baseDate, monthsAgo) {
  return new Date(
    Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() - monthsAgo, 1),
  );
}

function buildMonthKey(yil, oy) {
  return `${yil}-${String(oy).padStart(2, "0")}`;
}

function buildRecentMonthTuples(baseDate, count) {
  const out = [];
  const start = new Date(
    Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() - (count - 1), 1),
  );
  for (let i = 0; i < count; i += 1) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    out.push({
      yil: d.getUTCFullYear(),
      oy: d.getUTCMonth() + 1,
      key: buildMonthKey(d.getUTCFullYear(), d.getUTCMonth() + 1),
    });
  }
  return out;
}

function defaultEnrollmentStartDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
}

function startOfPayrollSeasonUtc(baseDate = new Date()) {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth() + 1;
  const startYear = month >= 9 ? year : year - 1;
  return new Date(Date.UTC(startYear, 8, 1)); // September 1
}

function formatUtcDateToIso(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function buildMonthTuplesBetweenUtc(startDate, endDate) {
  const out = [];
  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));

  while (cursor <= endMonth) {
    out.push({
      yil: cursor.getUTCFullYear(),
      oy: cursor.getUTCMonth() + 1,
      key: buildMonthKey(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

function endOfMonthUtc(year, month1to12) {
  return new Date(Date.UTC(year, month1to12, 0, 23, 59, 59, 0));
}

function payrollRateForSubjectIndex(index) {
  // 25 000..57 500 oralig'ida, fanlar bo'yicha differensial
  return 25000 + ((index % 14) * 2500);
}

function randomDavomatHolati() {
  const r = Math.random();
  if (r < 0.78) return "KELDI";
  if (r < 0.86) return "KECHIKDI";
  if (r < 0.93) return "SABABLI";
  return "SABABSIZ";
}

function randomBall(maxBall) {
  if (maxBall <= 5) {
    const r = Math.random();
    if (r < 0.1) return 2;
    if (r < 0.3) return 3;
    if (r < 0.75) return 4;
    return 5;
  }

  // 40..100 oralig'i ko'proq real natija beradi
  return 40 + Math.floor(Math.random() * 61);
}

function shouldCreateNazorat(day) {
  const date = day.getUTCDate();
  const weekDay = day.getUTCDay(); // 3 => CHORSHANBA
  return weekDay === 3 && date >= 10 && date <= 16;
}

function shouldCreateOraliq(day) {
  const date = day.getUTCDate();
  const weekDay = day.getUTCDay(); // 4 => PAYSHANBA
  return weekDay === 4 && date >= 24 && date <= 28;
}

function buildClassroomNames(requiredCount) {
  const grades = [5, 6, 7, 8, 9, 10, 11];
  const letters = ["A", "B", "C", "D"];
  const names = [];

  // Avval barcha sinflarning A/B paralellarini to'ldiramiz (10-A, 11-A ham kiradi),
  // keyin kerak bo'lsa C/D lar qo'shiladi.
  for (const letter of letters) {
    for (const grade of grades) {
      names.push(`${grade}-${letter}`);
      if (names.length >= requiredCount) return names;
    }
  }
  return names;
}

function buildAllClassroomNames() {
  return buildClassroomNames(Number.MAX_SAFE_INTEGER);
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

async function ensureManager() {
  const hash = await bcrypt.hash(MANAGER_PASSWORD, 10);
  const exists = await prisma.user.findUnique({ where: { username: MANAGER_USERNAME } });

  if (exists) {
    console.log("Manager already exists");
    return;
  }

  await prisma.user.create({
    data: { role: "MANAGER", username: MANAGER_USERNAME, password: hash },
  });

  console.log("Manager created:", { username: MANAGER_USERNAME, password: MANAGER_PASSWORD });
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
  const names = buildAllClassroomNames();
  const classrooms = [];

  for (const name of names) {
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

async function seedTeachers(subjectIds) {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const teacherPlan = [];

  for (let sIdx = 0; sIdx < SCHOOL_SUBJECTS.length; sIdx += 1) {
    const subjectName = SCHOOL_SUBJECTS[sIdx];
    for (let i = 1; i <= TEACHERS_PER_SUBJECT; i += 1) {
      const ix = sIdx * TEACHERS_PER_SUBJECT + (i - 1);
      teacherPlan.push({
        subjectName,
        firstName: TEACHER_FIRST_NAMES[ix % TEACHER_FIRST_NAMES.length],
        lastName: TEACHER_LAST_NAMES[ix % TEACHER_LAST_NAMES.length],
      });
    }
  }

  let created = 0;
  let updated = 0;

  for (let i = 1; i <= teacherPlan.length; i += 1) {
    const username = `teacher${pad(i)}`;
    const row = teacherPlan[i - 1];
    const subjectId = subjectIds[row.subjectName];

    const existingUser = await prisma.user.findUnique({
      where: { username },
      include: { teacher: true },
    });

    if (existingUser) {
      if (!existingUser.teacher) {
        const birthDate = await pickUniqueTeacherBirthDate({
          firstName: row.firstName,
          lastName: row.lastName,
          seedIndex: i,
        });
        await prisma.teacher.create({
          data: {
            userId: existingUser.id,
            firstName: row.firstName,
            lastName: row.lastName,
            birthDate,
            yashashManzili: "Toshkent shahri",
            subjectId,
          },
        });
      } else {
        const birthDate = await pickUniqueTeacherBirthDate({
          firstName: row.firstName,
          lastName: row.lastName,
          seedIndex: i,
          excludeTeacherId: existingUser.teacher.id,
        });
        await prisma.teacher.update({
          where: { id: existingUser.teacher.id },
          data: {
            firstName: row.firstName,
            lastName: row.lastName,
            birthDate,
            yashashManzili: "Toshkent shahri",
            subjectId,
          },
        });
      }
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { phone: `+9989001${pad(i, 4)}` },
      });
      updated += 1;
      continue;
    }

    const user = await prisma.user.create({
      data: {
        role: "TEACHER",
        username,
        password: hash,
        phone: `+9989001${pad(i, 4)}`,
      },
    });

    const birthDate = await pickUniqueTeacherBirthDate({
      firstName: row.firstName,
      lastName: row.lastName,
      seedIndex: i,
    });
    await prisma.teacher.create({
      data: {
        userId: user.id,
        firstName: row.firstName,
        lastName: row.lastName,
        birthDate,
        yashashManzili: "Toshkent shahri",
        subjectId,
      },
    });

    created += 1;
  }

  return { created, updated, total: teacherPlan.length };
}

async function seedStudents(count, classrooms) {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0;
  let updated = 0;

  for (let i = 1; i <= count; i += 1) {
    const username = `student${pad(i)}`;
    // Barcha sinflarda student bo'lishi uchun round-robin taqsimlaymiz.
    const classroom = classrooms[(i - 1) % classrooms.length];

    const existingUser = await prisma.user.findUnique({
      where: { username },
      include: { student: true },
    });

    if (existingUser) {
      let studentId = existingUser.student?.id;
      if (!existingUser.student) {
        const birthDate = await pickUniqueStudentBirthDate({
          firstName: `Student${pad(i)}`,
          lastName: "User",
          seedIndex: i,
        });
        const student = await prisma.student.create({
          data: {
            userId: existingUser.id,
            firstName: `Student${pad(i)}`,
            lastName: "User",
            birthDate,
            yashashManzili: "Farg'ona viloyati",
            parentPhone: `+9989300${pad(i, 4)}`,
          },
        });
        studentId = student.id;
      } else {
        const birthDate = await pickUniqueStudentBirthDate({
          firstName: `Student${pad(i)}`,
          lastName: "User",
          seedIndex: i,
          excludeStudentId: existingUser.student.id,
        });
        await prisma.student.update({
          where: { id: existingUser.student.id },
          data: {
            firstName: `Student${pad(i)}`,
            lastName: "User",
            birthDate,
            yashashManzili: "Farg'ona viloyati",
            parentPhone: `+9989300${pad(i, 4)}`,
          },
        });
      }

      await prisma.user.update({
        where: { id: existingUser.id },
        data: { phone: `+9989100${pad(i, 4)}` },
      });

      await prisma.enrollment.updateMany({
        where: { studentId, isActive: true },
        data: { isActive: false, endDate: new Date() },
      });

      await prisma.enrollment.create({
        data: {
          studentId,
          classroomId: classroom.id,
          startDate: defaultEnrollmentStartDate(),
        },
      });

      updated += 1;
      continue;
    }

    const user = await prisma.user.create({
      data: {
        role: "STUDENT",
        username,
        password: hash,
        phone: `+9989100${pad(i, 4)}`,
      },
    });

    const birthDate = await pickUniqueStudentBirthDate({
      firstName: `Student${pad(i)}`,
      lastName: "User",
      seedIndex: i,
    });
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        firstName: `Student${pad(i)}`,
        lastName: "User",
        birthDate,
        yashashManzili: "Farg'ona viloyati",
        parentPhone: `+9989300${pad(i, 4)}`,
      },
    });

    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classroomId: classroom.id,
        startDate: defaultEnrollmentStartDate(),
      },
    });

    created += 1;
  }

  return { created, updated, total: count };
}

async function seedSchedule(classrooms, subjectIds) {
  const subjects = await prisma.subject.findMany({
    where: { id: { in: Object.values(subjectIds) } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const timeSlots = await prisma.vaqtOraliq.findMany({ orderBy: { tartib: "asc" } });
  const teachers = await prisma.teacher.findMany({
    where: { subjectId: { not: null } },
    select: { id: true, subjectId: true },
    orderBy: { createdAt: "asc" },
  });

  const teachersBySubject = new Map();
  for (const t of teachers) {
    if (!teachersBySubject.has(t.subjectId)) teachersBySubject.set(t.subjectId, []);
    teachersBySubject.get(t.subjectId).push(t.id);
  }

  // Unique index (oqituvchiId, haftaKuni, vaqtOraliqId, oquvYili) bilan
  // to'qnashmaslik uchun shu o'quv yilidagi barcha jadval yozuvlarini tozalaymiz.
  await prisma.darsJadvali.deleteMany({
    where: { oquvYili: DEFAULT_ACADEMIC_YEAR },
  });

  const teacherBusy = new Map(); // key: DUSHANBA__slotId -> Set(teacherId)
  const rows = [];

  for (let cIdx = 0; cIdx < classrooms.length; cIdx += 1) {
    const classroom = classrooms[cIdx];

    for (let dIdx = 0; dIdx < HAFTA_KUNLARI.length; dIdx += 1) {
      const day = HAFTA_KUNLARI[dIdx];

      for (let sIdx = 0; sIdx < timeSlots.length; sIdx += 1) {
        const slot = timeSlots[sIdx];
        const subject = subjects[(cIdx + dIdx + sIdx) % subjects.length];
        const candidates = teachersBySubject.get(subject.id) || [];

        if (!candidates.length) continue;

        const busyKey = `${day}__${slot.id}`;
        if (!teacherBusy.has(busyKey)) teacherBusy.set(busyKey, new Set());
        const busySet = teacherBusy.get(busyKey);

        let selectedTeacherId = null;
        for (let i = 0; i < candidates.length; i += 1) {
          const candidate = candidates[(cIdx + dIdx + sIdx + i) % candidates.length];
          if (!busySet.has(candidate)) {
            selectedTeacherId = candidate;
            break;
          }
        }

        if (!selectedTeacherId) continue;
        busySet.add(selectedTeacherId);

        rows.push({
          sinfId: classroom.id,
          oqituvchiId: selectedTeacherId,
          fanId: subject.id,
          haftaKuni: day,
          vaqtOraliqId: slot.id,
          oquvYili: DEFAULT_ACADEMIC_YEAR,
        });
      }
    }
  }

  if (rows.length) {
    await prisma.darsJadvali.createMany({ data: rows });
  }

  return { created: rows.length };
}

async function seedAttendanceAndGradesHistory() {
  const today = toUtcDateOnly(new Date());
  const startDate = startOfMonthsAgoUtc(today, 2);

  const darslar = await prisma.darsJadvali.findMany({
    where: { oquvYili: DEFAULT_ACADEMIC_YEAR },
    select: { id: true, sinfId: true, oqituvchiId: true, haftaKuni: true },
  });

  if (!darslar.length) {
    return { deleted: 0, created: 0, startDate, endDate: today };
  }

  const sinfIds = [...new Set(darslar.map((d) => d.sinfId))];
  const enrollments = await prisma.enrollment.findMany({
    where: { isActive: true, classroomId: { in: sinfIds } },
    select: { classroomId: true, studentId: true },
  });

  const studentsByClassroom = new Map();
  for (const row of enrollments) {
    if (!studentsByClassroom.has(row.classroomId)) studentsByClassroom.set(row.classroomId, []);
    studentsByClassroom.get(row.classroomId).push(row.studentId);
  }

  const darslarByDay = new Map();
  for (const dars of darslar) {
    if (!darslarByDay.has(dars.haftaKuni)) darslarByDay.set(dars.haftaKuni, []);
    darslarByDay.get(dars.haftaKuni).push(dars);
  }

  const [deletedDavomat, deletedBaholar] = await Promise.all([
    prisma.davomat.deleteMany({
      where: { sana: { gte: startDate, lte: today } },
    }),
    prisma.baho.deleteMany({
      where: { sana: { gte: startDate, lte: today } },
    }),
  ]);

  let createdDavomat = 0;
  let createdBaholar = 0;
  let davomatBatch = [];
  let bahoBatch = [];

  async function flushDavomatBatch() {
    if (!davomatBatch.length) return;
    await prisma.davomat.createMany({ data: davomatBatch });
    createdDavomat += davomatBatch.length;
    davomatBatch = [];
  }

  async function flushBahoBatch() {
    if (!bahoBatch.length) return;
    await prisma.baho.createMany({ data: bahoBatch });
    createdBaholar += bahoBatch.length;
    bahoBatch = [];
  }

  for (let day = startDate; day <= today; day = addDaysUtc(day, 1)) {
    const haftaKuni = HAFTA_KUNI_BY_JS_DAY[day.getUTCDay()];
    if (!haftaKuni) continue; // Yakshanba yo'q

    const darslarShuKuni = darslarByDay.get(haftaKuni) || [];
    if (!darslarShuKuni.length) continue;

    const isNazoratDay = shouldCreateNazorat(day);
    const isOraliqDay = shouldCreateOraliq(day);

    for (const dars of darslarShuKuni) {
      const studentIds = studentsByClassroom.get(dars.sinfId) || [];
      if (!studentIds.length) continue;

      for (const studentId of studentIds) {
        const holat = randomDavomatHolati();
        davomatBatch.push({
          darsJadvaliId: dars.id,
          studentId,
          belgilaganTeacherId: dars.oqituvchiId,
          sana: day,
          holat,
          izoh: holat === "SABABLI" ? "Seed: sababli yo'q" : null,
        });

        // Barcha o'quvchilar profillarida baholar ko'rinishi uchun
        // seedda har bir dars yozuvi bo'yicha JORIY baho yaratiladi.
        bahoBatch.push({
          darsJadvaliId: dars.id,
          studentId,
          teacherId: dars.oqituvchiId,
          sana: day,
          turi: "JORIY",
          ball: randomBall(5),
          maxBall: 5,
          izoh: null,
        });

        // NAZORAT: belgilangan nazorat kunlarida barcha o'quvchilar uchun.
        if (isNazoratDay) {
          bahoBatch.push({
            darsJadvaliId: dars.id,
            studentId,
            teacherId: dars.oqituvchiId,
            sana: day,
            turi: "NAZORAT",
            ball: randomBall(100),
            maxBall: 100,
            izoh: "Seed: nazorat bahosi",
          });
        }

        // ORALIQ: belgilangan oraliq kunlarida barcha o'quvchilar uchun.
        if (isOraliqDay) {
          bahoBatch.push({
            darsJadvaliId: dars.id,
            studentId,
            teacherId: dars.oqituvchiId,
            sana: day,
            turi: "ORALIQ",
            ball: randomBall(100),
            maxBall: 100,
            izoh: "Seed: oraliq bahosi",
          });
        }

        if (davomatBatch.length >= ATTENDANCE_BATCH_SIZE) {
          await flushDavomatBatch();
        }
        if (bahoBatch.length >= GRADE_BATCH_SIZE) {
          await flushBahoBatch();
        }
      }
    }
  }

  await flushDavomatBatch();
  await flushBahoBatch();

  return {
    deletedDavomat: deletedDavomat.count,
    deletedBaholar: deletedBaholar.count,
    createdDavomat,
    createdBaholar,
    startDate,
    endDate: today,
  };
}

async function seedTodayAttendanceIfMissing() {
  const today = toUtcDateOnly(new Date());
  const jsDay = today.getUTCDay();
  const targetHaftaKuni = HAFTA_KUNI_BY_JS_DAY[jsDay] || "SHANBA";

  const darslar = await prisma.darsJadvali.findMany({
    where: { oquvYili: DEFAULT_ACADEMIC_YEAR, haftaKuni: targetHaftaKuni },
    select: { id: true, sinfId: true, oqituvchiId: true },
  });

  if (!darslar.length) {
    return { created: 0, skipped: true };
  }

  const sinfIds = [...new Set(darslar.map((d) => d.sinfId))];
  const enrollments = await prisma.enrollment.findMany({
    where: { isActive: true, classroomId: { in: sinfIds } },
    select: { classroomId: true, studentId: true },
  });
  const studentsByClassroom = new Map();
  for (const row of enrollments) {
    if (!studentsByClassroom.has(row.classroomId)) studentsByClassroom.set(row.classroomId, []);
    studentsByClassroom.get(row.classroomId).push(row.studentId);
  }

  let created = 0;
  for (const dars of darslar) {
    const studentIds = studentsByClassroom.get(dars.sinfId) || [];
    if (!studentIds.length) continue;

    const existing = await prisma.davomat.findMany({
      where: { darsJadvaliId: dars.id, sana: today, studentId: { in: studentIds } },
      select: { studentId: true },
    });
    const existingSet = new Set(existing.map((e) => e.studentId));

    const rows = [];
    for (const studentId of studentIds) {
      if (existingSet.has(studentId)) continue;
      const holat = randomDavomatHolati();
      rows.push({
        darsJadvaliId: dars.id,
        studentId,
        belgilaganTeacherId: dars.oqituvchiId,
        sana: today,
        holat,
        izoh: holat === "SABABLI" ? "Seed: bugungi sababli yo'q" : null,
      });
    }

    if (rows.length) {
      await prisma.davomat.createMany({ data: rows, skipDuplicates: true });
      created += rows.length;
    }
  }

  return { created, skipped: false };
}

async function seedFinanceData() {
  const settings = await prisma.moliyaSozlama.upsert({
    where: { key: "MAIN" },
    update: {},
    create: {
      key: "MAIN",
      oylikSumma: 300000,
      yillikSumma: 3000000,
    },
  });

  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (!adminUser) {
    throw new Error("ADMIN user topilmadi. Avval admin yaratilishi kerak.");
  }

  const students = await prisma.student.findMany({
    where: {
      enrollments: {
        some: { isActive: true },
      },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!students.length) {
    return {
      students: 0,
      transactions: 0,
      qoplamalar: 0,
      imtiyozlar: 0,
      thisMonthDebtors: 0,
      twoThreeMonthDebtors: 0,
      debtFree: 0,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.studentOyMajburiyat.deleteMany({});
    await tx.tolovQoplama.deleteMany({});
    await tx.tolovTranzaksiya.deleteMany({});
    await tx.tolovImtiyozi.deleteMany({});
  });

  const now = new Date();
  const recentMonths = buildRecentMonthTuples(now, 6);
  let transactionCount = 0;
  let qoplamaCount = 0;
  let imtiyozCount = 0;

  for (let i = 0; i < students.length; i += 1) {
    const studentId = students[i].id;
    const pattern = i % 4;
    const unpaidCount = pattern === 0 ? 0 : pattern === 1 ? 1 : pattern === 2 ? 2 : 3;
    const paidMonths = recentMonths.slice(0, recentMonths.length - unpaidCount);

    if (paidMonths.length) {
      const txn = await prisma.tolovTranzaksiya.create({
        data: {
          studentId,
          adminUserId: adminUser.id,
          turi: "OYLIK",
          summa: paidMonths.length * settings.oylikSumma,
          izoh: "Seed: moliya test ma'lumoti",
          tarifVersionId: settings.faolTarifId || null,
          tarifSnapshot: {
            oylikSumma: settings.oylikSumma,
            yillikSumma: settings.yillikSumma,
            faolTarifId: settings.faolTarifId || null,
          },
        },
      });
      transactionCount += 1;

      await prisma.tolovQoplama.createMany({
        data: paidMonths.map((m) => ({
          studentId,
          tranzaksiyaId: txn.id,
          yil: m.yil,
          oy: m.oy,
        })),
        skipDuplicates: true,
      });
      qoplamaCount += paidMonths.length;
    }

    if (i < 24) {
      let turi = "FOIZ";
      let qiymat = 20;
      let sabab = "Seed: ijtimoiy imtiyoz";
      if (i >= 8 && i < 16) {
        turi = "SUMMA";
        qiymat = 100000;
        sabab = "Seed: yutuq uchun imtiyoz";
      }
      if (i >= 16) {
        turi = "TOLIQ_OZOD";
        qiymat = null;
        sabab = "Seed: to'liq ozod";
      }

      await prisma.tolovImtiyozi.create({
        data: {
          ...(function parseStartMonthParts(monthKey) {
            const [y, m] = String(monthKey || "").split("-");
            const yil = Number.parseInt(y, 10);
            const oy = Number.parseInt(m, 10);
            return {
              boshlanishYil:
                Number.isFinite(yil) && Number.isFinite(oy) ? yil : null,
              boshlanishOyRaqam:
                Number.isFinite(yil) && Number.isFinite(oy) ? oy : null,
            };
          })(recentMonths[recentMonths.length - 1].key),
          studentId,
          adminUserId: adminUser.id,
          turi,
          qiymat,
          oylarSoni: 1,
          oylarSnapshot: [],
          sabab,
          izoh: "Seed imtiyoz",
          isActive: true,
        },
      });
      imtiyozCount += 1;
    }
  }

  await syncStudentOyMajburiyatlar({
    studentIds: students.map((s) => s.id),
    oylikSumma: settings.oylikSumma,
    futureMonths: 0,
  });

  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  const thisMonthDebtors = await prisma.studentOyMajburiyat.groupBy({
    by: ["studentId"],
    where: {
      yil: currentYear,
      oy: currentMonth,
      holat: "BELGILANDI",
      netSumma: { gt: 0 },
    },
    _count: { studentId: true },
  });

  const debtAgg = await prisma.studentOyMajburiyat.groupBy({
    by: ["studentId"],
    where: {
      holat: "BELGILANDI",
      netSumma: { gt: 0 },
      OR: [
        { yil: { lt: currentYear } },
        { yil: currentYear, oy: { lte: currentMonth } },
      ],
    },
    _count: { studentId: true },
  });

  let twoThreeMonthDebtors = 0;
  let debtFree = 0;
  for (const row of debtAgg) {
    const count = Number(row._count?.studentId || 0);
    if (count === 2 || count === 3) twoThreeMonthDebtors += 1;
  }
  debtFree = students.length - debtAgg.length;

  return {
    students: students.length,
    transactions: transactionCount,
    qoplamalar: qoplamaCount,
    imtiyozlar: imtiyozCount,
    thisMonthDebtors: thisMonthDebtors.length,
    twoThreeMonthDebtors,
    debtFree,
  };
}

async function ensurePayrollOrganization() {
  return prisma.organization.upsert({
    where: { key: "MAIN" },
    update: { name: "Asosiy tashkilot" },
    create: { key: "MAIN", name: "Asosiy tashkilot" },
    select: { id: true, key: true, name: true },
  });
}

function seedEmployeeNameFromUsername(username, role) {
  if (!username) {
    return {
      firstName: role === "MANAGER" ? "Manager" : role === "ADMIN" ? "Admin" : "Xodim",
      lastName: null,
    };
  }
  return {
    firstName: role === "MANAGER" ? "Manager" : role === "ADMIN" ? "Admin" : "Teacher",
    lastName: username,
  };
}

async function seedEmployeesForStaff({ organizationId }) {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "MANAGER", "TEACHER"] },
    },
    include: {
      admin: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      teacher: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      employee: { select: { id: true, organizationId: true } },
    },
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });

  let created = 0;
  let updated = 0;
  let linkedTeachers = 0;
  let linkedAdmins = 0;
  const byKind = { ADMIN: 0, MANAGER: 0, TEACHER: 0 };

  for (const user of users) {
    let kind = "STAFF";
    let payrollMode = "MANUAL_ONLY";
    if (user.role === "TEACHER") {
      kind = "TEACHER";
      payrollMode = "LESSON_BASED";
    } else if (user.role === "ADMIN") {
      kind = "ADMIN";
    } else if (user.role === "MANAGER") {
      kind = "MANAGER";
    }

    if (byKind[kind] == null) byKind[kind] = 0;
    byKind[kind] += 1;

    const fallbackNames = seedEmployeeNameFromUsername(user.username, user.role);
    const firstName = user.teacher?.firstName || user.admin?.firstName || fallbackNames.firstName;
    const lastName = user.teacher?.lastName || user.admin?.lastName || fallbackNames.lastName;

    const before = user.employee;
    const employee = await prisma.employee.upsert({
      where: { userId: user.id },
      update: {
        organizationId,
        kind,
        payrollMode,
        employmentStatus: user.isActive ? "ACTIVE" : "ARCHIVED",
        isPayrollEligible: true,
        firstName: firstName || null,
        lastName: lastName || null,
      },
      create: {
        organizationId,
        userId: user.id,
        kind,
        payrollMode,
        employmentStatus: user.isActive ? "ACTIVE" : "ARCHIVED",
        isPayrollEligible: true,
        firstName: firstName || null,
        lastName: lastName || null,
        note: "Seed: unified employee payroll owner",
      },
      select: { id: true },
    });

    if (before?.id) {
      updated += 1;
    } else {
      created += 1;
    }

    if (user.teacher && user.teacher.employeeId !== employee.id) {
      await prisma.teacher.update({
        where: { id: user.teacher.id },
        data: { employeeId: employee.id },
      });
      linkedTeachers += 1;
    }
    if (user.admin && user.admin.employeeId !== employee.id) {
      await prisma.admin.update({
        where: { id: user.admin.id },
        data: { employeeId: employee.id },
      });
      linkedAdmins += 1;
    }
  }

  return {
    totalUsers: users.length,
    created,
    updated,
    linkedTeachers,
    linkedAdmins,
    byKind,
  };
}

async function seedPayrollSubjectRates({ organizationId, startDateUtc }) {
  const scheduleSubjects = await prisma.darsJadvali.findMany({
    where: { oquvYili: DEFAULT_ACADEMIC_YEAR },
    select: { fanId: true, fan: { select: { id: true, name: true } } },
    distinct: ["fanId"],
    orderBy: { fanId: "asc" },
  });

  if (!scheduleSubjects.length) {
    return { deletedTeacherRates: 0, deletedSubjectRates: 0, createdSubjectRates: 0, coveredSubjects: 0 };
  }

  const [deletedTeacherRates, deletedSubjectRates] = await Promise.all([
    prisma.teacherRate.deleteMany({ where: { organizationId } }),
    prisma.subjectDefaultRate.deleteMany({ where: { organizationId } }),
  ]);

  const rows = scheduleSubjects.map((row, idx) => ({
    organizationId,
    subjectId: row.fanId,
    ratePerHour: payrollRateForSubjectIndex(idx),
    effectiveFrom: startDateUtc,
    effectiveTo: null,
    note: `Seed payroll rate (${row.fan?.name || row.fanId})`,
  }));

  if (rows.length) {
    await prisma.subjectDefaultRate.createMany({ data: rows });
  }

  return {
    deletedTeacherRates: deletedTeacherRates.count,
    deletedSubjectRates: deletedSubjectRates.count,
    createdSubjectRates: rows.length,
    coveredSubjects: rows.length,
  };
}

async function seedPayrollRealLessonsHistory({ organizationId, startDateUtc, endDateUtc }) {
  const darslar = await prisma.darsJadvali.findMany({
    where: { oquvYili: DEFAULT_ACADEMIC_YEAR },
    select: {
      id: true,
      sinfId: true,
      oqituvchiId: true,
      fanId: true,
      haftaKuni: true,
      vaqtOraliq: {
        select: {
          boshlanishVaqti: true,
          tugashVaqti: true,
        },
      },
    },
    orderBy: [{ haftaKuni: "asc" }, { vaqtOraliq: { tartib: "asc" } }],
  });

  if (!darslar.length) {
    return {
      deleted: 0,
      created: 0,
      startDate: startDateUtc,
      endDate: endDateUtc,
      months: 0,
    };
  }

  const rangeEndExclusive = addDaysUtc(endDateUtc, 1);
  const deleted = await prisma.realLesson.deleteMany({
    where: {
      organizationId,
      startAt: { gte: startDateUtc, lt: rangeEndExclusive },
    },
  });

  const darslarByDay = new Map();
  for (const dars of darslar) {
    const key = dars.haftaKuni;
    if (!darslarByDay.has(key)) darslarByDay.set(key, []);
    darslarByDay.get(key).push(dars);
  }

  let created = 0;
  let batch = [];

  async function flushBatch() {
    if (!batch.length) return;
    await prisma.realLesson.createMany({ data: batch });
    created += batch.length;
    batch = [];
  }

  for (let day = new Date(startDateUtc); day <= endDateUtc; day = addDaysUtc(day, 1)) {
    const haftaKuni = HAFTA_KUNI_BY_JS_DAY[day.getUTCDay()];
    if (!haftaKuni) continue; // Yakshanba yo'q

    const rows = darslarByDay.get(haftaKuni) || [];
    if (!rows.length) continue;

    const localDateIso = formatUtcDateToIso(day);
    for (const dars of rows) {
      const startAt = combineLocalDateAndTimeToUtc(localDateIso, dars.vaqtOraliq?.boshlanishVaqti);
      const endAt = combineLocalDateAndTimeToUtc(localDateIso, dars.vaqtOraliq?.tugashVaqti);
      if (!startAt || !endAt || endAt <= startAt) continue;

      const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60000);
      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) continue;

      batch.push({
        organizationId,
        teacherId: dars.oqituvchiId,
        subjectId: dars.fanId,
        classroomId: dars.sinfId,
        darsJadvaliId: dars.id,
        startAt,
        endAt,
        durationMinutes,
        status: "DONE",
        note: "Seed payroll lesson",
      });

      if (batch.length >= REAL_LESSON_BATCH_SIZE) {
        await flushBatch();
      }
    }
  }

  await flushBatch();

  return {
    deleted: deleted.count,
    created,
    startDate: startDateUtc,
    endDate: endDateUtc,
    months: buildMonthTuplesBetweenUtc(startDateUtc, endDateUtc).length,
  };
}

async function seedPayrollRunsHistory({ adminUserId, startDateUtc, endDateUtc }) {
  const monthTuples = buildMonthTuplesBetweenUtc(startDateUtc, endDateUtc);
  if (!monthTuples.length) {
    return { months: [], generated: 0, approved: 0, paid: 0, totals: [] };
  }

  const org = await ensurePayrollOrganization();
  await prisma.payrollRun.deleteMany({
    where: {
      organizationId: org.id,
      periodMonth: { in: monthTuples.map((m) => m.key) },
    },
  });

  const totals = [];
  let generated = 0;
  let approved = 0;
  let paid = 0;

  for (const month of monthTuples) {
    const generatedRes = await payrollService.generatePayrollRun({
      body: { periodMonth: month.key },
      actorUserId: adminUserId,
      req: null,
    });
    generated += 1;

    const run = generatedRes?.run;
    if (!run?.id) {
      throw new Error(`Payroll run generate natijasi noto'g'ri: ${month.key}`);
    }

    if ((run.sourceLessonsCount || 0) > 0) {
      await payrollService.approvePayrollRun({
        runId: run.id,
        actorUserId: adminUserId,
        req: null,
      });
      approved += 1;

      const isCurrentMonth =
        month.yil === endDateUtc.getUTCFullYear() &&
        month.oy === endDateUtc.getUTCMonth() + 1;

      const paidAt = isCurrentMonth
        ? new Date()
        : endOfMonthUtc(month.yil, month.oy);

      const payRes = await payrollService.payPayrollRun({
        runId: run.id,
        body: {
          paymentMethod: "BANK",
          paidAt,
          externalRef: `SEED-PAYROLL-${month.key}`,
          note: "Seed payroll to'lovi",
        },
        actorUserId: adminUserId,
        req: null,
      });
      paid += 1;

      totals.push({
        periodMonth: month.key,
        status: payRes?.run?.status || "PAID",
        teacherCount: Number(payRes?.run?.teacherCount || run.teacherCount || 0),
        lessons: Number(payRes?.run?.sourceLessonsCount || run.sourceLessonsCount || 0),
        payableAmount: Number(payRes?.run?.payableAmount || run.payableAmount || 0),
      });
    } else {
      totals.push({
        periodMonth: month.key,
        status: run.status || "DRAFT",
        teacherCount: Number(run.teacherCount || 0),
        lessons: Number(run.sourceLessonsCount || 0),
        payableAmount: Number(run.payableAmount || 0),
      });
    }
  }

  return {
    months: monthTuples.map((m) => m.key),
    generated,
    approved,
    paid,
    totals,
  };
}

async function seedPayrollFromSeptemberToCurrentMonth() {
  const todayUtc = toUtcDateOnly(new Date());
  const payrollStartDate = startOfPayrollSeasonUtc(todayUtc);

  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    select: { id: true, username: true },
  });
  if (!adminUser) {
    throw new Error("Payroll seed uchun ADMIN user topilmadi");
  }

  const org = await ensurePayrollOrganization();
  const employeesResult = await seedEmployeesForStaff({ organizationId: org.id });

  const ratesResult = await seedPayrollSubjectRates({
    organizationId: org.id,
    startDateUtc: payrollStartDate,
  });

  const realLessonsResult = await seedPayrollRealLessonsHistory({
    organizationId: org.id,
    startDateUtc: payrollStartDate,
    endDateUtc: todayUtc,
  });

  const runsResult = await seedPayrollRunsHistory({
    adminUserId: adminUser.id,
    startDateUtc: payrollStartDate,
    endDateUtc: todayUtc,
  });

  const totalPayable = runsResult.totals.reduce(
    (acc, row) => acc + Number(row.payableAmount || 0),
    0,
  );

  return {
    organizationKey: org.key,
    startDate: payrollStartDate,
    endDate: todayUtc,
    localEndDate: utcDateToTashkentIsoDate(todayUtc),
    employees: employeesResult,
    rates: ratesResult,
    realLessons: realLessonsResult,
    runs: runsResult,
    totalPayable,
  };
}

async function seedAttendanceHistory(months = 0) {
  // Eski nom bilan chaqirilgan joylar bo'lsa moslik uchun qoldirildi.
  if (months) {
    // no-op
  }
  return seedAttendanceAndGradesHistory();
}

/* old implementation removed
  const deleted = await prisma.davomat.deleteMany({
    where: { sana: { gte: startDate, lte: today } },
  });

  let created = 0;
  let batch = [];

  async function flushBatch() {
    if (!batch.length) return;
    await prisma.davomat.createMany({ data: batch });
    created += batch.length;
    batch = [];
  }

  for (let day = startDate; day <= today; day = addDaysUtc(day, 1)) {
    const haftaKuni = HAFTA_KUNI_BY_JS_DAY[day.getUTCDay()];
    if (!haftaKuni) continue; // Yakshanba yo'q

    const darslarShuKuni = darslarByDay.get(haftaKuni) || [];
    if (!darslarShuKuni.length) continue;

    for (const dars of darslarShuKuni) {
      const studentIds = studentsByClassroom.get(dars.sinfId) || [];
      if (!studentIds.length) continue;

      for (const studentId of studentIds) {
        const holat = randomDavomatHolati();
        batch.push({
          darsJadvaliId: dars.id,
          studentId,
          belgilaganTeacherId: dars.oqituvchiId,
          sana: day,
          holat,
          izoh: holat === "SABABLI" ? "Seed: sababli yo'q" : null,
        });

        if (batch.length >= ATTENDANCE_BATCH_SIZE) {
          await flushBatch();
        }
      }
    }
  }

  await flushBatch();

  return {
    deleted: deleted.count,
    created,
    startDate,
    endDate: today,
  };
}
*/

async function main() {
  await ensureAdmin();
  await ensureManager();

  const subjectIds = await ensureDefaultSubjects();
  const classrooms = await ensureDefaultClassrooms();
  await ensureDefaultVaqtOraliqlari();

  const teacherResult = await seedTeachers(subjectIds);
  const studentResult = await seedStudents(STUDENT_COUNT, classrooms);
  const scheduleResult = await seedSchedule(classrooms, subjectIds);
  const historyResult = await seedAttendanceAndGradesHistory();
  const todayAttendance = await seedTodayAttendanceIfMissing();
  const financeResult = await seedFinanceData();
  const payrollResult = await seedPayrollFromSeptemberToCurrentMonth();

  console.log("Seed completed");
  console.log(`Subjects => total: ${Object.keys(subjectIds).length}`);
  console.log(`Classrooms => total: ${classrooms.length}`);
  console.log(`Teachers => target: ${teacherResult.total}, created: ${teacherResult.created}, updated: ${teacherResult.updated}`);
  console.log(`Students => target: ${studentResult.total}, created: ${studentResult.created}, updated: ${studentResult.updated}`);
  console.log(`Schedule lessons => created: ${scheduleResult.created}`);
  console.log(
    `Attendance (3 oy -> bugun) => deleted: ${historyResult.deletedDavomat}, created: ${historyResult.createdDavomat}, range: ${historyResult.startDate.toISOString().slice(0, 10)}..${historyResult.endDate.toISOString().slice(0, 10)}`,
  );
  console.log(`Today attendance ensure => created: ${todayAttendance.created}, skipped: ${todayAttendance.skipped}`);
  console.log(
    `Grades (JORIY/NAZORAT/ORALIQ) => deleted: ${historyResult.deletedBaholar}, created: ${historyResult.createdBaholar}`,
  );
  console.log(
    `Finance => students: ${financeResult.students}, transactions: ${financeResult.transactions}, qoplamalar: ${financeResult.qoplamalar}, imtiyozlar: ${financeResult.imtiyozlar}`,
  );
  console.log(
    `Finance segments => shu oy qarzdor: ${financeResult.thisMonthDebtors}, 2-3 oy qarzdor: ${financeResult.twoThreeMonthDebtors}, qarzi yo'q: ${financeResult.debtFree}`,
  );
  console.log(
    `Payroll range (Sep -> current month) => ${payrollResult.startDate.toISOString().slice(0, 10)}..${payrollResult.endDate.toISOString().slice(0, 10)} (${payrollResult.runs.months.length} oy)`,
  );
  console.log(
    `Payroll employees => total: ${payrollResult.employees.totalUsers}, created: ${payrollResult.employees.created}, updated: ${payrollResult.employees.updated}, linkedTeachers: ${payrollResult.employees.linkedTeachers}, linkedAdmins: ${payrollResult.employees.linkedAdmins}`,
  );
  console.log(
    `Payroll employees by kind => ADMIN: ${payrollResult.employees.byKind.ADMIN || 0}, MANAGER: ${payrollResult.employees.byKind.MANAGER || 0}, TEACHER: ${payrollResult.employees.byKind.TEACHER || 0}`,
  );
  console.log(
    `Payroll rates => subjectRates created: ${payrollResult.rates.createdSubjectRates}, deletedTeacherRates: ${payrollResult.rates.deletedTeacherRates}, deletedSubjectRates: ${payrollResult.rates.deletedSubjectRates}`,
  );
  console.log(
    `Payroll realLessons => deleted: ${payrollResult.realLessons.deleted}, created: ${payrollResult.realLessons.created}`,
  );
  console.log(
    `Payroll runs => generated: ${payrollResult.runs.generated}, approved: ${payrollResult.runs.approved}, paid: ${payrollResult.runs.paid}, total payable: ${Math.round(payrollResult.totalPayable)}`,
  );
  console.log(
    `Payroll months => ${payrollResult.runs.totals.map((row) => `${row.periodMonth}:${row.status}`).join(", ")}`,
  );
  console.log(`Default password for teacher/student: ${DEFAULT_PASSWORD}`);
  console.log(`Manager credentials: ${MANAGER_USERNAME} / ${MANAGER_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
