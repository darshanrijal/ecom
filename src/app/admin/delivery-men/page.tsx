"use client";

import { useState } from "react";

import { PageHeader } from "@/features/admin/components/page-header";
import { DeliveryMenTable } from "@/features/admin/components/delivery-men-table";
import {
  type DeliveryManFormValues,
  DeliveryManFormDialog,
} from "@/features/admin/components/delivery-man-form-dialog";

export default function AdminDeliveryMenPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryManFormValues | null>(null);

  return (
    <>
      <PageHeader
        title="Delivery men"
        description="Staff you can assign to orders for delivery tracking."
      />
      <DeliveryMenTable
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        onEdit={(deliveryMan) => {
          setEditing(deliveryMan);
          setDialogOpen(true);
        }}
      />

      <DeliveryManFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deliveryMan={editing}
      />
    </>
  );
}
