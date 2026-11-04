import type { Metadata } from "next";

import HomeView from "@/features/home/components/home-view";

export const metadata: Metadata = { title: "Inicio · Plataforma Interna JDH" };

export default function HomePage() {
  return <HomeView />;
}
