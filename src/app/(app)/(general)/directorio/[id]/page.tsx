import type { Metadata } from "next";

import EmployeeProfile from "@/features/directory/components/employee-profile";

export const metadata: Metadata = { title: "Perfil · Directorio · Plataforma Interna JDH" };

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeeProfile employeeId={id} />;
}
