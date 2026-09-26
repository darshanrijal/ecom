"use client";

import { useState } from "react";

import { PageHeader } from "@/features/admin/components/page-header";
import { CategoriesTable } from "@/features/admin/components/categories-table";
import {
  type CategoryFormValues,
  CategoryFormDialog,
} from "@/features/admin/components/category-form-dialog";

export default function AdminCategoriesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryFormValues | null>(null);

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organize your catalog into browsable categories."
      />
      <CategoriesTable
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        onEdit={(category) => {
          setEditing(category);
          setDialogOpen(true);
        }}
      />

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
      />
    </>
  );
}
