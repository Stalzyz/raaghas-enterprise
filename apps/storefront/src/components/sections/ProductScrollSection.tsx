"use client";

import { API_URL } from "@/lib/api";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { getAssetUrl } from "@/lib/utils/assets";
import { useWishlist } from "@/hooks/useWishlist";

export function ProductScrollSection({ content, style }: { content: Record<string, any>; style?: any }) {
  content = content || {};
  style = style || {};

  const [products, setProducts] = useState<any[]>(content.products || []);
  const [loading, setLoading] = useState(!content.products);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    if (content.products && content.products.length > 0) {
      setProducts(content.products);
      setLoading(false);
      return;
    }

    async function fetchProducts() {
      setLoading(true);
      try {
        const handle = content.collectionHandle === "all" ? "" : content.collectionHandle;
        const apiUrl = API_URL;
        const url = `${apiUrl}/api/v1/products${handle ? `?collection=${handle}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();
        const list: any[] = Array.isArray(data) ? data : (data.data || data.products || []);
        if (list.length > 0) {
          const limit = content.limit || 12;
          const mapped = list.slice(0, limit).map((p: any) => {
            const v = p.variants?.[0];
            return {
              id: p.id,
              variantId: v?.id,
              handle: p.handle,
              name: p.title,
              numericPrice: Number(v?.price || 0),
              price: v?.price ? `₹${Number(v.price).toLocaleString()}` : "N/A",
              originalPrice: v?.compareAtPrice ? `₹${Number(v.compareAtPrice).toLocaleString()}` : null,
              inventory: p.variants?.reduce((s: number, vv: any) => s + (vv.availableStock ?? vv.inventory ?? vv.inventoryQuantity ?? 0), 0) || 0,
              taxInclusive: p.taxInclusive,
              image1: p.images?.[0]?.url || "",
              image2: p.images?.[1]?.url || p.images?.[0]?.url || "",
              label: p.type || "New Arrival",
              badge: p.tags?.toLowerCase().includes("bestseller") ? "Bestseller" : ((p.variants?.reduce((s: number, vv: any) => s + (vv.availableStock ?? vv.inventory ?? vv.inventoryQuantity ?? 0), 0) || 0) <= 0 ? "Sold Out" : null),
              variants: (p.variants || []).map((vv: any) => ({
                id: vv.id,
                option1Name: vv.option1Name,
                option1Value: vv.option1Value,
                option2Name: vv.option2Name,
                option2Value: vv.option2Value,
                price: Number(vv.price || 0),
                mrp: Number(vv.mrp || vv.compareAtPrice || 0),
                inventory: vv.availableStock ?? vv.inventory ?? vv.inventoryQuantity ?? 0,
              })),
            };
          });
          setProducts(mapped);
        } else {
          setProducts([]);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [content.collectionHandle, content.products, content.limit]);

  const checkScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.children[0]?.clientWidth || 280;
    el.scrollBy({ left: dir === "right" ? cardWidth * 2 : -cardWidth * 2, behavior: "smooth" });
  };

  const textAlign = style?.textAlign || "left";

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 overflow-visible">
      {/* Header row */}
      <div className={`mb-10 flex items-end justify-between gap-4`}>
        <div className={`flex flex-col gap-3 ${textAlign === "center" ? "items-center" : "items-start"}`}>
          <div className="inline-flex items-center gap-3">
            <div className="h-px w-6 bg-primary/40" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">
              {content.subtitle || "Just Dropped"}
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-serif leading-[0.95] text-theme-text">
            {content.title || "New Arrivals"}
          </h2>
        </div>

        {/* Navigation arrows (desktop) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="w-11 h-11 rounded-full border border-theme-border flex items-center justify-center text-theme-text hover:border-primary hover:text-primary transition-all disabled:opacity-20"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="w-11 h-11 rounded-full border border-theme-border flex items-center justify-center text-theme-text hover:border-primary hover:text-primary transition-all disabled:opacity-20"
          >
            <ChevronRight size={18} />
          </button>
          <Link
            href={`/collections/${content.collectionHandle || "all"}`}
            className="ml-4 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-theme-border pb-1 hover:border-primary transition-colors text-theme-text"
          >
            View All
          </Link>
        </div>
      </div>

      {/* Horizontal scrolling track */}
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={checkScroll}
          className="flex gap-5 overflow-x-auto scroll-smooth"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-none w-[260px] md:w-[300px] aspect-[3/4] bg-primary/5 animate-pulse rounded-2xl"
                />
              ))
            : products.map((product) => (
                <ScrollProductCard key={product.id} product={product} />
              ))}
        </div>

        {/* Fade edge right */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[var(--bg,#fff)] to-transparent pointer-events-none" />
        )}
      </div>

      {/* Mobile CTA */}
      <div className="mt-8 flex md:hidden justify-center">
        <Link
          href={`/collections/${content.collectionHandle || "all"}`}
          className="px-8 py-3 border border-theme-border rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-theme-text hover:border-primary hover:text-primary transition-all"
        >
          View All
        </Link>
      </div>
    </div>
  );
}

