"use client";

import Link from "next/link";
import { FileSliders, Plus, Upload } from "lucide-react";

import { buttonVariants } from "@/shared/components/ui/button";

import { useCanManage } from "../hooks/use-supports";

/** The ways to write supports, only for managers: the screens behind them only write. */
export default function SupportsToolbar({ area }: { area: string }) {
  const canManage = useCanManage();
  if (!canManage) return null;
  const base = `/${area}/apoyos`;
  return (
    <div className="flex flex-wrap gap-2 md:justify-end">
      <Link href={`${base}/perfiles`} className={buttonVariants({ variant: "outline", className: "max-sm:h-11" })}>
        <FileSliders aria-hidden="true" /> Perfiles de proveedor
      </Link>
      <Link href={`${base}/carga`} className={buttonVariants({ variant: "outline", className: "max-sm:h-11" })}>
        <Upload aria-hidden="true" /> Carga masiva
      </Link>
      <Link href={`${base}/nuevo`} className={buttonVariants({ variant: "primary", className: "max-sm:h-11" })}>
        <Plus aria-hidden="true" /> Nuevo apoyo
      </Link>
    </div>
  );
}
