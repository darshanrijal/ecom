import { ProductEdit } from "@/features/admin/components/product-edit";

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductEdit productId={id} />;
}
