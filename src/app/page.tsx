import { Navbar } from "@/features/homepage/components/navbar";
import { ProductList } from "@/features/products/components/product-list";
import Image from "next/image";

export default function Home() {
  return (
    <main>
      <Navbar />
      <div className="relative hidden flex-col items-center justify-center bg-primary/10 p-6 xl:flex">
        <Image
          src={"/jethalal.png"}
          alt="jethalal"
          width={200}
          height={200}
          className="absolute right-0 bottom-0"
        />
        <Image
          src={"/nattukaka-bagha.png"}
          alt="nattukaka"
          width={190}
          height={190}
          className="mask-r-from-90% mask-b-from-80% absolute bottom-0 left-0"
        />

        <p className="uppercase">Our complete Range</p>
        <p className="font-semibold text-3xl">All Products</p>
        <p className="mt-6 text-muted-foreground">
          Mobile phones, Electronic items, Washing machine, Rice cooker, Oven,
          and many more with best after-sales service.
        </p>
        <p className="text-muted-foreground">
          Offial dealer for Red Cerry 8400, RAMSUNG, MyPhone, SingSong, TonyTV
        </p>
      </div>
      <ProductList />
    </main>
  );
}
