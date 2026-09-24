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
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type z from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
import { NEPAL_PROVINCES, shippingInfoSchema } from "@/lib/order-schema";
import { cn } from "@/lib/utils";
import { useOrderStore } from "@/stores/order-store";
import { ProductImage } from "@/features/products/components/product-image";
import { useCartSkus } from "@/hooks/use-cart-skus";

type ShippingFormValues = z.infer<typeof shippingInfoSchema>;

const PAYMENT_OPTIONS = [
  {
    id: "COD",
    name: "Cash on Delivery",
    tagline: "Pay in cash when your order arrives",
    tileClass: "bg-emerald-600",
    letter: "₹",
  },
  {
    id: "ESEWA",
    name: "eSewa",
    tagline: "Pay from your eSewa wallet",
    tileClass: "bg-[#60BB46]",
    letter: "e",
  },
  {
    id: "KHALTI",
    name: "Khalti",
    tagline: "Pay from your Khalti wallet",
    tileClass: "bg-[#5C2D91]",
    letter: "K",
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");

  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingInfoSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      province: "",
      city: "",
      address: "",
      note: "",
    },
  });

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
          onSubmit={form.handleSubmit(handleCreateOrder)}
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
                const Icon = option.letter === "₹" ? BanknoteIcon : null;
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
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-lg text-white",
                        option.tileClass
                      )}
                    >
                      {Icon ? (
                        <Icon className="size-5" />
                      ) : (
                        <span className="font-bold text-lg">
                          {option.letter}
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
                    Rs. {subtotal.toLocaleString()}
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

        <aside className="lg:sticky lg:top-24 lg:self-start">
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
                <span>Delivery</span>
                <span className="font-medium text-emerald-600">FREE</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">
                  Rs. {subtotal.toLocaleString()}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              form="checkout-form"
              disabled={createOrder.isPending || sessionPending}
              className="mt-5 h-12 w-full"
            >
              {createOrder.isPending ? (
                <Spinner />
              ) : (
                <LockIcon className="size-4" />
              )}
              {createOrder.isPending
                ? "Placing your order..."
                : `Place order · Rs. ${subtotal.toLocaleString()}`}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground text-xs">
              <span className="flex items-center gap-1">
                <ShieldCheckIcon className="size-3.5" />
                Buyer protection
              </span>
              <span className="flex items-center gap-1">
                <TruckIcon className="size-3.5" />
                Free delivery
              </span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
