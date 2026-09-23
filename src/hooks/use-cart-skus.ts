import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { trpc } from "@/__rpc/client";
import { useCart } from "@/hooks/use-cart";
import { authClient } from "@/lib/auth-client";

const VALID_SKU_ID = /^[0-9a-z]+$/;
const MAX_BATCH = 100;

export function useCartSkus() {
  const cart = useCart();
  const { items, removeItemFromCart } = cart;

  const session = authClient.useSession();
  const isLoggedIn = !!session.data?.user;

  const { isPending: isCartDataPending } = trpc.cart.getCartItems.useQuery(
    undefined,
    { enabled: isLoggedIn }
  );
  const isCartLoading = isLoggedIn && isCartDataPending;

  const pruneAttempted = useRef(new Set<string>());

  const queriedIds = useMemo(
    () =>
      items
        .map((item) => item.skuId)
        .filter((id) => VALID_SKU_ID.test(id))
        .slice(0, MAX_BATCH),
    [items]
  );

  const {
    data: skus,
    isPlaceholderData,
    isError,
    refetch,
  } = trpc.products.getSKUsByIds.useQuery(
    { skuIds: queriedIds },
    {
      enabled: queriedIds.length > 0,
      placeholderData: keepPreviousData,
    }
  );

  const skuMap = useMemo(
    () => new Map((skus ?? []).map((sku) => [sku.id, sku])),
    [skus]
  );

  useEffect(() => {
    for (const item of items) {
      if (
        !VALID_SKU_ID.test(item.skuId) &&
        !pruneAttempted.current.has(item.skuId)
      ) {
        pruneAttempted.current.add(item.skuId);
        removeItemFromCart(item.skuId);
      }
    }
  }, [items, removeItemFromCart]);

  const settled = !!skus && !isPlaceholderData;

  useEffect(() => {
    if (!settled) {
      return;
    }

    const found = new Set((skus ?? []).map((sku) => sku.id));

    for (const id of queriedIds) {
      if (!found.has(id) && !pruneAttempted.current.has(id)) {
        pruneAttempted.current.add(id);
        removeItemFromCart(id);
      }
    }
  }, [settled, skus, queriedIds, removeItemFromCart]);

  const lines = items.map((item) => ({ item, sku: skuMap.get(item.skuId) }));

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const resolvedCount = lines.reduce(
    (sum, { item, sku }) => (sku ? sum + item.quantity : sum),
    0
  );
  const subtotal = lines.reduce(
    (sum, { item, sku }) =>
      sku ? sum + Number(sku.price) * item.quantity : sum,
    0
  );

  return {
    cart,
    queriedIds,
    skuMap,
    lines,
    totalCount,
    resolvedCount,
    subtotal,
    isCartLoading,
    isPlaceholderData,
    isError,
    refetch,
  };
}
