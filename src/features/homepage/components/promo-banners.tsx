import { Button } from "@/components/ui/button";
import { BadgePercentIcon, CreditCardIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function PromoBanners() {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
      {/* EMI */}
      <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
        <div className="relative z-10 flex h-full flex-col items-start gap-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
            <CreditCardIcon className="size-5" />
          </div>

          <div>
            <h3 className="font-semibold text-xl tracking-tight sm:text-2xl">
              0% EMI, zero drama
            </h3>
            <p className="mt-2 max-w-sm text-primary-foreground/70 text-sm leading-6">
              Split any purchase into easy monthly installments with major banks
              — no hidden charges, no interest.
            </p>
          </div>

          <Button
            variant="secondary"
            size="lg"
            className="mt-auto"
            nativeButton={false}
            render={<Link href="/products">Shop on EMI</Link>}
          />
        </div>

        <div
          aria-hidden="true"
          className="absolute -top-16 -right-16 size-56 rounded-full bg-white/10 blur-2xl"
        />
      </div>

      {/* Offers */}
      <div className="relative overflow-hidden rounded-3xl border bg-linear-to-br from-muted/70 to-background p-6 sm:p-8">
        <div className="relative z-10 flex h-full flex-col items-start gap-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <BadgePercentIcon className="size-5" />
          </div>

          <div>
            <h3 className="font-semibold text-xl tracking-tight sm:text-2xl">
              Up to 30% off on TVs &amp; ACs
            </h3>
            <p className="mt-2 max-w-sm text-muted-foreground text-sm leading-6">
              Season offers on televisions and air conditioners — limited stock
              at the best prices of the season.
            </p>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="mt-auto bg-background"
            nativeButton={false}
            render={
              <Link href="/category/televisions">Browse televisions</Link>
            }
          />
        </div>

        <Image
          src="/nattukaka.png"
          alt=""
          aria-hidden="true"
          width={220}
          height={220}
          className="absolute -right-6 -bottom-6 hidden h-[80%] w-auto object-contain object-bottom opacity-90 sm:block md:hidden lg:block"
        />
      </div>
    </section>
  );
}
