"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import {
  adminCategoryFormSchema,
  type AdminCategoryFormValues,
} from "@/lib/admin-schema";
import { FolderPlusIcon } from "lucide-react";

interface CategoryCreateCardProps {
  onCreated?: (category: { id: string; name: string }) => void;
}

export function CategoryCreateCard({ onCreated }: CategoryCreateCardProps) {
  const utils = trpc.useUtils();

  const form = useForm<AdminCategoryFormValues>({
    resolver: zodResolver(adminCategoryFormSchema),
    defaultValues: { name: "", description: "" },
  });

  const createCategory = trpc.admin.createCategory.useMutation({
    onSuccess: (category) => {
      toast.add({
        type: "success",
        title: "Category created",
        description: `${category.name} is ready to use.`,
      });
      form.reset({ name: "", description: "" });
      utils.admin.listCategories.invalidate();
      onCreated?.(category);
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Could not create category",
        description: error.message,
      });
    },
  });

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex items-center gap-2">
        <FolderPlusIcon className="size-5 text-primary" />
        <h2 className="font-semibold text-lg">Create a category</h2>
      </div>

      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit((values) =>
          createCategory.mutate({
            name: values.name,
            description: values.description || null,
          })
        )}
      >
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="category-name">Category name</FieldLabel>
              <Input
                {...field}
                id="category-name"
                aria-invalid={fieldState.invalid}
                placeholder="Air Conditioners"
              />
              {!!fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="category-description">
                Description (optional)
              </FieldLabel>
              <Input
                {...field}
                id="category-description"
                aria-invalid={fieldState.invalid}
                placeholder="Cool your home this summer."
              />
              {!!fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <div className="flex justify-end sm:col-span-2">
          <Button
            type="submit"
            variant="outline"
            disabled={createCategory.isPending}
          >
            {createCategory.isPending ? <Spinner /> : <FolderPlusIcon />}
            Add category
          </Button>
        </div>
      </form>
    </section>
  );
}
