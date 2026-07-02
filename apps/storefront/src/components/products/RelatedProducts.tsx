"use client";

import { API_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { Loader2 } from "lucide-react";

export default function RelatedProducts({ productId }: { productId: string }) {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRelated() {
      try {
        const res = await fetch(`${API_URL}/api/v1/products/related/${productId}`);
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Failed to fetch related products:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRelated();
  }, [productId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-wine" size={24} />
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="mt-24">
      <div className="flex justify-between items-end mb-12">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-wine">You may also like</span>
          <h2 className="text-3xl md:text-5xl font-serif text-theme-text mt-4">Related Collections</h2>
        </div>
        <div className="hidden md:block">
           <p className="text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">Scroll to explore</p>
        </div>
      </div>
      
      <div className="flex gap-6 overflow-x-auto pb-12 snap-x no-scrollbar">
        {products.map((product) => (
          <div key={product.id} className="min-w-[280px] md:min-w-[350px] snap-start">
            <ProductCard product={{
              id: product.id,
              handle: product.handle,
              title: product.title,
              price: product.variants?.[0]?.price || "0",
              compareAtPrice: product.variants?.[0]?.compareAtPrice,
              imageUrl: product.images?.[0]?.url || "",
              category: product.type
            }} />
          </div>
        ))}
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
