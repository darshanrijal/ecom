"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}

function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

interface NotificationItem {
  id: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}

const notifications: NotificationItem[] = [
  {
    id: "new-order",
    label: "New order placed",
    description: "Get notified whenever a customer places a new order.",
    defaultChecked: true,
  },
  {
    id: "payment-confirmed",
    label: "Payment confirmed",
    description: "Get notified when an eSewa or Khalti payment is verified.",
    defaultChecked: true,
  },
  {
    id: "low-stock",
    label: "Low stock alerts",
    description:
      "Get notified when a product falls below the low stock threshold.",
    defaultChecked: true,
  },
  {
    id: "reviews",
    label: "Customer reviews",
    description: "Get notified when a customer leaves a product review.",
    defaultChecked: false,
  },
];

function SaveButton({
  saved,
  onClick,
}: {
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {saved ? (
        <span className="inline-flex items-center gap-1.5 text-emerald-700 text-sm dark:text-emerald-400">
          <CheckCircle2Icon className="size-4" />
          Saved
        </span>
      ) : null}
      <Button onClick={onClick}>Save changes</Button>
    </div>
  );
}

export function SettingsForm() {
  const [saved, setSaved] = useState(false);
  const [storeName, setStoreName] = useState("Gada Electronics");
  const [supportEmail, setSupportEmail] = useState("support@gada.electronics");
  const [ordersEmail, setOrdersEmail] = useState("orders@gada.electronics");
  const [address, setAddress] = useState(
    "Kumaripati, Lalitpur, Bagmati Province, Nepal"
  );
  const [lowStock, setLowStock] = useState("5");
  const [esewaEnv, setEsewaEnv] = useState("sandbox");
  const [khaltiEnv, setKhaltiEnv] = useState("sandbox");
  const [notif, setNotif] = useState<Record<string, boolean>>(
    Object.fromEntries(notifications.map((n) => [n.id, n.defaultChecked]))
  );

  const markDirty = () => setSaved(false);
  const save = () => setSaved(true);

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="w-full justify-start gap-1 sm:w-auto">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <div className="max-w-2xl space-y-6">
          <div className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h2 className="font-semibold text-lg">Store details</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Basic information shown to customers across the store.
              </p>
            </div>

            <Field label="Store name" htmlFor="store-name">
              <Input
                id="store-name"
                value={storeName}
                onChange={(event) => {
                  setStoreName(event.target.value);
                  markDirty();
                }}
              />
            </Field>

            <Field label="Support email" htmlFor="support-email">
              <Input
                id="support-email"
                type="email"
                value={supportEmail}
                onChange={(event) => {
                  setSupportEmail(event.target.value);
                  markDirty();
                }}
              />
            </Field>

            <Field label="Order notification email" htmlFor="orders-email">
              <Input
                id="orders-email"
                type="email"
                value={ordersEmail}
                onChange={(event) => {
                  setOrdersEmail(event.target.value);
                  markDirty();
                }}
              />
            </Field>

            <Field label="Low stock threshold" htmlFor="low-stock">
              <Input
                id="low-stock"
                type="number"
                min={0}
                value={lowStock}
                onChange={(event) => {
                  setLowStock(event.target.value);
                  markDirty();
                }}
              />
            </Field>

            <Field
              label="Store address"
              htmlFor="store-address"
              hint="Shown on order receipts and invoices."
            >
              <Textarea
                id="store-address"
                rows={3}
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  markDirty();
                }}
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <SaveButton saved={saved} onClick={save} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="payments">
        <div className="max-w-2xl space-y-6">
          <div className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h2 className="font-semibold text-lg">eSewa</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Mirrors the ESEWA_* server environment variables.
              </p>
            </div>

            <Field label="Merchant code" htmlFor="esewa-merchant">
              <Input id="esewa-merchant" defaultValue="EPAYTEST" readOnly />
            </Field>

            <Field label="Secret key" htmlFor="esewa-secret">
              <Input
                id="esewa-secret"
                type="password"
                defaultValue="8gBm/:&EnhH.1/q"
                readOnly
              />
            </Field>

            <Field label="Environment" htmlFor="esewa-env">
              <Select
                value={esewaEnv}
                onValueChange={(value) => {
                  setEsewaEnv(value ?? "sandbox");
                  markDirty();
                }}
              >
                <SelectTrigger id="esewa-env" className="w-full">
                  <SelectValue>
                    {(value) =>
                      value === "production" ? "Production" : "Sandbox (UAT)"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (UAT)</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Separator />

          <div className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h2 className="font-semibold text-lg">Khalti</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Mirrors the KHALTI_* server environment variables.
              </p>
            </div>

            <Field label="Public key" htmlFor="khalti-public">
              <Input
                id="khalti-public"
                defaultValue="3ade723de11245c7a6811451818cc3cd"
                readOnly
              />
            </Field>

            <Field label="Secret key" htmlFor="khalti-secret">
              <Input
                id="khalti-secret"
                type="password"
                defaultValue="aede381c3ef143e1b6e749d7217cb8b3"
                readOnly
              />
            </Field>

            <Field label="Environment" htmlFor="khalti-env">
              <Select
                value={khaltiEnv}
                onValueChange={(value) => {
                  setKhaltiEnv(value ?? "sandbox");
                  markDirty();
                }}
              >
                <SelectTrigger id="khalti-env" className="w-full">
                  <SelectValue>
                    {(value) =>
                      value === "production" ? "Production" : "Sandbox"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <p className="text-muted-foreground text-xs">
            Payment keys are read-only here — edit them in your deployment
            environment variables.
          </p>

          <div className="flex justify-end">
            <SaveButton saved={saved} onClick={save} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="notifications">
        <div className="max-w-2xl space-y-6">
          <div className="divide-y rounded-xl border bg-card">
            {notifications.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="mt-0.5 text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </div>
                <Switch
                  checked={notif[item.id]}
                  onCheckedChange={(checked) => {
                    setNotif((prev) => ({ ...prev, [item.id]: checked }));
                    markDirty();
                  }}
                  aria-label={item.label}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <SaveButton saved={saved} onClick={save} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
