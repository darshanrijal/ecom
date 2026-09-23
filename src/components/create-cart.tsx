"use client";

import { trpc } from "@/__rpc/client";
import { authClient } from "@/lib/auth-client";
import { CART_ID_STORAGE_KEY, initCartLoggedOut } from "@/stores/cart-store";
import { useEffect, useRef } from "react";
import { toast } from "./ui/toast";

export const CreateCart = () => {
  const { data } = authClient.useSession();

  const currentSessionIdRef = useRef<string | null>(null);
  const initializedSessionRef = useRef<string | null>(null);

  currentSessionIdRef.current = data?.session.id ?? null;

  const { mutate: createCart } = trpc.cart.createCart.useMutation({
    onSuccess: (cartId) => {
      if (!currentSessionIdRef.current) {
        return;
      }

      localStorage.setItem(CART_ID_STORAGE_KEY, cartId);
    },

    onError: () => {
      // Dont show an error if the request failed because
      // the user logged out / the component state changed.
      if (!currentSessionIdRef.current) {
        return;
      }

      toast.add({
        type: "error",
        priority: "high",
        description: "Could not create your cart",
      });
    },
  });

  useEffect(() => {
    const sessionId = data?.session.id;

    if (!sessionId) {
      initializedSessionRef.current = null;
      initCartLoggedOut();
      return;
    }

    // Already initialized the cart for this exact session.
    if (initializedSessionRef.current === sessionId) {
      return;
    }

    initializedSessionRef.current = sessionId;

    createCart();
  }, [data?.session.id, createCart]);

  return null;
};
