"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Heart, X, Search, SlidersHorizontal } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/context/CartContext";

interface ProductCardProps {
  product: {
    id: string;
    handle: string;
    title: string;
    price: string;
    compareAtPrice?: string;
    imageUrl: string;
    category?: string;
    isOutOfStock?: boolean;
    variantId?: string;
    variants?: any[];
  };
}

import MagneticLink from "../ui/MagneticLink";

export default function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addItem, toggleDrawer } = useCart();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isWishlisted = isInWishlist(product.id);
  const price = Number(product.price || 0);
  const rawCompare = product.compareAtPrice || (product as any).mrp;
  const compareAtPrice = rawCompare ? Number(rawCompare) : null;
  const savings = compareAtPrice && compareAtPrice > price ? compareAtPrice - price : 0;
  
  const hasVariants = product.variants && product.variants.length > 0;
  const variants: any[] = product.variants || [];

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

  const selectedVariant = variants.find(v => {
    const match1 = !optionGroups.find(g => g.name === v.option1Name) || selectedOptions[v.option1Name || ''] === v.option1Value;
    const match2 = !optionGroups.find(g => g.name === v.option2Name) || selectedOptions[v.option2Name || ''] === v.option2Value;
    const match3 = !optionGroups.find(g => g.name === v.option3Name) || selectedOptions[v.option3Name || ''] === v.option3Value;
    return match1 && match2 && match3;
  }) || variants[0];

  const quickViewInStock = selectedVariant ? (selectedVariant.inventory > 0) : false;

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

  const handleQuickBagClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.isOutOfStock) return;
    if (hasVariants) {
      openQuickView(e);
    } else {
      addItem({
        id: product.id,
        variantId: product.variants?.[0]?.id || product.variantId || product.id,
        title: product.title,
        price: Number(product.price),
        quantity: 1,
        image: product.imageUrl,
        taxInclusive: (product as any).taxInclusive,
        handle: product.handle,
      });
      toggleDrawer(true);
    }
  };

  const handleQuickViewAdd = () => {
    if (!selectedVariant || selectedVariant.inventory <= 0) return;
    addItem({
      id: product.id,
      variantId: selectedVariant.id,
      title: product.title,
      price: Number(selectedVariant.price),
      quantity: 1,
      image: product.imageUrl,
      taxInclusive: (product as any).taxInclusive,
      handle: product.handle,
    });
    setIsQuickViewOpen(false);
    toggleDrawer(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col"
    >
      <Link 
        href={`/products/${product.handle}`}
        className="relative aspect-[3/4] w-full overflow-hidden bg-theme-surface cursor-pointer group/image block"
      >
        <div 
          className="absolute inset-0 bg-theme-text/10 mix-blend-multiply z-10 opacity-0 group-hover/image:opacity-100 transition-opacity duration-700" 
        />
        
        <img
          src={product.imageUrl}
          alt={product.title}
          className="h-full w-full object-cover object-center transition-transform duration-[1.2s] ease-[0.16,1,0.3,1] group-hover/image:scale-105"
        />
        
        {/* Badges */}
        {savings > 0 && !product.isOutOfStock && (
          <div className="absolute top-4 left-4 z-20">
             <span className="bg-wine text-ivory text-[8px] font-bold px-3 py-1.5 uppercase tracking-[0.2em] shadow-2xl">
                -{Math.round((savings/compareAtPrice!)*100)}% Off
             </span>
          </div>
        )}
        {product.isOutOfStock && (
          <div className="absolute top-4 left-4 z-20">
             <span className="bg-zinc-800 text-white text-[8px] font-bold px-3 py-1.5 uppercase tracking-[0.3em] shadow-2xl">
                Sold Out
             </span>
          </div>
        )}

        {/* Action Buttons Overlay (Right Side) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 translate-x-12 group-hover/image:translate-x-0 transition-transform duration-500">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl backdrop-blur-md border border-white/20 ${
              mounted && isWishlisted 
                ? "bg-wine text-white" 
                : "bg-black/60 text-white hover:bg-wine"
            }`}
          >
            <Heart size={16} fill={mounted && isWishlisted ? "currentColor" : "none"} strokeWidth={2} />
          </button>
          <button 
            onClick={openQuickView}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 bg-black/60 text-white hover:bg-wine shadow-xl backdrop-blur-md border border-white/20"
          >
            <Search size={16} />
          </button>
        </div>

        {/* High-Luxury Quick Bag Overlay (Bottom) */}
        <div className="absolute inset-x-4 bottom-4 z-20 translate-y-4 group-hover/image:translate-y-0 opacity-0 group-hover/image:opacity-100 transition-all duration-700 ease-[0.16,1,0.3,1]">
           <button 
              onClick={handleQuickBagClick}
              disabled={product.isOutOfStock}
              className={`w-full py-4 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all rounded-xl flex items-center justify-center gap-2 border border-white/20 ${
                product.isOutOfStock 
                  ? 'bg-gray-900/70 text-gray-400 cursor-not-allowed' 
                  : 'bg-black/70 text-white hover:bg-wine active:scale-95'
              }`}
           >
               {product.isOutOfStock ? (
                 <><ShoppingBag size={14} strokeWidth={2.5} /> Out of Stock</>
               ) : hasVariants ? (
                 <><SlidersHorizontal size={14} strokeWidth={2.5} /> <ShoppingBag size={14} strokeWidth={2.5} /></>
               ) : (
                 <><ShoppingBag size={14} strokeWidth={2.5} /> Quick Bag</>
               )}
           </button>
        </div>
      </Link>

      <div className="mt-6 flex flex-col items-center text-center space-y-2">
        <span className="text-[8px] uppercase tracking-[0.4em] text-theme-text-muted font-bold">
           {product.category || "Main Collection"}
        </span>
        <h3 className="text-xs font-medium text-theme-text tracking-widest uppercase line-clamp-1 px-4">
          <Link href={`/products/${product.handle}`} className="hover:text-wine transition-colors underline-offset-4 hover:underline">
            {product.title}
          </Link>
        </h3>
        <div className="flex items-center gap-3 font-serif">
          <span className="text-sm text-theme-text font-bold italic">₹{price.toLocaleString()}</span>
          {compareAtPrice && compareAtPrice > price && (
            <span className="text-xs text-theme-text-muted line-through">₹{compareAtPrice.toLocaleString()}</span>
          )}
        </div>
        <span className="text-[8px] text-theme-text-muted uppercase tracking-[0.2em] font-medium">
          {product.taxInclusive !== false ? "Incl. of GST" : "+ 12% GST"}
        </span>
      </div>

      <AnimatePresence>
        {isQuickViewOpen && mounted && createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 bg-charcoal/80 backdrop-blur-md"
            style={{ height: '100dvh' }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsQuickViewOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-theme-surface w-full max-w-4xl max-h-[90dvh] md:max-h-[85vh] rounded-3xl overflow-hidden flex flex-col md:flex-row relative shadow-2xl"
            >
              <button
                onClick={() => setIsQuickViewOpen(false)}
                className="absolute top-4 right-4 z-20 w-9 h-9 bg-theme-bg/50 hover:bg-theme-bg/80 rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
              >
                <X size={18} className="text-theme-text" />
              </button>

              {/* Product Image */}
              <div className="w-full md:w-[45%] h-56 shrink-0 md:h-auto md:shrink relative bg-theme-bg">
                <img src={product.imageUrl} alt={product.title} className="w-full h-full object-contain p-4 md:p-6" />
              </div>

              {/* Right Panel */}
              <div className="flex-1 p-5 md:p-10 flex flex-col justify-start overflow-y-auto custom-scrollbar">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-serif text-theme-text leading-tight mb-1">{product.title}</h3>
                    <div className="flex items-baseline gap-3 mt-2">
                      <span className="text-2xl font-bold text-wine">
                        ₹{selectedVariant ? Number(selectedVariant.price).toLocaleString() : price.toLocaleString()}
                      </span>
                      {selectedVariant?.compareAtPrice > selectedVariant?.price && (
                        <span className="text-sm text-theme-text-muted line-through">
                          ₹{Number(selectedVariant.compareAtPrice).toLocaleString()}
                        </span>
                      )}
                    </div>
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

                  {optionGroups.length > 0 && (
                    <div className="space-y-5">
                      {optionGroups.map(group => (
                        <div key={group.name}>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-theme-text-muted mb-3">
                            {group.name}
                            {selectedOptions[group.name] && (
                              <span className="ml-2 text-theme-text normal-case tracking-normal font-semibold">
                                — {selectedOptions[group.name]}
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {group.values.map(val => {
                              const isAvail = variants.some(v => {
                                const thisGroupKey = group.name === v.option1Name ? 'option1Value' :
                                                     group.name === v.option2Name ? 'option2Value' : 'option3Value';
                                if (v[thisGroupKey] !== val) return false;
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
                                        ? 'border-theme-border text-theme-text hover:border-wine/60 hover:bg-wine/5'
                                        : 'border-theme-border text-theme-text-muted opacity-40 cursor-not-allowed line-through'
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

                <div className="mt-8 flex flex-col gap-3">
                  <button
                    onClick={handleQuickViewAdd}
                    disabled={!quickViewInStock}
                    className={`w-full py-4 text-xs font-bold uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-2 transition-all ${
                      !quickViewInStock
                        ? 'bg-theme-bg border border-theme-border text-theme-text-muted cursor-not-allowed'
                        : 'bg-wine text-white hover:bg-black active:scale-[0.98] shadow-lg hover:shadow-xl'
                    }`}
                  >
                    <ShoppingBag size={16} />
                    {!quickViewInStock ? 'Out of Stock' : 'Add to Bag'}
                  </button>
                  <Link
                    href={`/products/${product.handle}`}
                    className="w-full py-3.5 text-xs font-bold uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center border-2 border-theme-border hover:border-wine text-theme-text transition-colors"
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
    </motion.div>
  );
}
