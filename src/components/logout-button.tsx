"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CART_ID_STORAGE_KEY } from "@/stores/cart-store";

export const LogoutButton = ({
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <Button
      {...props}
      onClick={(e) => {
        authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              queryClient.clear();
              localStorage.removeItem(CART_ID_STORAGE_KEY);
              onClick?.(e);
              router.push("/sign-in");
            },
          },
        });
      }}
    />
  );
};
