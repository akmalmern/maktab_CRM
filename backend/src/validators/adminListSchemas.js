const { z } = require("zod");

const pageSchema = z.coerce.number().int().min(1).optional();
const limitSchema = z.coerce.number().int().min(1).max(100).optional();

const emptyToUndefined = (value) => {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === "" ? undefined : s;
};

const searchSchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).max(100).optional(),
);

const subjectFilterSchema = z.preprocess(
  emptyToUndefined,
  z.union([z.literal("all"), z.string().cuid()]).optional(),
);
const classroomFilterSchema = z.preprocess(
  emptyToUndefined,
  z.union([z.literal("all"), z.string().cuid()]).optional(),
);

const teacherSortSchema = z.preprocess(
  emptyToUndefined,
  z
    .enum([
      "name:asc",
      "name:desc",
      "username:asc",
      "username:desc",
      "subject:asc",
      "subject:desc",
      "createdAt:asc",
      "createdAt:desc",
    ])
    .optional(),
);

const studentSortSchema = z.preprocess(
  emptyToUndefined,
  z
    .enum([
      "name:asc",
      "name:desc",
      "username:asc",
      "username:desc",
      "classroom:asc",
      "classroom:desc",
      "createdAt:asc",
      "createdAt:desc",
    ])
    .optional(),
);

const listTeachersQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    search: searchSchema,
    filter: subjectFilterSchema,
    sort: teacherSortSchema,
  })
  .strict();

const listStudentsQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    search: searchSchema,
    filter: classroomFilterSchema,
    sort: studentSortSchema,
  })
  .strict();

const listClassroomStudentsQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    search: searchSchema,
  })
  .strict();

module.exports = {
  listTeachersQuerySchema,
  listStudentsQuerySchema,
  listClassroomStudentsQuerySchema,
};
