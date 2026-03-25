const classroomController = require("./controller");
const {
  createClassroomSchema,
  promoteClassroomSchema,
  annualClassPromotionSchema,
  listClassroomStudentsQuerySchema,
  ClassroomIdParamSchema,
  ClassroomStudentParamsSchema,
} = require("./schemas");

function registerAdminClassroomRoutes({
  router,
  asyncHandler,
  requireAuth,
  requireRole,
  validate,
  validateBody,
}) {
  router.get(
    "/classrooms",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(classroomController.getClassrooms),
  );
  router.get(
    "/classrooms/meta",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(classroomController.getClassroomsMeta),
  );
  router.get(
    "/classrooms/:id/students",
    requireAuth,
    requireRole("ADMIN"),
    validate({
      params: ClassroomIdParamSchema,
      query: listClassroomStudentsQuerySchema,
    }),
    asyncHandler(classroomController.getClassroomStudents),
  );
  router.delete(
    "/classrooms/:classroomId/students/:studentId",
    requireAuth,
    requireRole("ADMIN"),
    validate({ params: ClassroomStudentParamsSchema }),
    asyncHandler(classroomController.removeStudentFromClassroom),
  );
  router.post(
    "/classrooms",
    requireAuth,
    requireRole("ADMIN"),
    validateBody(createClassroomSchema),
    asyncHandler(classroomController.createClassroom),
  );
  router.post(
    "/classrooms/:id/promote-preview",
    requireAuth,
    requireRole("ADMIN"),
    validate({ params: ClassroomIdParamSchema, body: promoteClassroomSchema }),
    asyncHandler(classroomController.previewPromoteClassroom),
  );
  router.post(
    "/classrooms/:id/promote",
    requireAuth,
    requireRole("ADMIN"),
    validate({ params: ClassroomIdParamSchema, body: promoteClassroomSchema }),
    asyncHandler(classroomController.promoteClassroom),
  );
  router.get(
    "/classrooms/yillik-otkazish/preview",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(classroomController.previewAnnualClassPromotion),
  );
  router.post(
    "/classrooms/yillik-otkazish",
    requireAuth,
    requireRole("ADMIN"),
    validateBody(annualClassPromotionSchema),
    asyncHandler(classroomController.runAnnualClassPromotion),
  );
  router.delete(
    "/classrooms/:id",
    requireAuth,
    requireRole("ADMIN"),
    validate({ params: ClassroomIdParamSchema }),
    asyncHandler(classroomController.deleteClassroom),
  );
}

module.exports = { registerAdminClassroomRoutes };
