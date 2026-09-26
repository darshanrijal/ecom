"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  adminProductEditFormSchema,
  type AdminProductEditFormValues,
} from "@/lib/admin-schema";
import { slugify } from "@/lib/catalog";
import { ArrowLeftIcon, CheckIcon, EyeIcon, TrashIcon } from "lucide-react";
import { ImageUploadField } from "./image-upload-field";
import { SkuManager } from "./sku-manager";

type AdminProductDetail = RouterOutputs["admin"]["getProduct"];

interface ProductInfoFormProps {
  product: AdminProductDetail;
}

function ProductInfoForm({ product }: ProductInfoFormProps) {
  const utils = trpc.useUtils();

  const { data: categories } = trpc.admin.listCategories.useQuery();

  const form = useForm<AdminProductEditFormValues>({
    resolver: zodResolver(adminProductEditFormSchema),
    defaultValues: {
      name: product.name,
      slug: product.slug,
      description: product.description,
      categoryId: product.categoryId,
      baseImage: product.baseImage,
      isPublished: product.isPublished,
    },
  });

  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      toast.add({ type: "success", title: "Product updated" });
      utils.admin.getProduct.invalidate();
      utils.admin.listProducts.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Could not update product",
        description: error.message,
      });
    },
  });

  function onSubmit(values: AdminProductEditFormValues) {
    updateProduct.mutate({ productId: product.id, ...values });
  }

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-lg">Product details</h2>
        <p className="text-muted-foreground text-xs">
          Created {new Date(product.createdAt).toLocaleDateString()}
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="edit-name">Name</FieldLabel>
                <Input
                  {...field}
                  id="edit-name"
                  aria-invalid={fieldState.invalid}
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
                <FieldLabel htmlFor="edit-slug">Slug</FieldLabel>
                <Input
                  {...field}
                  id="edit-slug"
                  aria-invalid={fieldState.invalid}
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
                <FieldLabel htmlFor="edit-category">Category</FieldLabel>
                <NativeSelect
                  {...field}
                  id="edit-category"
                  aria-invalid={fieldState.invalid}
                >
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
                  <p className="font-medium text-sm">Published</p>
                  <p className="text-muted-foreground text-xs">
                    Hidden products stay off the storefront.
                  </p>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Published"
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
                <FieldLabel htmlFor="edit-description">Description</FieldLabel>
                <Textarea
                  {...field}
                  id="edit-description"
                  rows={4}
                  aria-invalid={fieldState.invalid}
                />
                {!!fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <Controller
          name="baseImage"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <ImageUploadField
                id="edit-base-image"
                label="Product image"
                value={field.value}
                onChange={field.onChange}
                hint="SKUs without their own image fall back to this one."
              />
              {!!fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={updateProduct.isPending}>
            {updateProduct.isPending ? <Spinner /> : <CheckIcon />}
            Save changes
          </Button>
        </div>
      </form>
    </section>
  );
}

interface ProductEditProps {
  productId: string;
}

export function ProductEdit({ productId }: ProductEditProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    data: product,
    isPending,
    isError,
  } = trpc.admin.getProduct.useQuery({ productId });

  const removeProduct = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => {
      toast.add({ type: "success", title: "Product deleted" });
      utils.admin.listProducts.invalidate();
      utils.admin.stats.invalidate();
      router.push("/admin/products");
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Could not delete product",
        description: error.message,
      });
      setConfirmDelete(false);
    },
  });

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="font-medium">Product not found.</p>
        <Button
          className="mt-4"
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/admin/products">
              <ArrowLeftIcon className="size-4" />
              Back to products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
              {product.name}
            </h1>
            <Badge variant={product.isPublished ? "default" : "outline"}>
              {product.isPublished ? "Published" : "Draft"}
            </Badge>
            <Badge variant="outline">{product.category.name}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">/{product.slug}</p>
        </div>

        <div className="flex items-center gap-2">
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
          {!!product.isPublished && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/products/${product.slug}`}>
                  <EyeIcon className="size-4" />
                  View on store
                </Link>
              }
            />
          )}
        </div>
      </div>

      <ProductInfoForm product={product} />

      <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-lg">Options</h2>
          <Badge variant="secondary">{product.options.length}</Badge>
        </div>

        {product.options.length === 0 ? (
          <p className="mt-3 text-muted-foreground text-sm">
            This product has no options — it sells as a single SKU.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {product.options.map((option) => (
              <div
                key={option.id}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="font-medium text-sm">{option.name}:</span>
                {option.values.map((value) => (
                  <Badge key={value.id} variant="outline">
                    {value.value}
                  </Badge>
                ))}
              </div>
            ))}
            <p className="text-muted-foreground text-xs">
              Options are set when the product is created. Add or remove SKUs
              for the combinations below.
            </p>
          </div>
        )}
      </section>

      <SkuManager product={product} />

      <section className="rounded-2xl border border-destructive/30 bg-card p-5 shadow-xs sm:p-6">
        <h2 className="font-semibold text-destructive text-lg">Danger zone</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Deleting a product removes it and all of its SKUs from the store.
          Order history is kept.
        </p>
        <div className="mt-4 flex justify-end">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                disabled={removeProduct.isPending}
                onClick={() => removeProduct.mutate({ productId })}
              >
                {removeProduct.isPending ? <Spinner /> : <TrashIcon />}
                Yes, delete this product
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <TrashIcon />
              Delete product
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
