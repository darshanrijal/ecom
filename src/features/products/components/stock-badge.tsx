import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StockBadge({
  stock,
  className,
}: {
  stock: number;
  className?: string;
}) {
  if (stock <= 0) {
    return (
      <Badge variant="destructive" className={className}>
        Out of stock
      </Badge>
    );
  }

  if (stock <= 5) {
    return (
      <Badge
        className={cn(
          "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
          className
        )}
      >
        Only {stock} left
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        className
      )}
    >
      In stock
    </Badge>
  );
}
