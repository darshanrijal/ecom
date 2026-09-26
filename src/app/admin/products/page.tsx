import { PageHeader } from "@/features/admin/components/page-header";
import { ProductsTable } from "@/features/admin/components/products-table";

export default function AdminProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your catalog, pricing and inventory."
      />
      <ProductsTable />
    </>
  );
}
