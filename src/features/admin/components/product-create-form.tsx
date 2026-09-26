"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  type UseFormReturn,
} from "react-hook-form";
import { trpc } from "@/__rpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  adminProductFormSchema,
  comboKey,
  type AdminProductFormInput,
  type AdminProductFormOutput,
} from "@/lib/admin-schema";
import { slugify } from "@/lib/catalog";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "lucide-react";
import { CategoryCreateCard } from "./category-create";
import { ImageUploadField } from "./image-upload-field";

type ProductForm = UseFormReturn<
  AdminProductFormInput,
  unknown,
  AdminProductFormOutput
>;

interface OptionDraft {
  name: string;
  values: string[];
}

function parseOptionRows(rows: Array<{ name: string; values: string }>) {
  return rows
    .map((row) => ({
      name: row.name.trim(),
      values: row.values
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry !== ""),
    }))
    .filter((row) => row.name !== "" && row.values.length > 0);
}

function buildCombos(parsed: OptionDraft[]) {
  let combos: Array<Array<{ name: string; value: string }>> = [[]];
  for (const option of parsed) {
    const next: Array<Array<{ name: string; value: string }>> = [];
    for (const combo of combos) {
      for (const value of option.values) {
        next.push([...combo, { name: option.name, value }]);
      }
    }
    combos = next;
  }
  return combos;
}

function suggestSku(
  productName: string,
  values: Array<{ name: string; value: string }>
) {
  const parts = [slugify(productName || "product")];
  for (const entry of values) {
    parts.push(slugify(entry.value));
  }
  return parts.filter((part) => part !== "").join("-");
}

/**
 * Regenerates the SKU rows from the option combos, keeping rows whose combo
 * already exists (so entered prices/stock survive option edits).
 */
function refreshSkuRows(form: ProductForm) {
  const combos = buildCombos(parseOptionRows(form.getValues("options")));
  const current = form.getValues("skus");
  const byCombo = new Map(current.map((row) => [comboKey(row.values), row]));
  const productName = form.getValues("name");

  const next = combos.map((combo) => {
    const existing = byCombo.get(comboKey(combo));
    if (existing) {
      return existing;
    }
    return {
      values: combo,
      sku: suggestSku(productName, combo),
      price: "",
      originalPrice: "",
      stock: "0",
      imageUrl: "",
    };
  });

  if (JSON.stringify(next) !== JSON.stringify(current)) {
    form.setValue("skus", next);
  }
}

