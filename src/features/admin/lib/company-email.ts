import { COMPANY_EMAIL_DOMAIN } from "@/shared/config/general.config";

export type CompanyEmail = { ok: true; email: string } | { ok: false; error: string };

/**
 * A corporate email as the API expects it: lowercase, and with the company
 * domain added when only the local part was typed ("juan.perez" is enough).
 */
export function normalizeCompanyEmail(input: string): CompanyEmail {
  const typed = input.trim().toLowerCase();
  if (!typed) return { ok: false, error: "Escribe el correo de la persona." };
  const email = typed.includes("@") ? typed : `${typed}@${COMPANY_EMAIL_DOMAIN}`;
  const [local, domain] = email.split("@");
  if (!local || domain !== COMPANY_EMAIL_DOMAIN || !/^[a-z0-9._%+-]+$/.test(local)) {
    return { ok: false, error: `Solo se pueden asignar correos @${COMPANY_EMAIL_DOMAIN}.` };
  }
  return { ok: true, email };
}
