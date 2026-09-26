"use client";

import { useEffect, useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { trpc } from "@/__rpc/client";
import { slugify } from "@/lib/catalog";

export interface CategoryFormValues {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryFormValues | null;
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: CategoryFormDialogProps) {
  const utils = trpc.useUtils();
  const createCategory = trpc.admin.categories.create.useMutation();
  const updateCategory = trpc.admin.categories.update.useMutation();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(category ? category.name : "");
    setSlug(category ? category.slug : "");
    setDescription(category ? category.description : "");
  }, [open, category]);

  const save = async () => {
    try {
      if (category) {
        await updateCategory.mutateAsync({
          id: category.id,
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || undefined,
        });
      } else {
        await createCategory.mutateAsync({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || undefined,
        });
      }
    } catch (error) {
      toast.add({
        title: "Couldn't save category",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
      return;
    }

    await utils.admin.categories.list.invalidate();
    toast.add({
      title: category ? "Category updated" : "Category created",
      type: "success",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit category" : "Add category"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Review the details below, then save your changes."
              : "Create a new category for your catalog."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field label="Name" htmlFor="category-name">
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Smartphones"
            />
          </Field>

          <Field label="Slug" htmlFor="category-slug">
            <Input
              id="category-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder={name ? slugify(name) : "auto-generated"}
            />
          </Field>

          <Field label="Description" htmlFor="category-description">
            <Textarea
              id="category-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional short description…"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={
              !name.trim() ||
              createCategory.isPending ||
              updateCategory.isPending
            }
          >
            {category ? "Save changes" : "Create category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