function ScrollProductCard({ product }: { product: any }) {
  const [hovered, setHovered] = useState(false);
  const { addItem, toggleDrawer } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const wishlisted = isInWishlist(product.id);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isOutOfStock = product.inventory <= 0;
  const hasOptions =
    (product.variants || []).filter(
      (v: any) =>
        v.option1Value && v.option1Value !== "Default" && v.option1Value !== "Default Title"
    ).length > 1;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || hasOptions) return;
    addItem({
      id: product.id,
      variantId: product.variantId,
      title: product.name,
      price: product.numericPrice,
      quantity: 1,
      maxStock: product.inventory,
      image: getAssetUrl(product.image1),
      taxInclusive: product.taxInclusive,
      handle: product.handle,
    });
    toggleDrawer(true);
  };

  return (
    <div
      className="flex-none w-[240px] md:w-[280px] flex flex-col gap-4 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <Link
        href={`/products/${product.handle || product.id}`}
        className="relative aspect-[3/4] overflow-hidden bg-primary/5 rounded-2xl block"
      >
        {/* Badges */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
          {product.label && (
            <span className="text-[8px] uppercase tracking-[0.2em] px-2.5 py-1 bg-black/70 backdrop-blur-md text-white font-bold rounded-full">
              {product.label}
            </span>
          )}
          {product.badge && product.badge !== "Sold Out" && (
            <span className="text-[8px] uppercase tracking-[0.2em] px-2.5 py-1 bg-primary text-white font-bold rounded-full">
              {product.badge}
            </span>
          )}
          {product.badge === "Sold Out" && (
            <span className="text-[8px] uppercase tracking-[0.2em] px-2.5 py-1 bg-gray-800/80 text-gray-200 font-bold rounded-full">
              Sold Out
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
          className={`absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border border-white/20 ${mounted && wishlisted ? "bg-primary text-white" : "bg-black/50 text-white opacity-0 group-hover:opacity-100"}`}
        >
          <Heart size={14} fill={mounted && wishlisted ? "currentColor" : "none"} />
        </button>

        {/* Images */}
        <div className="relative w-full h-full">
          <img
            src={getAssetUrl(product.image1)}
            alt={product.name}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${hovered ? "opacity-0 scale-110" : "opacity-100 scale-100"}`}
          />
          <img
            src={getAssetUrl(product.image2)}
            alt={product.name}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${hovered ? "opacity-100 scale-100" : "opacity-0 scale-110"}`}
          />
        </div>

        {/* Quick bag overlay */}
        <div className={`absolute inset-x-3 bottom-3 z-20 transition-all duration-500 ${hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          <button
            onClick={hasOptions ? undefined : handleQuickAdd}
            disabled={isOutOfStock}
            className={`w-full py-3 backdrop-blur-md text-[9px] font-bold uppercase tracking-[0.25em] rounded-xl flex items-center justify-center gap-2 border border-white/20 transition-all ${
              isOutOfStock
                ? "bg-gray-900/70 text-gray-400 cursor-not-allowed"
                : "bg-black/70 text-white hover:bg-primary active:scale-95"
            }`}
          >
            {isOutOfStock ? (
              <><ShoppingBag size={13} /> Out of Stock</>
            ) : hasOptions ? (
              <><SlidersHorizontal size={13} /><ShoppingBag size={13} /></>
            ) : (
              <><ShoppingBag size={13} /> Quick Bag</>
            )}
          </button>
        </div>
      </Link>

      {/* Info */}
      <Link href={`/products/${product.handle || product.id}`} className="space-y-1 block">
        <h3 className="text-sm font-serif text-theme-text truncate group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          {product.originalPrice && (
            <span className="text-xs opacity-40 line-through text-theme-text">{product.originalPrice}</span>
          )}
          <span className="text-xs font-bold tracking-wide text-primary">{product.price}</span>
        </div>
      </Link>
    </div>
  );
}
