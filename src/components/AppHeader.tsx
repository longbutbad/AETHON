import Link from "next/link";
import { Wordmark } from "@/components/ui";

/**
 * Top chrome for the authenticated app screens. `backHref` renders a back chevron
 * (used on nested screens like settings); otherwise the left slot is empty.
 */
export default function AppHeader({
  backHref,
  right,
}: {
  backHref?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-[18px] pb-1.5 pt-4">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Back"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-violet/30 bg-violet/10 text-violet-light transition hover:bg-violet/20"
        >
          <span className="text-lg leading-none">‹</span>
        </Link>
      ) : (
        <span className="h-[30px] w-[30px]" />
      )}
      <Wordmark size="sm" />
      <div className="flex h-[30px] min-w-[30px] items-center justify-end">{right}</div>
    </div>
  );
}
