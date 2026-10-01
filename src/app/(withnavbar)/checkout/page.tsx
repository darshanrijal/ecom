"use client";

import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeftIcon,
  BanknoteIcon,
  LockIcon,
  ShieldCheckIcon,
  TruckIcon,
  PackageXIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, type SubmitErrorHandler, useForm } from "react-hook-form";
import type z from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { reverseGeocode } from "@/lib/geocode";
import { authClient } from "@/lib/auth-client";
import { quoteDelivery, type DeliveryQuote } from "@/lib/delivery";
import { NEPAL_PROVINCES, shippingInfoFormSchema } from "@/lib/order-schema";
import { cn } from "@/lib/utils";
import { useOrderStore } from "@/stores/order-store";
import { ProductImage } from "@/features/products/components/product-image";
import { useCartSkus } from "@/hooks/use-cart-skus";
import { useAddressGeocode } from "@/hooks/use-address-geocode";
import { LocationBox } from "@/features/checkout/components/location-box";
import {
  SaveAddressRow,
  SavedAddressPicker,
  type SavedAddress,
} from "@/features/checkout/components/saved-addresses";

type ShippingFormInput = z.input<typeof shippingInfoFormSchema>;
type ShippingFormValues = z.output<typeof shippingInfoFormSchema>;

function parseCoord(value: string, min: number, max: number) {
  if (value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}

interface PreviewSettings {
  configured: boolean;
  storeLat: number | null;
  storeLng: number | null;
  ratePerKm: number | null;
}

/** Non-authoritative checkout preview — the server recomputes the quote. */
function previewQuote(
  settings: PreviewSettings | undefined,
  latValue: string,
  lngValue: string
) {
  const lat = parseCoord(latValue, -90, 90);
  const lng = parseCoord(lngValue, -180, 180);
  if (lat === null || lng === null) {
    return null;
  }
  const storeLat = settings?.storeLat ?? null;
  const storeLng = settings?.storeLng ?? null;
  return quoteDelivery({
    store:
      storeLat !== null && storeLng !== null
        ? { lat: storeLat, lng: storeLng }
        : null,
    customer: { lat, lng },
    ratePerKm: settings?.ratePerKm ?? null,
  });
}

/**
 * Browsers only expose `navigator.geolocation` on a secure origin, so a plain
 * `http://` LAN address (phone testing against a dev server) can never resolve
 * a position. Callers check this first so we can explain that instead of
 * failing later with a generic timeout.
 */
function isGeolocationAvailable() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return false;
  }
  return window.isSecureContext;
}

function geolocationErrorMessage(error: unknown) {
  if (error instanceof GeolocationPositionError) {
    if (error.code === 1) {
      return "Location access was blocked. Allow it for this site in your browser settings — or use your address instead.";
    }
    if (error.code === 2) {
      return "Your device couldn't determine a position. Turn on location services for your browser — or use your address instead.";
    }
    if (error.code === 3) {
      return "Finding your location timed out. Try again, or use your address instead.";
    }
  }
  return "Your location couldn't be determined right now. Try again, or use your address instead.";
}

function describeDelivery(
  settings: PreviewSettings | undefined,
  quote: DeliveryQuote | null
) {
  if (quote !== null) {
    if (quote.deliveryCharge > 0) {
      return {
        label: `Rs. ${quote.deliveryCharge.toLocaleString()}`,
        free: false,
      };
    }
    return { label: "FREE", free: true };
  }
  if (settings?.configured === false) {
    return { label: "FREE", free: true };
  }
  return { label: "—", free: false };
}

/**
 * Official brand marks + brand colors, taken from each provider's own assets:
 * eSewa — cdn.esewa.com.np/ui/images/logos/esewa-logo.png (180×59), green.
 * Khalti — khalti-static…/khalti-logo.svg (412×206, red #DC0019 — it is no
 * longer the old purple), whose artwork only fills the middle ~70%, so it
 * renders taller here to end up looking the same size as eSewa.
 * COD has no brand, so it keeps a neutral icon instead of a made-up mark.
 */
const PAYMENT_OPTIONS = [
  {
    id: "COD",
    name: "Cash on Delivery",
    tagline: "Pay in cash when your order arrives",
    logo: null,
    logoWidth: 0,
    logoHeight: 0,
    logoClass: "",
  },
  {
    id: "ESEWA",
    name: "eSewa",
    tagline: "Pay from your eSewa wallet",
    logo: "/payments/esewa-logo.png",
    logoWidth: 180,
    logoHeight: 59,
    logoClass: "h-6",
  },
  {
    id: "KHALTI",
    name: "Khalti",
    tagline: "Pay from your Khalti wallet",
    logo: "/payments/khalti-logo.svg",
    logoWidth: 412,
    logoHeight: 206,
    logoClass: "h-9",
  },
] as const;

