"use client";

import { useWishlist } from "@/hooks/useWishlist";
import ProductCard from "@/components/products/ProductCard";
import { Heart, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";

export default function WishlistPage() {
  const { wishlist, isInitializing } = useWishlist();
  const [wishlistedProducts, setWishlistedProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      if (wishlist.length === 0) {
        setWishlistedProducts([]);
        setIsLoadingProducts(false);
        return;
      }
      setIsLoadingProducts(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/products?ids=${wishlist.join(',')}`);
        if (res.ok) {
          const data = await res.json();
          // Filter to only what's in the wishlist, in case of removed products
          setWishlistedProducts(data.filter((p: any) => wishlist.includes(p.id)));
        }
      } catch (err) {
        console.error("Failed to fetch wishlist products", err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    
    if (!isInitializing) {
      fetchProducts();
    }
  }, [wishlist, isInitializing]);

  return (
    <div className="bg-ivory min-h-screen pb-24">
      {/* Header */}
      <div className="pt-[180px] md:pt-[120px] pb-12 px-6 md:px-12 text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex p-3 bg-wine/10 text-wine rounded-full mb-2">
            <Heart size={24} fill="currentColor" />
        </div>
        <h1 className="text-4xl md:text-6xl font-serif text-charcoal">Forgotten Favorites</h1>
        <p className="text-charcoal/60 font-sans tracking-wide leading-relaxed">
          Your curated selection of luxury pieces. Save them for your next major occasion or add them to your collection today.
        </p>
      </div>

      <div className="px-6 md:px-12 mt-12">
        {isInitializing || isLoadingProducts ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-wine border-t-transparent rounded-full animate-spin" />
          </div>
        ) : wishlist.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
            {/* In a real scenario, we'd fetch the product details for these IDs */}
            {wishlistedProducts.map((product) => (
              <ProductCard key={product.id} product={{
                id: product.id,
                handle: product.handle,
                title: product.title,
                price: product.variants?.[0]?.price || '0',
                compareAtPrice: product.variants?.[0]?.mrp,
                imageUrl: product.images?.[0]?.url || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b',
                category: product.category || product.type,
                variants: product.variants
              }} />
            ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto text-center py-24 space-y-6">
            <div className="text-charcoal/20 flex justify-center">
              <ShoppingBag size={64} strokeWidth={1} />
            </div>
            <div className="space-y-2">
               <h3 className="text-xl font-serif text-charcoal">Your wishlist is empty</h3>
               <p className="text-sm text-charcoal/50">Explore our new arrivals and find something you love.</p>
            </div>
            <a 
              href="/collections/all" 
              className="inline-block bg-wine text-ivory px-12 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-wine-dark transition-all"
            >
              Shop Collections
            </a>
          </div>
        )}
      </div>

      {/* Featured Suggestions (Waitlist items) */}
      {wishlist.length > 0 && (
         <div className="mt-32 max-w-7xl mx-auto px-6 md:px-12">
            <div className="border-t border-charcoal/5 pt-12">
               <h2 className="text-2xl font-serif mb-8">You Might Also Love</h2>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Stubs for cross-selling */}
                  <div className="aspect-[3/4] bg-beige/40 rounded-lg animate-pulse" />
                  <div className="aspect-[3/4] bg-beige/40 rounded-lg animate-pulse" />
                  <div className="aspect-[3/4] bg-beige/40 rounded-lg animate-pulse" />
                  <div className="aspect-[3/4] bg-beige/40 rounded-lg animate-pulse" />
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
