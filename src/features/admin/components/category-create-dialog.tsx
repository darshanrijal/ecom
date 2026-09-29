"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FolderPlusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import {
  adminCategoryFormSchema,
  type AdminCategoryFormValues,
} from "@/lib/admin-schema";

interface CategoryCreateDialogProps {
  onCreated?: (category: { id: string; name: string }) => void;
}

export function CategoryCreateDialog({ onCreated }: CategoryCreateDialogProps) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

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
      utils.admin.categories.list.invalidate();
      utils.admin.listCategories.invalidate();
      setOpen(false);
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
    <>
      <Button
        type="button"
        size="icon"
        aria-label="Create category"
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create category</DialogTitle>
            <DialogDescription>
              Add it here and it will be ready to pick in the dropdown.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((values) => {
              createCategory.mutate({
                name: values.name,
                description: values.description || null,
              });
            })}
          >
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="quick-category-name">
                    Category name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="quick-category-name"
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
                  <FieldLabel htmlFor="quick-category-description">
                    Description (optional)
                  </FieldLabel>
                  <Input
                    {...field}
                    id="quick-category-description"
                    aria-invalid={fieldState.invalid}
                    placeholder="Cool your home this summer."
                  />
                  {!!fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                {createCategory.isPending ? <Spinner /> : <FolderPlusIcon />}
                Add category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
