export function buildAdminScheduleSectionViewModel(pageState) {
  return {
    data: {
      classrooms: pageState.classrooms,
      subjects: pageState.subjects,
      teachers: pageState.teachers,
      teachersState: pageState.teachersState,
    },
  };
}
