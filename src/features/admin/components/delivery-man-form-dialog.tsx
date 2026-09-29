"use client";

import { useEffect, useState } from "react";

import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { deliveryManCreateSchema } from "@/lib/admin-schema";
import { collectFieldErrors } from "@/lib/form-errors";

export interface DeliveryManFormValues {
  id: string;
  name: string;
  phone: string;
  accountEmail: string;
}

interface DeliveryManFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryMan?: DeliveryManFormValues | null;
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

interface FieldErrors {
  name?: string;
  phone?: string;
  accountEmail?: string;
}

export function DeliveryManFormDialog({
  open,
  onOpenChange,
  deliveryMan,
}: DeliveryManFormDialogProps) {
  const utils = trpc.useUtils();
  const createMan = trpc.admin.delivery.createMan.useMutation();
  const updateMan = trpc.admin.delivery.updateMan.useMutation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(deliveryMan ? deliveryMan.name : "");
    setPhone(deliveryMan ? deliveryMan.phone : "");
    setAccountEmail(deliveryMan ? deliveryMan.accountEmail : "");
    setErrors({});
  }, [open, deliveryMan]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = accountEmail.trim();
    const parsed = deliveryManCreateSchema.safeParse({
      name,
      phone,
      accountEmail: trimmedEmail === "" ? null : trimmedEmail,
    });
    if (!parsed.success) {
      setErrors(
        collectFieldErrors(parsed.error, ["name", "phone", "accountEmail"])
      );
      return;
    }
    setErrors({});

    try {
      if (deliveryMan) {
        await updateMan.mutateAsync({ id: deliveryMan.id, ...parsed.data });
        toast.add({
          title: `"${parsed.data.name}" updated`,
          type: "success",
        });
      } else {
        await createMan.mutateAsync(parsed.data);
        toast.add({
          title: `"${parsed.data.name}" added`,
          type: "success",
        });
      }
      await utils.admin.delivery.listMen.invalidate();
      onOpenChange(false);
    } catch (error) {
      toast.add({
        title: deliveryMan
          ? "Couldn't update delivery man"
          : "Couldn't add delivery man",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
      onOpenChange(false);
    }
  }

  const pending = createMan.isPending || updateMan.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {deliveryMan ? "Edit delivery man" : "Add delivery man"}
          </DialogTitle>
          <DialogDescription>
            {deliveryMan
              ? "Update this delivery man's contact details."
              : "Delivery men can be assigned to orders from the orders page."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Name" htmlFor="dm-name">
            <Input
              id="dm-name"
              value={name}
              placeholder="Bagha"
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
              aria-invalid={!!errors.name}
            />
            {errors.name ? (
              <p className="text-destructive text-xs">{errors.name}</p>
            ) : null}
          </Field>

          <Field label="Phone number" htmlFor="dm-phone">
            <Input
              id="dm-phone"
              value={phone}
              inputMode="tel"
              placeholder="98XXXXXXXX"
              autoComplete="off"
              onChange={(event) => setPhone(event.target.value)}
              aria-invalid={!!errors.phone}
            />
            {errors.phone ? (
              <p className="text-destructive text-xs">{errors.phone}</p>
            ) : null}
          </Field>

          <Field
            label="Account email (optional)"
            htmlFor="dm-email"
            hint="Link to an existing store account. Leave empty to keep them unlinked."
          >
            <Input
              id="dm-email"
              value={accountEmail}
              type="email"
              placeholder="delivery@example.com"
              autoComplete="off"
              onChange={(event) => setAccountEmail(event.target.value)}
              aria-invalid={!!errors.accountEmail}
            />
            {errors.accountEmail ? (
              <p className="text-destructive text-xs">{errors.accountEmail}</p>
            ) : null}
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {deliveryMan ? "Save changes" : "Add delivery man"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
