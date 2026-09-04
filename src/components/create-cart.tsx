"use client";

import { trpc } from "@/__rpc/client";
import { authClient } from "@/lib/auth-client";
import { useEffect } from "react";
import { toast } from "./ui/toast";

export const CreateCart = () => {
  const { data } = authClient.useSession();
  const { mutate: createCart, isError } = trpc.cart.createCart.useMutation();

  if (isError) {
    toast.add({
      type: "error",
      priority: "high",
      description: "Cound not create your cart",
    });
  }

  useEffect(() => {
    if (data?.session.id) {
      createCart();
    }
  }, [createCart, data?.session.id]);

  return null;
};
