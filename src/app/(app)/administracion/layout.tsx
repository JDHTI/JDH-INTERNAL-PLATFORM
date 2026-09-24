import AdminGate from "@/features/admin/components/admin-gate";

export default function AdministrationLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}
