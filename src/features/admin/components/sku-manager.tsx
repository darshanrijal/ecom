"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { type RouterOutputs, trpc } from "@/__rpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import {
  adminSkuFormSchema,
  type AdminSkuFormOutput,
  type AdminSkuFormValues,
} from "@/lib/admin-schema";
import { CheckIcon, PlusIcon, TrashIcon } from "lucide-react";
import { ImageUploadField } from "./image-upload-field";

type AdminProductDetail = RouterOutputs["admin"]["getProduct"];
type ProductSku = AdminProductDetail["productSKUs"][number];

const NEW_VALUE = "__new__";

interface SkuCardProps {
  sku: ProductSku;
  baseImage: string;
}

function SkuCard({ sku, baseImage }: SkuCardProps) {
  const utils = trpc.useUtils();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const usesFallback = sku.imageUrl === baseImage;

  const form = useForm<AdminSkuFormValues, unknown, AdminSkuFormOutput>({
    resolver: zodResolver(adminSkuFormSchema),
    defaultValues: {
      sku: sku.sku,
      price: String(sku.price),
      originalPrice:
        sku.originalPrice && sku.originalPrice !== sku.price
          ? String(sku.originalPrice)
          : "",
      stock: String(sku.stock),
      imageUrl: usesFallback ? "" : sku.imageUrl,
    },
  });

  const updateSku = trpc.admin.updateSku.useMutation({
    onSuccess: () => {
      toast.add({ type: "success", title: "SKU updated" });
      utils.admin.getProduct.invalidate();
      utils.admin.listProducts.invalidate();
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Could not update SKU",
        description: error.message,
      });
    },
  });

  const deleteSku = trpc.admin.deleteSku.useMutation({
    onSuccess: () => {
      toast.add({ type: "success", title: "SKU deleted" });
      utils.admin.getProduct.invalidate();
      utils.admin.listProducts.invalidate();
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Could not delete SKU",
        description: error.message,
      });
      setConfirmDelete(false);
    },
  });

  function onSubmit(values: AdminSkuFormOutput) {
    updateSku.mutate({ skuId: sku.id, ...values });
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {sku.labels.length > 0 ? (
            sku.labels.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))
          ) : (
            <Badge variant="outline">Standard</Badge>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            {sku.sku}
          </Badge>
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteSku.isPending}
              onClick={() => deleteSku.mutate({ skuId: sku.id })}
            >
              {deleteSku.isPending ? <Spinner /> : "Confirm delete"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <TrashIcon className="size-4" />
            Delete
          </Button>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Controller
            name="sku"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`edit-sku-${sku.id}`}>SKU code</FieldLabel>
                <Input
                  {...field}
                  id={`edit-sku-${sku.id}`}
                  aria-invalid={fieldState.invalid}
                />
                {!!fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="price"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`edit-price-${sku.id}`}>
                  Price (Rs.)
                </FieldLabel>
                <Input
                  {...field}
                  id={`edit-price-${sku.id}`}
                  aria-invalid={fieldState.invalid}
                  inputMode="decimal"
                />
                {!!fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="originalPrice"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`edit-original-${sku.id}`}>
                  Was price (optional)
                </FieldLabel>
                <Input
                  {...field}
                  id={`edit-original-${sku.id}`}
                  aria-invalid={fieldState.invalid}
                  inputMode="decimal"
                  placeholder="Blank = no discount"
                />
                {!!fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="stock"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`edit-stock-${sku.id}`}>Stock</FieldLabel>
                <Input
                  {...field}
                  id={`edit-stock-${sku.id}`}
                  aria-invalid={fieldState.invalid}
                  inputMode="numeric"
                />
                {!!fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <Controller
          name="imageUrl"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <ImageUploadField
                id={`edit-image-${sku.id}`}
                label="SKU image"
                value={field.value}
                onChange={field.onChange}
                hint={
                  usesFallback
                    ? "Currently using the product image."
                    : "Remove to fall back to the product image."
                }
              />
              {!!fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={updateSku.isPending}>
            {updateSku.isPending ? <Spinner /> : <CheckIcon />}
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}

interface SkuAddFormProps {
  product: AdminProductDetail;
}

function SkuAddForm({ product }: SkuAddFormProps) {
  const utils = trpc.useUtils();
  const { options } = product;
  const [selected, setSelected] = useState<string[]>(() =>
    options.map(() => "")
  );
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [optionError, setOptionError] = useState("");

  const form = useForm<AdminSkuFormValues, unknown, AdminSkuFormOutput>({
    resolver: zodResolver(adminSkuFormSchema),
    defaultValues: {
      sku: "",
      price: "",
      originalPrice: "",
      stock: "0",
      imageUrl: "",
    },
  });

  const createSku = trpc.admin.createSku.useMutation({
    onSuccess: () => {
      toast.add({ type: "success", title: "SKU added" });
      form.reset({
        sku: "",
        price: "",
        originalPrice: "",
        stock: "0",
        imageUrl: "",
      });
      setSelected(options.map(() => ""));
      setNewValues({});
      setOptionError("");
      utils.admin.getProduct.invalidate();
      utils.admin.listProducts.invalidate();
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Could not add SKU",
        description: error.message,
      });
    },
  });

  const canAdd = options.length > 0 || product.productSKUs.length === 0;
  if (!canAdd) {
    return (
      <p className="text-muted-foreground text-sm">
        This product has no options, so it only supports one SKU. Delete the
        existing SKU first if you want to replace it.
      </p>
    );
  }

  function onSubmit(values: AdminSkuFormOutput) {
    const optionValueIds: string[] = [];
    const fresh: Array<{ name: string; value: string }> = [];

    for (const [index, option] of options.entries()) {
      const pick = selected[index] ?? "";
      if (!pick) {
        setOptionError(`Select a value for "${option.name}"`);
        return;
      }
      if (pick === NEW_VALUE) {
        const value = (newValues[option.name] ?? "").trim();
        if (!value) {
          setOptionError(`Enter the new "${option.name}" value`);
          return;
        }
        fresh.push({ name: option.name, value });
      } else {
        optionValueIds.push(pick);
      }
    }

    setOptionError("");
    createSku.mutate({
      productId: product.id,
      ...values,
      optionValueIds,
      newValues: fresh,
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4 rounded-xl border border-dashed p-4"
    >
      <div className="flex items-center gap-2">
        <PlusIcon className="size-4 text-primary" />
        <h3 className="font-medium text-sm">Add a SKU</h3>
      </div>

      {options.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {options.map((option, index) => (
            <div key={option.id} className="space-y-1.5">
              <FieldLabel htmlFor={`add-option-${option.id}`}>
                {option.name}
              </FieldLabel>
              <NativeSelect
                id={`add-option-${option.id}`}
                value={selected[index] ?? ""}
                onChange={(event) => {
                  const next = [...selected];
                  next[index] = event.target.value;
                  setSelected(next);
                  setOptionError("");
                }}
              >
                <NativeSelectOption value="">
                  Select {option.name}
                </NativeSelectOption>
                {option.values.map((value) => (
                  <NativeSelectOption key={value.id} value={value.id}>
                    {value.value}
                  </NativeSelectOption>
                ))}
                <NativeSelectOption value={NEW_VALUE}>
                  + New value…
                </NativeSelectOption>
              </NativeSelect>
              {(selected[index] ?? "") === NEW_VALUE && (
                <Input
                  placeholder={`New ${option.name} value`}
                  aria-label={`New ${option.name} value`}
                  value={newValues[option.name] ?? ""}
                  onChange={(event) =>
                    setNewValues((previous) => ({
                      ...previous,
                      [option.name]: event.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}

      {optionError !== "" && (
        <p className="text-destructive text-sm">{optionError}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Controller
          name="sku"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="new-sku-code">SKU code</FieldLabel>
              <Input
                {...field}
                id="new-sku-code"
                aria-invalid={fieldState.invalid}
                placeholder="IPH15-GRN-128"
              />
              {!!fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
        <Controller
          name="price"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="new-sku-price">Price (Rs.)</FieldLabel>
              <Input
                {...field}
                id="new-sku-price"
                aria-invalid={fieldState.invalid}
                inputMode="decimal"
                placeholder="79900"
              />
              {!!fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
        <Controller
          name="originalPrice"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="new-sku-original">
                Was price (optional)
              </FieldLabel>
              <Input
                {...field}
                id="new-sku-original"
                aria-invalid={fieldState.invalid}
                inputMode="decimal"
                placeholder="89900"
              />
              {!!fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
        <Controller
          name="stock"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="new-sku-stock">Stock</FieldLabel>
              <Input
                {...field}
                id="new-sku-stock"
                aria-invalid={fieldState.invalid}
                inputMode="numeric"
                placeholder="25"
              />
              {!!fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </div>

      <Controller
        name="imageUrl"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <ImageUploadField
              id="new-sku-image"
              label="SKU image (optional)"
              value={field.value}
              onChange={field.onChange}
              hint="Falls back to the product image."
            />
            {!!fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={createSku.isPending}>
          {createSku.isPending ? <Spinner /> : <PlusIcon />}
          Add SKU
        </Button>
      </div>
    </form>
  );
}

interface SkuManagerProps {
  product: AdminProductDetail;
}

export function SkuManager({ product }: SkuManagerProps) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-lg">SKUs</h2>
        <Badge variant="secondary">{product.productSKUs.length}</Badge>
      </div>

      <div className="mt-5 space-y-4">
        {product.productSKUs.map((sku) => (
          <SkuCard key={sku.id} sku={sku} baseImage={product.baseImage} />
        ))}
        <SkuAddForm product={product} />
      </div>
    </section>
  );
}
