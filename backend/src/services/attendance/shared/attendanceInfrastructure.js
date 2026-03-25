function createAttendanceInfrastructure({ mainOrgKey, mainOrgName }) {
  async function ensureMainOrganization(tx) {
    return tx.organization.upsert({
      where: { key: mainOrgKey },
      update: {},
      create: { key: mainOrgKey, name: mainOrgName },
      select: { id: true },
    });
  }

  return {
    ensureMainOrganization,
  };
}

module.exports = {
  createAttendanceInfrastructure,
};
