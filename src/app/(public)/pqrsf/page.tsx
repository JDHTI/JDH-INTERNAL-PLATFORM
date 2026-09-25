import type { Metadata } from "next";

import PublicPqrsfForm from "@/features/pqrsf-public/components/public-pqrsf-form";

export const metadata: Metadata = {
  title: "PQRSF | Plataforma Interna JDH",
  description: "Presenta una petición, queja, reclamo, sugerencia o felicitación.",
};

export default function PublicPqrsfPage() {
  return <PublicPqrsfForm />;
}
