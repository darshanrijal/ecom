"use client";

import { trpc } from "@/__rpc/client";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { HeartIcon } from "lucide-react";

export const AddToFavoriteButton = ({
  className,
  productId,
}: {
  className?: string;
  productId: string;
}) => {
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session?.user;

  const utils = trpc.useUtils();

  const { data: favoriteData } = trpc.favorite.check.useQuery(
    { productId },
    {
      enabled: isLoggedIn,
    }
  );

  const { mutate: toggleFavorite } = trpc.favorite.toggle.useMutation({
    onMutate: async () => {
      await utils.favorite.check.cancel({ productId });

      const previousData = utils.favorite.check.getData({ productId });

      if (!previousData) {
        return { previousData };
      }

      utils.favorite.check.setData(
        { productId },
        {
          ...previousData,
          isFavorated: !previousData.isFavorated,
        }
      );

      return { previousData };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        utils.favorite.check.setData({ productId }, context.previousData);
      }
    },

    onSettled: async () => {
      await utils.favorite.check.invalidate({ productId });
    },
  });

  if (!isLoggedIn || !favoriteData) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label={
        favoriteData.isFavorated ? "Remove from favorites" : "Add to favorites"
      }
      aria-pressed={favoriteData.isFavorated}
      title={
        favoriteData.isFavorated ? "Remove from favorites" : "Add to favorites"
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        toggleFavorite(
          { productId },
          {
            onSuccess: () => {
              toast.add({
                description: favoriteData.isFavorated
                  ? "Removed from favorites"
                  : "Added to favorites",
                type: "success",
              });
            },
          }
        );
      }}
      className={cn(
        "relative z-30 flex size-9 items-center justify-center rounded-full bg-background/60 shadow-sm backdrop-blur-sm transition hover:bg-background disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      <HeartIcon
        className={cn(
          "size-5",
          favoriteData.isFavorated && "fill-red-600 text-red-600"
        )}
      />
    </button>
  );
};
