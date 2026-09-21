import Link from "next/link";
import { CircleQuestionMark } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { headerIconButtonClass } from "./header-icon-button";

/**
 * Help, unlike Notifications and Quick notes, is plain navigation rather than
 * a panel: there is nothing to show inline, only a real destination to send
 * the user to. It links to TI's own support page (/ti/soporte) rather than a
 * fabricated mailto or channel this app has no way to confirm still exists.
 */
export default function HelpLink() {
  return (
    <Link
      href="/ti/soporte"
      className={cn(headerIconButtonClass)}
      aria-label="Ayuda y soporte"
      title="Ayuda y soporte"
    >
      <CircleQuestionMark className="size-4" />
    </Link>
  );
}
