import { PageHeader } from "@/features/admin/components/page-header";
import { ProductsTable } from "@/features/admin/components/products-table";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export default function AdminProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your catalog, pricing and inventory."
      >
        <Button size="sm">
          <PlusIcon className="size-4" />
          Add product
        </Button>
      </PageHeader>

      <ProductsTable />
    </>
  );
}
