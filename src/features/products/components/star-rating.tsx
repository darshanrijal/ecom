import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const STAR_CLASSES = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-6",
} as const;

interface StarRatingProps {
  rating: number;
  size?: keyof typeof STAR_CLASSES;
  className?: string;
}

export function StarRating({
  rating,
  size = "sm",
  className,
}: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, rating));
  const starClass = STAR_CLASSES[size];

  return (
    <span
      role="img"
      aria-label={`Rated ${clamped} out of 5 stars`}
      className={cn("relative inline-flex", className)}
    >
      <span
        aria-hidden="true"
        className="flex gap-0.5 text-muted-foreground/30"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon key={star} className={cn(starClass, "fill-current")} />
        ))}
      </span>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden text-amber-400"
        style={{ width: `${(clamped / 5) * 100}%` }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={cn(starClass, "shrink-0 fill-current")}
          />
        ))}
      </span>
    </span>
  );
}
