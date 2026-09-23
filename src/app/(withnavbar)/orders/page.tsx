import { OrdersClientPage } from "./page.client";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;

  return <OrdersClientPage newOrderId={params.new} />;
}
