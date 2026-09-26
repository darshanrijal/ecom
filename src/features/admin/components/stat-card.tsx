import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TrendingDownIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  delta: number;
  trend: "up" | "down";
  caption: string;
  icon: LucideIcon;
}

export function StatCard({
  label,
  value,
  delta,
  trend,
  caption,
  icon: Icon,
}: StatCardProps) {
  const up = trend === "up";

  return (
    <Card size="sm" className="shadow-xs">
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="font-medium text-muted-foreground text-sm">{label}</p>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/5 text-primary">
            <Icon className="size-4" />
          </span>
        </div>

        <p className="mt-2 font-bold text-2xl tabular-nums tracking-tight">
          {value}
        </p>

        <div className="mt-2 flex items-center gap-1.5">
          <Badge
            className={cn(
              "gap-0.5 rounded-full font-medium",
              up
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-red-500/15 text-red-700 dark:text-red-400"
            )}
          >
            {up ? (
              <TrendingUpIcon className="size-3" />
            ) : (
              <TrendingDownIcon className="size-3" />
            )}
            {delta.toFixed(1)}%
          </Badge>
          <span className="text-muted-foreground text-xs">{caption}</span>
        </div>
      </CardContent>
    </Card>
  );
}
