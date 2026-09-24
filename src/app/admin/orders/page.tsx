import Link from "next/link";
import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/admin/components/page-header";
import { OrdersTable } from "@/features/admin/components/orders-table";

export default function AdminOrdersPage() {
  return (
    <>
      <PageHeader
        title="Orders"
        description="Track, filter and manage all customer orders."
      >
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link href="/admin">
              <DownloadIcon className="size-4" />
              Export
            </Link>
          }
        />
      </PageHeader>

      <OrdersTable />
    </>
  );
}
