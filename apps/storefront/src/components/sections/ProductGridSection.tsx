"use client";

import { safeFetch } from "@/lib/safe-fetch";

import { motion } from "framer-motion";
import { Heart, ShoppingBag, Zap, Search, X, SlidersHorizontal, AlertCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/context/CartContext";
import { getAssetUrl } from "@/lib/utils/assets";
import { useWishlist } from "@/hooks/useWishlist";

export function ProductGridSection({ content, style }: { content: Record<string, any>, style?: any }) {
  content = content || {};
  style = style || {};
  const [products, setProducts] = useState<any[]>(content.products || []);
  
  // If SSR failed, we should try loading on client. If SSR was successful but empty, it's just empty.
  const initialLoading = content.ssrFetchStatus === 'ERROR' || !content.products;
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(false);
  const textAlign = style?.textAlign || "left";

  useEffect(() => {
    // If SSR was explicitly successful (even if empty), don't refetch
    if (content.ssrFetchStatus === 'SUCCESS' || content.ssrFetchStatus === 'EMPTY') {
      setProducts(content.products || []);
      setLoading(false);
      return;
    }

    // Only fetch if products are missing or SSR explicitly failed
    async function fetchProducts() {
      setLoading(true);
      setError(false);
      try {
        const handle = content.collectionHandle === 'all' ? '' : content.collectionHandle;
        const { data, error: fetchError } = await safeFetch(`/products${handle ? `?collection=${handle}` : ''}`, {
          retries: 2,
          timeoutMs: 8000
        });
        
        if (fetchError || !data) {
          throw new Error(fetchError || "Failed to fetch");
        }

        let productsList = Array.isArray(data) ? data : (data.data || data.products || []);
        
        if (productsList.length > 0) {
          const limit = content.limit || 16;
          const mapped = productsList.slice(0, limit).map((p: any) => {
            const mainVariant = p.variants?.[0];
            return {
              id: p.id,
              variantId: mainVariant?.id,
              handle: p.handle,
              name: p.title,
              numericPrice: Number(mainVariant?.price || 0),
              price: mainVariant?.price ? `₹${Number(mainVariant.price).toLocaleString()}` : "N/A",
              originalPrice: mainVariant?.compareAtPrice ? `₹${Number(mainVariant.compareAtPrice).toLocaleString()}` : null,
              inventory: p.variants?.reduce((sum: number, v: any) => sum + (v.availableStock ?? v.inventory ?? v.inventoryQuantity ?? 0), 0) || 0,
              taxInclusive: p.taxInclusive,
              taxRate: p.taxRate,
              image1: p.images?.[0]?.url || "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800",
              image2: p.images?.[1]?.url || p.images?.[0]?.url || "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800",
              label: p.type || "New Arrival",
              badge: p.tags?.toLowerCase().includes('bestseller') ? 'Bestseller' : ((p.variants?.reduce((sum: number, v: any) => sum + (v.availableStock ?? v.inventory ?? v.inventoryQuantity ?? 0), 0) || 0) <= 0 ? 'Sold Out' : null),
              variants: (p.variants || []).map((v: any) => ({
                id: v.id,
                option1Name: v.option1Name,
                option1Value: v.option1Value,
                option2Name: v.option2Name,
                option2Value: v.option2Value,
                option3Name: v.option3Name,
                option3Value: v.option3Value,
                price: Number(v.price || 0),
                mrp: Number(v.mrp || v.compareAtPrice || 0),
                inventory: v.availableStock ?? v.inventory ?? v.inventoryQuantity ?? 0,
              }))
            };
          });
          setProducts(mapped);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Client fallback fetch failed for grid:", err);
        setError(true);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [content.collectionHandle, content.products, content.ssrFetchStatus, content.limit]);

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Editorial Header */}
      <div className={`mb-16 flex flex-col gap-4 ${textAlign === 'center' ? 'items-center text-center' : textAlign === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
        <div className="inline-flex items-center gap-3">
          <div className="h-px w-6 bg-primary/40" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">{content.subtitle || "Must-Have Picks"}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between w-full gap-6">
           <h2 className="text-4xl md:text-6xl font-serif leading-[0.9] text-theme-text">
             {content.title || "The Seasonal Edit"}
           </h2>
           <Link 
              href={`/collections/${content.collectionHandle || "all"}`} 
              className="text-[10px] font-bold uppercase tracking-[0.2em] border-b border-theme-border pb-1 hover:border-primary transition-colors text-theme-text"
           >
              Shop Now
           </Link>
        </div>
      </div>

      {/* Luxury Product Grid */}
      <div className={error || (!loading && products?.length === 0) ? "w-full" : "grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-x-10 md:gap-y-16"}>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-x-10 md:gap-y-16 w-full">
            {[1,2,3,4].map(i => (
              <div key={i} className="aspect-[3/4] bg-gray-100/50 animate-pulse rounded-2xl w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-6 bg-theme-surface/30 rounded-3xl border border-theme-border/50 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <AlertCircle size={28} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-serif text-theme-text">Curating Collection</h3>
              <p className="text-theme-text/60 max-w-sm text-sm font-light">
                We're currently updating our catalog to bring you the latest pieces. Please check back shortly.
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-8 py-3 text-[10px] uppercase tracking-[0.2em] font-bold border border-theme-border rounded-full hover:border-primary hover:text-primary transition-all duration-300"
            >
              Refresh
            </button>
          </div>
        ) : products?.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
            <h3 className="text-2xl font-serif text-theme-text">Collection Empty</h3>
            <p className="text-theme-text/60 max-w-sm text-sm font-light">
              No pieces found in this collection right now. Explore our other selections.
            </p>
          </div>
        ) : (
          products?.map((product: any, idx: number) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 1, y: 0 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { addItem, toggleDrawer } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  // ─── Variant logic ───────────────────────────────────────────
  const variants: any[] = product.variants || [];

  // Derive unique option groups from variants
  const optionGroups = (() => {
    const groups: { name: string; values: string[] }[] = [];
    const addGroup = (name: string | null, value: string | null) => {
      if (!name || !value) return;
      const existing = groups.find(g => g.name === name);
      if (existing) { if (!existing.values.includes(value)) existing.values.push(value); }
      else groups.push({ name, values: [value] });
    };
    variants.forEach(v => {
      addGroup(v.option1Name, v.option1Value);
      addGroup(v.option2Name, v.option2Value);
      addGroup(v.option3Name, v.option3Value);
    });
    return groups.filter(g => g.name && g.values.length > 0 && g.values[0] !== 'Default' && g.values[0] !== 'Default Title');
  })();

  // Find the currently selected variant based on chosen options
  const selectedVariant = variants.find(v => {
    const match1 = !optionGroups.find(g => g.name === v.option1Name) || selectedOptions[v.option1Name || ''] === v.option1Value;
    const match2 = !optionGroups.find(g => g.name === v.option2Name) || selectedOptions[v.option2Name || ''] === v.option2Value;
    const match3 = !optionGroups.find(g => g.name === v.option3Name) || selectedOptions[v.option3Name || ''] === v.option3Value;
    return match1 && match2 && match3;
  }) || variants[0];

  const isOutOfStock = product.inventory <= 0;
  const quickViewInStock = selectedVariant ? (selectedVariant.inventory > 0) : false;

  // When quick view opens, pre-select first option values
  const openQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (variants.length > 0) {
      const defaults: Record<string, string> = {};
      optionGroups.forEach(g => { defaults[g.name] = g.values[0]; });
      setSelectedOptions(defaults);
    }
    setIsQuickViewOpen(true);
  };

  // Direct Quick Bag (no variants or single variant) — adds immediately
  const handleDirectAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    if (optionGroups.length > 0) { openQuickView(e); return; } // has options → open picker
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

  // Add from Quick View with the selected variant
  const handleQuickViewAdd = () => {
    if (!selectedVariant || selectedVariant.inventory <= 0) return;
    addItem({
      id: product.id,
      variantId: selectedVariant.id,
      title: product.name,
      price: selectedVariant.price,
      quantity: 1,
      maxStock: selectedVariant.inventory,
      image: getAssetUrl(product.image1),
      taxInclusive: product.taxInclusive,
      handle: product.handle,
    });
    setIsQuickViewOpen(false);
    toggleDrawer(true);
  };

  return (
    <div 
      className="group flex flex-col gap-5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link 
        href={`/products/${product.handle || product.id}`} 
        className="relative aspect-[3/4] overflow-hidden bg-primary/5 rounded-2xl block"
      >
        {/* Floating Labels */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          {product.label && (
            <span className="text-[8px] uppercase tracking-[0.2em] px-3 py-1.5 bg-black/75 backdrop-blur-md text-white font-bold shadow-md rounded-full">
              {product.label}
            </span>
          )}
          {product.badge && product.badge !== 'Sold Out' && (
            <span className="text-[8px] uppercase tracking-[0.2em] px-3 py-1.5 bg-wine text-white font-bold shadow-md rounded-full">
              {product.badge}
            </span>
          )}
          {product.badge === 'Sold Out' && (
            <span className="text-[8px] uppercase tracking-[0.2em] px-3 py-1.5 bg-gray-800/80 backdrop-blur-md text-gray-200 font-bold shadow-md rounded-full">
              Sold Out
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 translate-x-10 group-hover:translate-x-0 transition-transform duration-500">
          <button 
            onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl backdrop-blur-md border border-white/20 ${mounted && isWishlisted ? 'bg-wine text-white' : 'bg-black/60 text-white hover:bg-wine'}`}
          >
            <Heart size={16} fill={mounted && isWishlisted ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={openQuickView}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 bg-black/60 text-white hover:bg-wine shadow-xl backdrop-blur-md border border-white/20"
          >
            <Search size={16} />
          </button>
        </div>

        {/* Smooth Image Crossfade */}
        <div className="absolute inset-0 w-full h-full">
           <img 
            src={getAssetUrl(product.image1)} 
            alt={product.name} 
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${isHovered ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}`}
          />
          <img 
            src={getAssetUrl(product.image2)} 
            alt={product.name} 
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${isHovered ? 'scale-100 opacity-100' : 'scale-110 opacity-0'}`}
          />
        </div>

        {/* High-Luxury Quick Bag Overlay */}
        <div className={`absolute inset-x-4 bottom-4 z-20 translate-y-2 group-hover:translate-y-0 transition-all duration-700 ease-[0.16,1,0.3,1] ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
           <button 
              onClick={optionGroups.length > 0 ? openQuickView : handleDirectAdd}
              disabled={isOutOfStock}
              className={`w-full py-4 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all rounded-xl flex items-center justify-center gap-2 border border-white/20 ${
                isOutOfStock 
                  ? 'bg-gray-900/70 text-gray-400 cursor-not-allowed' 
                  : 'bg-black/70 text-white hover:bg-wine active:scale-95'
              }`}
           >
               {isOutOfStock ? (
                 <><ShoppingBag size={14} strokeWidth={2.5} /> Out of Stock</>
               ) : optionGroups.length > 0 ? (
                 <><SlidersHorizontal size={14} strokeWidth={2.5} /> <ShoppingBag size={14} strokeWidth={2.5} /></>
               ) : (
                 <><ShoppingBag size={14} strokeWidth={2.5} /> Quick Bag</>
               )}
           </button>
        </div>
      </Link>

      {/* Product Details */}
      <Link 
        href={`/products/${product.handle || product.id}`}
        className="space-y-1 text-center block group/details"
      >
        <h3 className="text-lg md:text-xl font-serif text-theme-text tracking-tight group-hover/details:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center justify-center gap-3">
          {product.originalPrice && (
            <span className="text-sm font-sans tracking-widest opacity-40 line-through text-theme-text">{product.originalPrice}</span>
          )}
          <span className="text-sm font-sans tracking-[0.2em] font-bold text-primary">{product.price}</span>
        </div>
      </Link>

      <AnimatePresence>
        {isQuickViewOpen && mounted && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md"
            onClick={() => setIsQuickViewOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-[var(--surface)] w-full max-w-4xl max-h-[95vh] rounded-3xl overflow-hidden flex flex-col md:flex-row relative shadow-2xl"
            >
              {/* Close */}
              <button
                onClick={() => setIsQuickViewOpen(false)}
                className="absolute top-4 right-4 z-20 w-9 h-9 bg-black/15 hover:bg-black/30 rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
              >
                <X size={18} className="text-[var(--text-primary)]" />
              </button>

              {/* Product Image */}
              <div className="w-full md:w-[45%] h-64 md:h-auto relative bg-[var(--bg)] flex-shrink-0">
                <img src={getAssetUrl(product.image1)} alt={product.name} className="w-full h-full object-contain p-6" />
                {product.label && (
                  <span className="absolute top-4 left-4 text-[8px] uppercase tracking-widest px-3 py-1.5 bg-black/70 text-white font-bold rounded-full">
                    {product.label}
                  </span>
                )}
              </div>

              {/* Right Panel */}
              <div className="flex-1 p-6 md:p-10 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-5">
                  {/* Title + Price */}
                  <div>
                    <h3 className="text-2xl md:text-3xl font-serif text-[var(--text-primary)] leading-tight mb-1">{product.name}</h3>
                    <div className="flex items-baseline gap-3 mt-2">
                      <span className="text-2xl font-bold text-wine">
                        ₹{selectedVariant ? selectedVariant.price.toLocaleString() : product.numericPrice.toLocaleString()}
                      </span>
                      {selectedVariant?.mrp > 0 && selectedVariant.mrp > selectedVariant.price && (
                        <span className="text-sm text-[var(--text-secondary)] line-through">
                          ₹{selectedVariant.mrp.toLocaleString()}
                        </span>
                      )}
                      {selectedVariant?.mrp > selectedVariant?.price && (
                        <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded-full">
                          {Math.round((1 - selectedVariant.price / selectedVariant.mrp) * 100)}% off
                        </span>
                      )}
                    </div>
                    {/* Stock indicator */}
                    {selectedVariant && (
                      <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${
                        selectedVariant.inventory <= 0 ? 'text-red-500' :
                        selectedVariant.inventory <= 5 ? 'text-orange-500' : 'text-green-600'
                      }`}>
                        {selectedVariant.inventory <= 0 ? '✕ Out of Stock' :
                         selectedVariant.inventory <= 5 ? `⚡ Only ${selectedVariant.inventory} left` : '✓ In Stock'}
                      </p>
                    )}
                  </div>

                  {/* Variant Option Groups */}
                  {optionGroups.length > 0 && (
                    <div className="space-y-5">
                      {optionGroups.map(group => (
                        <div key={group.name}>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3">
                            {group.name}
                            {selectedOptions[group.name] && (
                              <span className="ml-2 text-[var(--text-primary)] normal-case tracking-normal font-semibold">
                                — {selectedOptions[group.name]}
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {group.values.map(val => {
                              // Check if this option value is available given other selections
                              const isAvail = variants.some(v => {
                                const thisGroupKey = group.name === v.option1Name ? 'option1Value' :
                                                     group.name === v.option2Name ? 'option2Value' : 'option3Value';
                                if (v[thisGroupKey] !== val) return false;
                                // Check other group selections match
                                return optionGroups.every(og => {
                                  if (og.name === group.name) return true;
                                  const sel = selectedOptions[og.name];
                                  if (!sel) return true;
                                  const vKey = og.name === v.option1Name ? 'option1Value' :
                                               og.name === v.option2Name ? 'option2Value' : 'option3Value';
                                  return v[vKey] === sel;
                                }) && (v.inventory > 0);
                              });
                              const isSelected = selectedOptions[group.name] === val;
                              return (
                                <button
                                  key={val}
                                  onClick={() => setSelectedOptions(prev => ({ ...prev, [group.name]: val }))}
                                  className={`relative px-4 py-2 text-xs font-bold rounded-xl border-2 transition-all duration-200 ${
                                    isSelected
                                      ? 'border-wine bg-wine text-white shadow-lg scale-105'
                                      : isAvail
                                        ? 'border-[var(--border)] text-[var(--text-primary)] hover:border-wine/60 hover:bg-wine/5'
                                        : 'border-[var(--border)] text-[var(--text-secondary)] opacity-40 cursor-not-allowed line-through'
                                  }`}
                                  disabled={!isAvail && !isSelected}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA Buttons */}
                <div className="mt-8 flex flex-col gap-3">
                  <button
                    onClick={handleQuickViewAdd}
                    disabled={!quickViewInStock}
                    className={`w-full py-4 text-xs font-bold uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-2 transition-all ${
                      !quickViewInStock
                        ? 'bg-[var(--border)] text-[var(--text-secondary)] cursor-not-allowed'
                        : 'bg-wine text-white hover:bg-charcoal active:scale-[0.98] shadow-lg hover:shadow-xl'
                    }`}
                  >
                    <ShoppingBag size={16} />
                    {!quickViewInStock ? 'Out of Stock' : 'Add to Bag'}
                  </button>
                  <Link
                    href={`/products/${product.handle || product.id}`}
                    className="w-full py-3.5 text-xs font-bold uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center border-2 border-[var(--border)] hover:border-wine text-[var(--text-primary)] transition-colors"
                  >
                    View Full Details
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
