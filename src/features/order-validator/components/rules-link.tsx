import Link from "next/link";
import { BookOpen } from "lucide-react";

/** The way into the validator's rules, from its list of files and from each file. Open to everyone. */
export default function RulesLink({ basePath }: { basePath: string }) {
  return (
    <Link
      href={`${basePath}/reglas`}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
    >
      <BookOpen className="size-4" aria-hidden="true" /> Reglas del validador
    </Link>
  );
}
