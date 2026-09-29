import { PageHeader } from "@/features/admin/components/page-header";
import { OrdersTable } from "@/features/admin/components/orders-table";

export default function AdminOrdersPage() {
  return (
    <>
      <PageHeader
        title="Orders"
        description="Track, filter and manage all customer orders."
      />

      <OrdersTable />
    </>
  );
}
