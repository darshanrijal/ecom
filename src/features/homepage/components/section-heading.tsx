import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

interface SectionHeadingProps {
  id?: string;
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  href,
  linkLabel = "View all",
}: SectionHeadingProps) {
  return (
    <div
      id={id}
      className="mb-5 flex scroll-mt-28 flex-wrap items-end justify-between gap-3 sm:mb-6"
    >
      <div>
        {!!eyebrow && (
          <p className="mb-1 font-medium text-primary/60 text-xs uppercase tracking-widest">
            {eyebrow}
          </p>
        )}
        <h2 className="font-semibold text-xl tracking-tight sm:text-2xl">
          {title}
        </h2>
      </div>

      {!!href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          {linkLabel}
          <ArrowRightIcon className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