type PaymentMethod = (typeof PAYMENT_OPTIONS)[number]["id"];

export default function CheckoutPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const isLoggedIn = !!session.data?.user;
  const sessionPending = session.isPending;

  const {
    cart,
    lines,
    totalCount,
    subtotal,
    isCartLoading,
    isPlaceholderData,
    isError,
    refetch,
  } = useCartSkus();

  const utils = trpc.useUtils();
  const addGuestOrder = useOrderStore((state) => state.addOrder);
  const createOrder = trpc.orders.create.useMutation();
  const saveAddress = trpc.address.create.useMutation();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [locating, setLocating] = useState(false);
  const [coordsManual, setCoordsManual] = useState(false);
  const [coordsError, setCoordsError] = useState(false);

  const { data: deliverySettings } = trpc.delivery.getSettings.useQuery();

  const form = useForm<ShippingFormInput, unknown, ShippingFormValues>({
    resolver: zodResolver(shippingInfoFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      province: "",
      city: "",
      address: "",
      note: "",
      deliveryLat: "",
      deliveryLng: "",
    },
  });

  const quote = previewQuote(
    deliverySettings,
    form.watch("deliveryLat"),
    form.watch("deliveryLng")
  );
  const deliveryCharge = quote ? quote.deliveryCharge : 0;
  const grandTotal = subtotal + deliveryCharge;
  const { label: deliveryLabel, free: deliveryFree } = describeDelivery(
    deliverySettings,
    quote
  );

  const watchAddress = form.watch("address");
  const watchCity = form.watch("city");
  const watchProvince = form.watch("province");
  const watchLat = form.watch("deliveryLat");
  const watchLng = form.watch("deliveryLng");

  // The coordinate inputs are hidden — clear the "couldn't find this address"
  // banner the moment a valid point exists again (geocode, GPS, saved address).
  useEffect(() => {
    if (
      parseCoord(watchLat, -90, 90) !== null &&
      parseCoord(watchLng, -180, 180) !== null
    ) {
      setCoordsError(false);
    }
  }, [watchLat, watchLng]);
  const { geocoding } = useAddressGeocode({
    address: watchAddress,
    city: watchCity,
    province: watchProvince,
    skip: coordsManual,
    onResult: (coords) => {
      form.setValue("deliveryLat", coords.lat.toFixed(6), {
        shouldValidate: true,
        shouldDirty: true,
      });
      form.setValue("deliveryLng", coords.lng.toFixed(6), {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
  });

  function fillCoords(lat: number, lng: number) {
    setCoordsManual(true);
    form.setValue("deliveryLat", lat.toFixed(6), {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("deliveryLng", lng.toFixed(6), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  /**
   * "Use my location" also fills the address itself: we turn the fix back into
   * a province/city/street so the customer isn't left with an empty form. The
   * coordinates stay authoritative — `fillCoords` marks them manual, so the
   * address watcher won't re-geocode and shift the drop-off point.
   */
  async function handleLocate() {
    if (!isGeolocationAvailable()) {
      toast.add({
        type: "error",
        title: "Location isn't available here",
        description:
          "Your browser only shares a location on a secure (https) address. Use your address instead.",
      });
      return;
    }

    setLocating(true);
    try {
      const coords = await requestDevicePosition();
      fillCoords(coords.lat, coords.lng);
      setLocating(false);
      await fillAddressFromPosition(coords);
    } catch (error) {
      setLocating(false);
      toast.add({
        type: "error",
        title: "Couldn't get your location",
        description: geolocationErrorMessage(error),
      });
    }
  }

  /**
   * GPS is slow or unavailable on desktops and locked-down devices, so a
   * timeout / unavailable result is retried once with the cheap
   * network-position request before we give up.
   */
  function requestDevicePosition() {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          // A permission block is final — retrying just re-prompts. A timeout
          // or "position unavailable" often succeeds on the cheap
          // network-position request, so those get one more shot.
          const canRetry = error.code === 2 || error.code === 3;
          if (canRetry) {
            navigator.geolocation.getCurrentPosition(
              (fallback) => {
                resolve({
                  lat: fallback.coords.latitude,
                  lng: fallback.coords.longitude,
                });
              },
              reject,
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
            );
            return;
          }
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
      );
    });
  }

  async function fillAddressFromPosition(coords: { lat: number; lng: number }) {
    const reverse = await reverseGeocode(coords);
    if (!reverse) {
      toast.add({
        type: "error",
        title: "Location set, but we couldn't read the address",
        description:
          "Your delivery point is pinned exactly — please fill in the province, city and street address yourself.",
      });
      return;
    }

    if (reverse.province) {
      form.setValue("province", reverse.province, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    if (reverse.city) {
      form.setValue("city", reverse.city, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    if (reverse.address) {
      form.setValue("address", reverse.address, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    toast.add({
      type: "success",
      title: "Address filled from your location",
      description:
        "Please check the province, city and street above — correct anything that doesn't match, then place your order.",
    });
  }

  function applySavedAddress(saved: SavedAddress) {
    form.setValue("province", saved.province, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("city", saved.city, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("address", saved.address, {
      shouldValidate: true,
      shouldDirty: true,
    });
    if (saved.fullName) {
      form.setValue("fullName", saved.fullName, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    if (saved.phone) {
      form.setValue("phone", saved.phone, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    if (saved.lat !== null && saved.lng !== null) {
      // exact stored coordinates win — mark them manual so the address
      // watcher doesn't re-geocode and shift the drop-off point
      fillCoords(saved.lat, saved.lng);
      toast.add({
        type: "success",
        title: "Address filled in",
        description: "Your saved location and coordinates are applied.",
      });
      return;
    }

    // no stored coordinates: clear stale ones and let the address watcher
    // geocode the freshly picked address automatically
    setCoordsManual(false);
    form.setValue("deliveryLat", "");
    form.setValue("deliveryLng", "");
    toast.add({
      type: "success",
      title: "Address filled in",
      description: "Finding the coordinates for this address…",
    });
  }

  async function handleSaveAddress() {
    const values = form.getValues();
    const fields: Array<
      "province" | "city" | "address" | "fullName" | "phone"
    > = ["province", "city", "address"];
    if (values.fullName.trim()) {
      fields.push("fullName");
    }
    if (values.phone.trim()) {
      fields.push("phone");
    }

    const valid = await form.trigger(fields);
    if (!valid) {
      toast.add({
        type: "error",
        title: "Check the highlighted fields",
        description: "Fix the address details, then save it again.",
      });
      return;
    }

    const lat = parseCoord(values.deliveryLat, -90, 90);
    const lng = parseCoord(values.deliveryLng, -180, 180);
    const coords = lat !== null && lng !== null ? { lat, lng } : {};

    saveAddress.mutate(
      {
        fullName: values.fullName.trim() || undefined,
        phone: values.phone.trim() || undefined,
        province: values.province,
        city: values.city,
        address: values.address,
        ...coords,
      },
      {
        onSuccess: () => {
          utils.address.list.invalidate();
          toast.add({
            type: "success",
            title: "Address saved",
            description: "Click it next time to fill this form.",
          });
        },
        onError: (error) => {
          toast.add({
            type: "error",
            title: "Couldn't save the address",
            description: error.message,
          });
        },
      }
    );
  }

  const prefilled = useRef(false);
  useEffect(() => {
    const user = session.data?.user;
    if (prefilled.current || !user) {
      return;
    }
    prefilled.current = true;
    const current = form.getValues();
    form.reset({
      ...current,
      fullName: current.fullName || user.name || "",
      email: current.email || user.email || "",
    });
  }, [session.data, form]);

  // The lat/lng inputs are hidden, so their schema errors have no visible
  // field — surface them as a toast plus the banner in the location box.
  const handleInvalid: SubmitErrorHandler<ShippingFormInput> = () => {
    const values = form.getValues();
    const missingCoords =
      parseCoord(values.deliveryLat, -90, 90) === null ||
      parseCoord(values.deliveryLng, -180, 180) === null;
    if (!missingCoords) {
      return;
    }
    setCoordsError(true);
    toast.add({
      type: "error",
      title: "We couldn't find your address",
      description:
        "Check the street address, city and province are correct — or use your location — then place the order again.",
    });
  };

  async function handleCreateOrder(values: ShippingFormValues) {
    const items = lines.flatMap((line) =>
      line.sku ? [{ skuId: line.sku.id, quantity: line.item.quantity }] : []
    );

    if (items.length === 0) {
      toast.add({
        type: "error",
        title: "Your cart is empty",
        description: "Add some products before checking out.",
      });
      return;
    }

    await createOrder.mutateAsync(
      {
        items,
        shippingInfo: values,
        paymentMethod,
      },
      {
        onSuccess: (order) => {
          if (!isLoggedIn) {
            addGuestOrder(order.id);
            cart.clearCart();
          }

          utils.cart.getCartItems.invalidate();
          utils.orders.list.invalidate();

          router.push(
            paymentMethod === "COD"
              ? `/orders?new=${order.id}`
              : `/checkout/pay/${order.id}`
          );
        },
        onError: (error) => {
          toast.add({
            type: "error",
            title: "Couldn't place your order",
            description: error.message,
          });
        },
      }
    );
  }

  const cartEmpty =
    totalCount === 0 &&
    !isPlaceholderData &&
    !isCartLoading &&
    !session.isPending;

  if (cartEmpty) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
          Checkout
        </h1>
        <div className="mt-10 flex flex-col items-center rounded-2xl border bg-card px-6 py-16 text-center shadow-xs">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <PackageXIcon className="size-7 text-muted-foreground" />
          </div>
          <h2 className="mt-5 font-semibold text-lg">Your cart is empty</h2>
          <p className="mt-2 max-w-sm text-muted-foreground text-sm">
            Add some products to your cart and they will show up here, ready for
            checkout.
          </p>
          <Button
            className="mt-6"
            nativeButton={false}
            render={<Link href="/products">Browse products</Link>}
          />
        </div>
      </main>
    );
  }

  const walletName = paymentMethod === "ESEWA" ? "eSewa" : "Khalti";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-16 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
            Checkout
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {totalCount} {totalCount === 1 ? "item" : "items"} · secure payment
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          nativeButton={false}
          render={
            <Link href="/products">
              <ArrowLeftIcon className="size-4" />
              Continue shopping
            </Link>
          }
        />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form
          id="checkout-form"
          onSubmit={form.handleSubmit(handleCreateOrder, handleInvalid)}
          className="flex flex-col gap-6"
        >
          <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground text-xs">
                1
              </span>
              <h2 className="font-semibold text-lg">Delivery details</h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <SavedAddressPicker onPick={applySavedAddress} />

              <Controller
                control={form.control}
                name="fullName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fullName">Full name</FieldLabel>
                    <Input
                      {...field}
                      id="fullName"
                      autoComplete="name"
                      placeholder="Jethalal Gada"
                      aria-invalid={fieldState.invalid}
                    />
                    {!!fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="phone">Phone number</FieldLabel>
                    <Input
                      {...field}
                      id="phone"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="98XXXXXXXX"
                      aria-invalid={fieldState.invalid}
                    />
                    {!!fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email (optional)</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      aria-invalid={fieldState.invalid}
                    />
                    {!!fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="province"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="province">Province</FieldLabel>
                    <NativeSelect
                      {...field}
                      id="province"
                      aria-invalid={fieldState.invalid}
                    >
                      <NativeSelectOption value="">
                        Select a province
                      </NativeSelectOption>
                      {NEPAL_PROVINCES.map((province) => (
                        <NativeSelectOption key={province} value={province}>
                          {province}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    {!!fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="city"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="city">City or district</FieldLabel>
                    <Input
                      {...field}
                      id="city"
                      autoComplete="address-level2"
                      placeholder="Kathmandu"
                      aria-invalid={fieldState.invalid}
                    />
                    {!!fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="address"
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    className="sm:col-span-2"
                  >
                    <FieldLabel htmlFor="address">Street address</FieldLabel>
                    <Textarea
                      {...field}
                      id="address"
                      rows={2}
                      autoComplete="street-address"
                      placeholder="Ward, tole, landmark"
                      aria-invalid={fieldState.invalid}
                    />
                    {!!fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="note"
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    className="sm:col-span-2"
                  >
                    <FieldLabel htmlFor="note">
                      Delivery note (optional)
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id="note"
                      rows={2}
                      placeholder="e.g. call when you reach the gate"
                      aria-invalid={fieldState.invalid}
                    />
                    {!!fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <LocationBox
                geocoding={geocoding}
                coordsManual={coordsManual}
                coordsError={coordsError}
                locating={locating}
                onLocate={handleLocate}
              />

              {isLoggedIn && (
                <SaveAddressRow
                  onSave={handleSaveAddress}
                  saving={saveAddress.isPending}
                />
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground text-xs">
                2
              </span>
              <h2 className="font-semibold text-lg">Payment method</h2>
            </div>

            <div className="mt-5 grid gap-3">
              {PAYMENT_OPTIONS.map((option) => {
                const selected = paymentMethod === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setPaymentMethod(option.id)}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "border-primary bg-primary/4 ring-1 ring-primary"
                        : "hover:border-foreground/30 hover:bg-accent/40"
                    )}
                  >
                    <span className="grid h-12 w-24 shrink-0 place-items-center">
                      {option.logo ? (
                        <Image
                          src={option.logo}
                          alt={option.name}
                          width={option.logoWidth}
                          height={option.logoHeight}
                          className={cn(
                            "w-auto max-w-full object-contain",
                            option.logoClass
                          )}
                          unoptimized
                        />
                      ) : (
                        <span className="grid size-10 place-items-center rounded-lg bg-emerald-600 text-white">
                          <BanknoteIcon className="size-5" />
                        </span>
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-sm">
                        {option.name}
                      </span>
                      <span className="block text-muted-foreground text-xs">
                        {option.tagline}
                      </span>
                    </span>

                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border-2",
                        selected
                          ? "border-primary"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {selected && (
                        <span className="size-2.5 rounded-full bg-primary" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {paymentMethod === "COD" ? (
              <div className="mt-4 flex items-start gap-3 rounded-xl border bg-muted/40 p-4 text-muted-foreground text-sm">
                <BanknoteIcon className="mt-0.5 size-4 shrink-0" />
                <p>
                  You pay{" "}
                  <span className="font-medium text-foreground">
                    Rs. {grandTotal.toLocaleString()}
                  </span>{" "}
                  in cash when your order arrives. Please keep the exact amount
                  ready.
                </p>
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-3 rounded-xl border bg-muted/40 p-4 text-muted-foreground text-sm">
                <LockIcon className="mt-0.5 size-4 shrink-0" />
                <p>
                  You will continue to a secure{" "}
                  <span className="font-medium text-foreground">
                    {walletName}
                  </span>{" "}
                  checkout to authorize this payment. Nothing is charged until
                  you confirm.
                </p>
              </div>
            )}
          </section>
        </form>

        <aside className="lg:sticky lg:top-30 lg:self-start">
          <div className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-lg">Order summary</h2>
              <span className="text-muted-foreground text-xs">
                {lines.length} {lines.length === 1 ? "line" : "lines"}
              </span>
            </div>

            <div className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-1">
              {lines.map(({ item, sku }) =>
                sku ? (
                  <div key={item.id} className="flex items-center gap-3">
                    <ProductImage
                      src={sku.imageUrl}
                      alt={sku.product.name}
                      className="size-12 shrink-0"
                      imageClassName="rounded-md border"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">
                        {sku.product.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Qty {item.quantity} · Rs.{" "}
                        {Number(sku.price).toLocaleString()}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-sm tabular-nums">
                      Rs. {(Number(sku.price) * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div key={item.id} className="flex items-center gap-3">
                    <Skeleton className="size-12 shrink-0 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                )
              )}
            </div>

            {!!isError && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="font-medium text-destructive text-xs">
                  Couldn&apos;t load some cart items.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-1 text-destructive text-xs underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            )}

            <div className="mt-5 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-foreground tabular-nums">
                  Rs. {subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>
                  Delivery
                  {typeof quote?.distanceKm === "number" && (
                    <span className="text-muted-foreground/70">
                      {" "}
                      · {quote.distanceKm} km
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    deliveryFree ? "text-emerald-600" : "text-foreground"
                  )}
                >
                  {deliveryLabel}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">
                  Rs. {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              form="checkout-form"
              disabled={createOrder.isPending || sessionPending || geocoding}
              className="mt-5 h-12 w-full"
            >
              {createOrder.isPending ? (
                <Spinner />
              ) : (
                <LockIcon className="size-4" />
              )}
              {createOrder.isPending
                ? "Placing your order..."
                : `Place order · Rs. ${grandTotal.toLocaleString()}`}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground text-xs">
              <span className="flex items-center gap-1">
                <ShieldCheckIcon className="size-3.5" />
                Buyer protection
              </span>
              {quote !== null && deliveryCharge === 0 && (
                <span className="flex items-center gap-1">
                  <TruckIcon className="size-3.5" />
                  Free delivery
                </span>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
