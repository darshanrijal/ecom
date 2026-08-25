import { trpc } from "@/__rpc/client";
import { authClient } from "@/lib/auth-client";
import { useCartStore } from "@/stores/cart-store";

interface AddToCartProps {
  skuId: string;
  quantity: number;
}

export function useCart() {
  const session = authClient.useSession();

  const isLoggedIn = !!session.data?.user;

  const utils = trpc.useUtils();

  const {
    items: guestItems,
    addItem: addGuestItem,
    removeItem: removeGuestItem,
    updateQuantity: updateGuestQuantity,
    clear: clearGuestCart,
  } = useCartStore();

  const { data: loggedInItems = [] } = trpc.cart.getCartItems.useQuery(
    undefined,
    {
      enabled: isLoggedIn,
    }
  );

  const { mutate: addToCartLoggedIn } = trpc.cart.addToCart.useMutation({
    onSuccess: () => {
      utils.cart.getCartItems.invalidate();
    },
  });

  const { mutate: removeItemLoggedIn } = trpc.cart.removeItem.useMutation({
    onSuccess: () => {
      utils.cart.getCartItems.invalidate();
    },
  });

  const { mutate: updateCartQuantity } = trpc.cart.updateQuantity.useMutation({
    onSuccess: () => {
      utils.cart.getCartItems.invalidate();
    },
  });

  function addToCart({ skuId, quantity }: AddToCartProps) {
    if (isLoggedIn) {
      addToCartLoggedIn({
        skuId,
        quantity,
      });

      return;
    }

    addGuestItem(skuId, quantity);
  }

  function removeItemFromCart(skuId: string) {
    if (isLoggedIn) {
      removeItemLoggedIn({
        skuId,
      });

      return;
    }

    removeGuestItem(skuId);
  }

  function updateQuantity(skuId: string, quantity: number) {
    if (isLoggedIn) {
      updateCartQuantity({ quantity, skuId });
      return;
    }

    updateGuestQuantity(skuId, quantity);
  }

  function getCartItems() {
    return isLoggedIn ? loggedInItems : guestItems;
  }

  return {
    items: getCartItems(),
    addToCart,
    removeItemFromCart,
    updateQuantity,
    clearGuestCart,
  };
}
