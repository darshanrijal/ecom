"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/__rpc/client";
import {
  DataTableEmpty,
  DataTableCell,
  DataTableHead,
  DataTableShell,
} from "./data-table";

const formatNPR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600">Verified</Badge>
    );
  }
  return <Badge className="bg-amber-500/10 text-amber-600">Unverified</Badge>;
}

export function CustomersTable() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const customers = trpc.admin.customers.list.useInfiniteQuery(
    {
      search: deferredSearch || undefined,
      limit: 25,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const rows = customers.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email…"
          className="pl-9"
        />
      </div>

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead>Customer</DataTableHead>
              <DataTableHead className="hidden md:table-cell">
                Joined
              </DataTableHead>
              <DataTableHead className="text-right">Orders</DataTableHead>
              <DataTableHead className="text-right">Total spent</DataTableHead>
              <DataTableHead>Status</DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <DataTableEmpty colSpan={5}>
                {customers.isFetching
                  ? "Loading customers…"
                  : "No customers " +
                    (deferredSearch ? "match this search." : "yet.")}
              </DataTableEmpty>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/customers/${row.id}`)}
                >
                  <DataTableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-medium text-xs">
                        {row.image ? (
                          <Image
                            src={row.image}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            className="size-full object-cover"
                          />
                        ) : (
                          row.name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate font-medium">
                          {row.name}
                          {row.isAdmin ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 px-1.5 py-0 text-[10px]"
                            >
                              Admin
                            </Badge>
                          ) : null}
                        </p>
                        <p className="truncate text-muted-foreground text-xs">
                          {row.email}
                        </p>
                      </div>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="hidden text-muted-foreground md:table-cell">
                    {formatDate(row.createdAt)}
                  </DataTableCell>
                  <DataTableCell className="text-right tabular-nums">
                    {row.orders}
                  </DataTableCell>
                  <DataTableCell className="text-right font-medium">
                    {formatNPR(row.totalSpent)}
                  </DataTableCell>
                  <DataTableCell>
                    <VerifiedBadge verified={row.emailVerified} />
                  </DataTableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {customers.hasNextPage ? (
          <div className="border-t p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => customers.fetchNextPage()}
              disabled={customers.isFetchingNextPage}
            >
              {customers.isFetchingNextPage ? "Loading…" : "Show more"}
            </Button>
          </div>
        ) : null}
      </DataTableShell>

      <p className="text-muted-foreground text-xs">
        {rows.length} {rows.length === 1 ? "customer" : "customers"}
        {deferredSearch ? " match this search" : ""}
      </p>
    </div>
  );
}
