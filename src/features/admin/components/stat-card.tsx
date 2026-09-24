import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TrendingDownIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";

type Tone = "emerald" | "sky" | "purple" | "amber";

const tones: Record<Tone, string> = {
  emerald: "bg-[#60BB46]/15 text-[#3d8f35] dark:text-[#7ed45f]",
  sky: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  purple: "bg-[#5C2D91]/15 text-[#5C2D91] dark:text-[#b386e0]",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

interface StatCardProps {
  label: string;
  value: string;
  delta: number;
  trend: "up" | "down";
  caption: string;
  icon: LucideIcon;
  tone?: Tone;
}

export function StatCard({
  label,
  value,
  delta,
  trend,
  caption,
  icon: Icon,
  tone = "emerald",
}: StatCardProps) {
  const up = trend === "up";

  return (
    <Card className="shadow-xs">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="font-medium text-muted-foreground text-sm">{label}</p>
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-lg",
              tones[tone]
            )}
          >
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
