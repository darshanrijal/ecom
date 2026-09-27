import type * as React from "react";

import { cn } from "@/lib/utils";
import { TableRow, TableCell, TableHead } from "@/components/ui/table";

/** White card shell that all admin tables live in. */
function DataTableShell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="data-table-shell"
      className={cn("overflow-hidden rounded-xl border bg-card", className)}
      {...props}
    />
  );
}

function DataTableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <TableHead
      className={cn(
        "h-11 whitespace-nowrap px-4 font-medium text-muted-foreground text-xs tracking-wide",
        className
      )}
      {...props}
    />
  );
}

function DataTableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <TableCell className={cn("p-3 align-middle", className)} {...props} />;
}

function DataTableEmpty({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className="h-28 text-center text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

export { DataTableShell, DataTableHead, DataTableCell, DataTableEmpty };
