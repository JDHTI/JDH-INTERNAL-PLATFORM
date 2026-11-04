"use client"

import { useMyEmployee } from "@/features/directory/hooks/use-directory"

/**
 * ¿Hoy cumple años el usuario de la sesión? Alimenta el marco de globos del
 * avatar del header (`UserMenu`). Sale del propio registro del directorio
 * (`/directory/employees/me`, mes y día); mientras carga o sin dato, `false`.
 */
export function useMiCumpleanos(enabled: boolean): boolean {
  const { data } = useMyEmployee()
  if (!enabled || !data?.birth_month || !data.birth_day) return false
  const today = new Date()
  return today.getMonth() + 1 === data.birth_month && today.getDate() === data.birth_day
}
