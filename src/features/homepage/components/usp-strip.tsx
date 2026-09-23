import {
  CreditCardIcon,
  ShieldCheckIcon,
  TruckIcon,
  WrenchIcon,
} from "lucide-react";

const usps = [
  {
    icon: TruckIcon,
    title: "Free delivery",
    description:
      "Free delivery inside Kathmandu Valley on orders over Rs. 5,000",
  },
  {
    icon: CreditCardIcon,
    title: "0% EMI available",
    description: "Easy monthly installments on major debit & credit cards",
  },
  {
    icon: ShieldCheckIcon,
    title: "Genuine warranty",
    description: "Every product backed by the official manufacturer warranty",
  },
  {
    icon: WrenchIcon,
    title: "After-sales service",
    description: "In-house service center with genuine spare parts",
  },
];

export function UspStrip() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {usps.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">{title}</p>
              <p className="mt-0.5 text-muted-foreground text-xs leading-5">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
