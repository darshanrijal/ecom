import { Navbar } from "@/features/homepage/components/navbar";
import { ProductList } from "@/features/products/components/product-list";

export default function Home() {
  return (
    <main>
      <Navbar />
      <ProductList />
    </main>
  );
}
