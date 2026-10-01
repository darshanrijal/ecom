import {
  CreditCardIcon,
  ShieldCheckIcon,
  TruckIcon,
  WrenchIcon,
} from "lucide-react";

const usps = [
  {
    icon: TruckIcon,
    title: "Free valley delivery",
    description: "On orders over Rs. 5,000 inside Kathmandu Valley",
  },
  {
    icon: CreditCardIcon,
    title: "0% EMI",
    description: "Monthly installments on major debit and credit cards",
  },
  {
    icon: ShieldCheckIcon,
    title: "Genuine warranty",
    description: "Every product ships with manufacturer coverage",
  },
  {
    icon: WrenchIcon,
    title: "Local service",
    description: "In-house service center with genuine spare parts",
  },
] as const;

export function TrustBand() {
  return (
    <section className="border-b py-12 sm:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border">
          {usps.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex gap-4 lg:px-6 lg:last:pr-0 lg:first:pl-0"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/60">
                <Icon className="size-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-sm">{title}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
