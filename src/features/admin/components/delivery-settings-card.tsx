"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { CheckCircle2Icon } from "lucide-react";

import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { deliverySettingsInputSchema } from "@/lib/admin-schema";
import { collectFieldErrors } from "@/lib/form-errors";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
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
  storeLat?: string;
  storeLng?: string;
  deliveryRatePerKm?: string;
}

/**
 * Admin-managed store location and per-kilometre rate. The checkout only
 * previews with these — the order creation procedure reads them again
 * server-side, and historical orders keep their own snapshot.
 */
export function DeliverySettingsCard() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.admin.delivery.getSettings.useQuery();
  const updateSettings = trpc.admin.delivery.updateSettings.useMutation();

  const [storeLat, setStoreLat] = useState("");
  const [storeLng, setStoreLng] = useState("");
  const [rate, setRate] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: loadedSettings } = settingsQuery;

  useEffect(() => {
    if (!loadedSettings || hydrated) {
      return;
    }
    setStoreLat(
      loadedSettings.storeLat === null ? "" : String(loadedSettings.storeLat)
    );
    setStoreLng(
      loadedSettings.storeLng === null ? "" : String(loadedSettings.storeLng)
    );
    setRate(
      loadedSettings.deliveryRatePerKm === null
        ? ""
        : String(loadedSettings.deliveryRatePerKm)
    );
    setHydrated(true);
  }, [loadedSettings, hydrated]);

  const markDirty = () => setSaved(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = deliverySettingsInputSchema.safeParse({
      storeLat: storeLat.trim() === "" ? null : Number(storeLat),
      storeLng: storeLng.trim() === "" ? null : Number(storeLng),
      deliveryRatePerKm: rate.trim() === "" ? null : Number(rate),
    });
    if (!parsed.success) {
      setErrors(
        collectFieldErrors(parsed.error, [
          "storeLat",
          "storeLng",
          "deliveryRatePerKm",
        ])
      );
      return;
    }
    setErrors({});

    try {
      await updateSettings.mutateAsync(parsed.data);
      await utils.admin.delivery.getSettings.invalidate();
      await utils.delivery.getSettings.invalidate();
      setSaved(true);
    } catch (error) {
      toast.add({
        title: "Couldn't save delivery settings",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery charge</CardTitle>
          <CardDescription>
            Store location and per-kilometre rate used to calculate delivery
            when an order is placed. Leave the fields empty to offer free
            delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Store latitude" htmlFor="store-lat" hint="e.g. 27.7172">
            <Input
              id="store-lat"
              value={storeLat}
              inputMode="decimal"
              placeholder="27.7172"
              onChange={(event) => {
                setStoreLat(event.target.value);
                markDirty();
              }}
              aria-invalid={!!errors.storeLat}
            />
            {errors.storeLat ? (
              <p className="text-destructive text-xs">{errors.storeLat}</p>
            ) : null}
          </Field>

          <Field
            label="Store longitude"
            htmlFor="store-lng"
            hint="e.g. 85.3240"
          >
            <Input
              id="store-lng"
              value={storeLng}
              inputMode="decimal"
              placeholder="85.3240"
              onChange={(event) => {
                setStoreLng(event.target.value);
                markDirty();
              }}
              aria-invalid={!!errors.storeLng}
            />
            {errors.storeLng ? (
              <p className="text-destructive text-xs">{errors.storeLng}</p>
            ) : null}
          </Field>

          <Field
            label="Rate (Rs. per km)"
            htmlFor="delivery-rate"
            hint="e.g. 20"
          >
            <Input
              id="delivery-rate"
              value={rate}
              inputMode="decimal"
              placeholder="20"
              onChange={(event) => {
                setRate(event.target.value);
                markDirty();
              }}
              aria-invalid={!!errors.deliveryRatePerKm}
            />
            {errors.deliveryRatePerKm ? (
              <p className="text-destructive text-xs">
                {errors.deliveryRatePerKm}
              </p>
            ) : null}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it&apos;s calculated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-muted-foreground text-sm">
          <p>
            Straight-line distance from the store to the customer&apos;s
            drop-off point, rounded to the metre, multiplied by the rate and
            rounded to paisa.
          </p>
          <p>
            Every order stores its own snapshot of the location, rate, distance
            and charge — changing these settings never alters orders that
            already exist.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-700 text-sm dark:text-emerald-400">
            <CheckCircle2Icon className="size-4" />
            Saved
          </span>
        ) : null}
        <Button type="submit" disabled={updateSettings.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
