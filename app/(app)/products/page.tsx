import { prisma } from "@/lib/db/prisma";
import { ProductManager } from "@/components/products/product-manager";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { productionRecords: true } } },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[#1e3a5f]">Products</h1>
      <ProductManager products={products} />
    </div>
  );
}
