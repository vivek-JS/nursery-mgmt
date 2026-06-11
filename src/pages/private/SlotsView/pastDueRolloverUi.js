/** Roles allowed to POST /slots/past-due-rollover/run (matches backend). */
export function canRunPastDueRollover(user, appUser) {
  const role = String(
    user?.role || user?.jobTitle || appUser?.role || appUser?.jobTitle || ""
  ).toUpperCase()
  return ["SUPER_ADMIN", "SUPERADMIN", "OFFICE_ADMIN", "ADMIN"].includes(role)
}
