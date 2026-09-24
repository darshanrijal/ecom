"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { revenueSeries } from "@/features/admin/data";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "oklch(75% 0.183 55.934)",
  },
} satisfies ChartConfig;

export function RevenueChart() {
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[280px] w-full"
    >
      <AreaChart data={revenueSeries} margin={{ left: 12, right: 12 }}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-revenue)"
              stopOpacity={0.35}
            />
            <stop
              offset="95%"
              stopColor="var(--color-revenue)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          className="stroke-border"
        />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => [`Rs. ${Number(value).toLocaleString()}`]}
            />
          }
        />
        <Area
          dataKey="revenue"
          type="natural"
          fill="url(#fillRevenue)"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
