/**
 * Profile endpoints the intranet used on INTRANET-JDH-API, with the same
 * payloads, expected on internal-platform-api (docs/intranet-port.md). Until
 * they exist, the check lets everyone through and the profile pages show
 * their "en preparación" state.
 */
export const ONBOARDING_PATH = "/directory/employees/me/onboarding" as const
export const CONTACT_SCHEDULE_PATH = "/directory/employees/me/contact-schedule" as const

/** Public contact schedule of an employee, same shape as the own one. */
export function contactSchedulePath(id: string) {
  return `/directory/employees/${encodeURIComponent(id)}/contact-schedule` as const
}
