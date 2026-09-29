"use client";

import { useState } from "react";
import { BookmarkIcon, BookmarkPlusIcon, XIcon } from "lucide-react";

import { type RouterOutputs, trpc } from "@/__rpc/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";

export type SavedAddress = RouterOutputs["address"]["list"][number];

/**
 * The saved-address strip shown at the top of the checkout delivery form.
 * Clicking a card fills the form through `onPick`; guests and users without
 * saved addresses see nothing. Own query + delete, so it stays usable from
 * any surface that needs an address picker.
 */
export function SavedAddressPicker({
  onPick,
}: {
  onPick: (address: SavedAddress) => void;
}) {
  const session = authClient.useSession();
  const enabled = !!session.data?.user;
  const utils = trpc.useUtils();
  const { data: addresses } = trpc.address.list.useQuery(undefined, {
    enabled,
  });
  const remove = trpc.address.remove.useMutation();
  const [toRemove, setToRemove] = useState<SavedAddress | null>(null);

  if (!enabled || !addresses || addresses.length === 0) {
    return null;
  }

  async function confirmRemove() {
    if (!toRemove) {
      return;
    }
    try {
      await remove.mutateAsync({ id: toRemove.id });
      await utils.address.list.invalidate();
      toast.add({ title: "Address removed", type: "success" });
      setToRemove(null);
    } catch (error) {
      toast.add({
        type: "error",
        title: "Couldn't remove the address",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  return (
    <div className="sm:col-span-2">
      <p className="flex items-center gap-1.5 font-medium text-sm">
        <BookmarkIcon className="size-4" />
        Saved addresses
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {addresses.map((address) => (
          <div key={address.id} className="relative">
            <button
              type="button"
              onClick={() => onPick(address)}
              className="w-full rounded-xl border p-3 pr-9 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium text-sm">
                  {address.fullName || `${address.city}, ${address.province}`}
                </span>
                {!!address.phone && (
                  <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                    {address.phone}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-muted-foreground text-xs">
                {address.address}
              </span>
              {!!address.fullName && (
                <span className="mt-0.5 block truncate text-muted-foreground/80 text-xs">
                  {address.city}, {address.province}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label="Remove saved address"
              onClick={() => setToRemove(address)}
              className="absolute top-1.5 right-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <AlertDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this address?</AlertDialogTitle>
            <AlertDialogDescription>
              {toRemove ? (
                <>
                  &quot;{toRemove.address}, {toRemove.city}&quot; will be
                  removed from your saved addresses. You can save it again
                  later.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={confirmRemove}
            >
              {remove.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * The "save this address" action row shown under the delivery fields for
 * signed-in users. Validation stays with the caller — it decides which form
 * fields must pass before saving.
 */
export function SaveAddressRow({
  onSave,
  saving,
}: {
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3 sm:col-span-2">
      <div className="flex items-start gap-2 text-muted-foreground text-sm">
        <BookmarkIcon className="mt-0.5 size-4 shrink-0" />
        <p>Save this address to reuse it with one click on your next order.</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={saving}
        onClick={onSave}
      >
        {saving ? <Spinner /> : <BookmarkPlusIcon className="size-4" />}
        {saving ? "Saving…" : "Save address"}
      </Button>
    </div>
  );
}