export function ProductCreateForm() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [submitError, setSubmitError] = useState("");
  const [staleRows, setStaleRows] = useState(false);

  const { data: categories, isPending: categoriesPending } =
    trpc.admin.listCategories.useQuery();

  const form = useForm<AdminProductFormInput, unknown, AdminProductFormOutput>({
    resolver: zodResolver(adminProductFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      categoryId: "",
      baseImage: "",
      isPublished: true,
      options: [{ name: "", values: "" }],
      skus: [
        {
          values: [],
          sku: "",
          price: "",
          originalPrice: "",
          stock: "0",
          imageUrl: "",
        },
      ],
    },
  });

  const optionFields = useFieldArray({
    control: form.control,
    name: "options",
  });
  const skuFields = useFieldArray({ control: form.control, name: "skus" });
  const skuRows = form.watch("skus");

  const createProduct = trpc.admin.createProduct.useMutation({
    onSuccess: (product) => {
      toast.add({
        type: "success",
        title: "Product created",
        description: `${product.name} has been saved.`,
      });
      utils.admin.listProducts.invalidate();
      utils.admin.stats.invalidate();
      router.push(`/admin/products/${product.id}`);
    },
    onError: (error) => {
      setSubmitError(error.message);
      toast.add({
        type: "error",
        title: "Could not create product",
        description: error.message,
      });
    },
  });

  function onSubmit(values: AdminProductFormOutput) {
    const wanted = buildCombos(parseOptionRows(values.options)).map(comboKey);
    const have = values.skus.map((row) => comboKey(row.values));
    if (JSON.stringify(have) !== JSON.stringify(wanted)) {
      refreshSkuRows(form);
      setStaleRows(true);
      toast.add({
        type: "info",
        title: "Variant rows updated",
        description: "Review the generated SKUs and submit again.",
      });
      return;
    }

    setStaleRows(false);
    setSubmitError("");
    createProduct.mutate({
      name: values.name,
      slug: values.slug,
      description: values.description,
      categoryId: values.categoryId,
      baseImage: values.baseImage,
      isPublished: values.isPublished,
      skus: values.skus.map((row) => ({
        sku: row.sku,
        price: row.price,
        originalPrice: row.originalPrice,
        stock: row.stock,
        imageUrl: row.imageUrl,
        optionValues: row.values,
      })),
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
            New product
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Add the details, upload an image and set up the SKUs.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          nativeButton={false}
          render={
            <Link href="/admin/products">
              <ArrowLeftIcon className="size-4" />
              All products
            </Link>
          }
        />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!!submitError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm">
            {submitError}
          </p>
        )}
        {!!staleRows && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-700 text-sm dark:text-amber-400">
            The variant rows were regenerated from your options — give them a
            quick review and hit create again.
          </p>
        )}

        <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
          <h2 className="font-semibold text-lg">Product details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="product-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="product-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="iPhone 15"
                    onBlur={() => {
                      field.onBlur();
                      if (!form.formState.dirtyFields.slug) {
                        form.setValue("slug", slugify(field.value), {
                          shouldDirty: false,
                          shouldValidate: !!form.formState.errors.slug,
                        });
                      }
                    }}
                  />
                  {!!fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="slug"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="product-slug">Slug</FieldLabel>
                  <Input
                    {...field}
                    id="product-slug"
                    aria-invalid={fieldState.invalid}
                    placeholder="iphone-15"
                  />
                  {!!fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="categoryId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="product-category">Category</FieldLabel>
                  <NativeSelect
                    {...field}
                    id="product-category"
                    aria-invalid={fieldState.invalid}
                    disabled={categoriesPending}
                  >
                    <NativeSelectOption value="">
                      {categoriesPending
                        ? "Loading categories…"
                        : "Select a category"}
                    </NativeSelectOption>
                    {categories?.map((category) => (
                      <NativeSelectOption key={category.id} value={category.id}>
                        {category.name}
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
              name="isPublished"
              control={form.control}
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 px-4 py-3 sm:self-start">
                  <div>
                    <p className="font-medium text-sm">Publish immediately</p>
                    <p className="text-muted-foreground text-xs">
                      Visible in the store right away.
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Publish immediately"
                  />
                </div>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="sm:col-span-2"
                >
                  <FieldLabel htmlFor="product-description">
                    Description
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="product-description"
                    rows={4}
                    aria-invalid={fieldState.invalid}
                    placeholder="A short, catchy description — a few sentences is perfect."
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
          <h2 className="font-semibold text-lg">Product image</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Required. SKUs without their own image fall back to this one.
          </p>
          <div className="mt-5">
            <Controller
              name="baseImage"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <ImageUploadField
                    id="product-base-image"
                    label="Main image"
                    value={field.value}
                    onChange={field.onChange}
                    hint="JPG or PNG up to 4 MB."
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
          <h2 className="font-semibold text-lg">Options</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Optional. Add options like Color or Size — one SKU row is generated
            for every combination below.
          </p>

          <div className="mt-5 space-y-3">
            {optionFields.fields.map((option, index) => (
              <div
                key={option.id}
                className="grid items-start gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]"
              >
                <Controller
                  name={`options.${index}.name`}
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Option name (Color)"
                      aria-label={`Option ${index + 1} name`}
                      onBlur={() => {
                        field.onBlur();
                        refreshSkuRows(form);
                      }}
                    />
                  )}
                />
                <Controller
                  name={`options.${index}.values`}
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Values, comma separated (Black, Blue, Green)"
                      aria-label={`Option ${index + 1} values`}
                      onBlur={() => {
                        field.onBlur();
                        refreshSkuRows(form);
                      }}
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  aria-label={`Remove option ${index + 1}`}
                  onClick={() => {
                    optionFields.remove(index);
                    refreshSkuRows(form);
                  }}
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => optionFields.append({ name: "", values: "" })}
            >
              <PlusIcon className="size-4" />
              Add option
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-lg">Variants (SKUs)</h2>
            <Badge variant="secondary">
              {skuRows.length} {skuRows.length === 1 ? "row" : "rows"}
            </Badge>
          </div>

          <div className="mt-5 space-y-4">
            {skuFields.fields.map((fieldRow, index) => {
              const row = skuRows[index];
              if (!row) {
                return null;
              }
              return (
                <div
                  key={fieldRow.id}
                  className="space-y-4 rounded-xl border p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {row.values.length > 0 ? (
                      row.values.map((entry) => (
                        <Badge
                          key={`${entry.name}-${entry.value}`}
                          variant="secondary"
                        >
                          {entry.name}: {entry.value}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">Standard</Badge>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Controller
                      name={`skus.${index}.sku`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={`sku-code-${index}`}>
                            SKU code
                          </FieldLabel>
                          <Input
                            {...field}
                            id={`sku-code-${index}`}
                            aria-invalid={fieldState.invalid}
                            placeholder="IPH15-BLU-256"
                          />
                          {!!fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    <Controller
                      name={`skus.${index}.price`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={`sku-price-${index}`}>
                            Price (Rs.)
                          </FieldLabel>
                          <Input
                            {...field}
                            id={`sku-price-${index}`}
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
                      name={`skus.${index}.originalPrice`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={`sku-original-${index}`}>
                            Was price (optional)
                          </FieldLabel>
                          <Input
                            {...field}
                            id={`sku-original-${index}`}
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
                      name={`skus.${index}.stock`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={`sku-stock-${index}`}>
                            Stock
                          </FieldLabel>
                          <Input
                            {...field}
                            id={`sku-stock-${index}`}
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
                    name={`skus.${index}.imageUrl`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <ImageUploadField
                          id={`sku-image-${index}`}
                          label="SKU image (optional)"
                          value={field.value}
                          onChange={field.onChange}
                          hint="Falls back to the product image."
                        />
                        {!!fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/admin/products">Cancel</Link>}
          />
          <Button type="submit" disabled={createProduct.isPending}>
            {createProduct.isPending ? <Spinner /> : <PlusIcon />}
            Create product
          </Button>
        </div>
      </form>

      <CategoryCreateCard
        onCreated={(category) => {
          utils.admin.listCategories.invalidate();
          form.setValue("categoryId", category.id, { shouldValidate: true });
        }}
      />
    </div>
  );
}
