import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { HOST_BRAND } from "@95forward/shared";

export interface OpenInKeystoneProps {
  /** A real host route. This link exists to prove the boundary, so it must actually go somewhere. */
  href: string;
  /** What the host owns, in the user's words: "full giving history", "pledge schedule". */
  children: string;
}

/**
 * The boundary, made visible (Initiative 24).
 *
 * 95 Forward is an add-on. Pledge payment schedules, commitment end dates and funding-due tracking
 * stay in the host CRM on purpose — "CFOs and everybody else can use their current CRMs" — and this
 * link is where a user crosses that line rather than where the product pretends there isn't one.
 *
 * Deliberately a real link to a real, working page. A decorative version of this would be worse than
 * none: the whole argument is that the host system is genuinely there.
 */
export function OpenInKeystone({ href, children }: OpenInKeystoneProps) {
  return (
    <Link href={href} className="f95-handoff" data-testid="open-in-keystone">
      <span className="f95-handoff__label">{children}</span>
      <span className="f95-handoff__action">
        Open in {HOST_BRAND.name}
        <ArrowUpRight size={14} strokeWidth={1.8} />
      </span>
    </Link>
  );
}
