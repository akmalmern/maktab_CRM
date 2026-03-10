const { z } = require("zod");

const managerUserIdParamSchema = z.object({
  managerUserId: z.string().cuid("managerUserId noto'g'ri"),
});

const replaceManagerClassroomAccessSchema = z
  .object({
    classroomIds: z
      .array(z.string().cuid("classroomId noto'g'ri"))
      .max(300, "classroomIds ro'yxati juda katta")
      .default([]),
  })
  .strict();

module.exports = {
  managerUserIdParamSchema,
  replaceManagerClassroomAccessSchema,
};
