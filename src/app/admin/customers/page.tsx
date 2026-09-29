import { PageHeader } from "@/features/admin/components/page-header";
import { CustomersTable } from "@/features/admin/components/customers-table";

export default function AdminCustomersPage() {
  return (
    <>
      <PageHeader
        title="Customers"
        description="View and manage your registered customers."
      />
      <CustomersTable />
    </>
  );
}
