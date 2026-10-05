import { preventUnauthorized } from "@/lib/auth";
import { OrdersClientPage } from "./page.client";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  await preventUnauthorized();
  const params = await searchParams;

  return <OrdersClientPage newOrderId={params.new} />;
}
