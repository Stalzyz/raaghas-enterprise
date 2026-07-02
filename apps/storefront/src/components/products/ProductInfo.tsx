"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Truck, ShieldCheck, RefreshCw, Loader2, Heart, Tag, Check, AlertCircle, ChevronDown, X, Share2, Copy, Sparkles, Star } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { API_URL } from "@/lib/api";
import { useWishlist } from "@/hooks/useWishlist";

interface Variant {
  id: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  option1Name?: string;
  option1Value?: string;
  option2Name?: string;
  option2Value?: string;
  option3Name?: string;
  option3Value?: string;
  inventory: number;
}

interface ProductInfoProps {
  product: {
    id: string;
    title: string;
    description: string;
    sizeGuide?: { name: string; htmlContent: string };
    type?: string;
    handle: string;
    variants: Variant[];
    images: { url: string }[];
    taxInclusive?: boolean;
  };
}

export default function ProductInfo({ product }: ProductInfoProps) {
  // Use state for selected option values instead of the whole variant

  const { wishlist, toggleWishlist, isInWishlist } = useWishlist();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({
    option1: product.variants?.[0]?.option1Value || "",
    option2: product.variants?.[0]?.option2Value || "",
    option3: product.variants?.[0]?.option3Value || "",
  });

  const [isAdding, setIsAdding] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ type: 'SUCCESS' | 'ERROR', text: string } | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false); // Default static for SSR
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [viewers, setViewers] = useState(12); // Default static for SSR
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { addItem, toggleDrawer } = useCart();
  const { user: authUser, token } = useAuth();
  const router = useRouter();

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    // Generate random viewers on client-side only to avoid hydration mismatch
    setViewers(Math.floor(Math.random() * 22) + 12);

    // Track Meta ViewContent
    import("@/components/analytics/MetaPixel").then((m) => {
      m.trackMetaEvent("ViewContent", {
        content_ids: product.variants?.map((v: any) => v.id) || [product.id],
        content_name: product.title,
        content_type: "product",
        currency: "INR",
        value: product.variants?.[0]?.price ? Number(product.variants[0].price) : 0,
      });
    });

    // Track view for interests
    if (authUser?.id && product.id) {
      fetch(`${API_URL}/api/v1/products/track-view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, userId: authUser.id })
      }).catch(err => console.error("Tracking error:", err));
    }

    if (token) {
      fetch(`${API_URL}/api/v1/growth/referral/code`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.code) setReferralCode(data.code);
      })
      .catch(err => console.error("Referral fetch error:", err));
    }
  }, [authUser?.id, product.id, token]);

  const variantsArray = Array.isArray(product.variants) ? product.variants : [];
  
  const normalizeSize = (size: string) => {
    if (!size) return "";
    const s = size.toUpperCase();
    if (s === 'M-38') return 'M';
    if (s === 'L-40') return 'L';
    if (s === 'XL-42') return 'XL';
    if (s === 'XXL-44' || s === '2XL-44') return '2XL';
    if (s === '3XL-46') return '3XL';
    return size;
  };

  const selectedVariant = variantsArray.find(v => 
    (normalizeSize(v?.option1Value || "") === selectedOptions.option1) &&
    (v?.option2Value || "") === selectedOptions.option2 &&
    (v?.option3Value || "") === selectedOptions.option3 &&
    v.inventory > 0
  ) || variantsArray.find(v => 
    (normalizeSize(v?.option1Value || "") === selectedOptions.option1) &&
    (v?.option2Value || "") === selectedOptions.option2 &&
    (v?.option3Value || "") === selectedOptions.option3
  ) || variantsArray[0];

  // Helper to get unique values for each option level
  const getUniqueOptions = (optionKey: 'option1Value' | 'option2Value' | 'option3Value') => {
    const values = (Array.isArray(product.variants) ? product.variants : [])
      .map(v => optionKey === 'option1Value' ? normalizeSize(v?.[optionKey] || "") : v?.[optionKey])
      .filter((v): v is string => !!v);
    return Array.from(new Set(values));
  };

  const option1Values = getUniqueOptions('option1Value');
  const option2Values = getUniqueOptions('option2Value');
  const option3Values = getUniqueOptions('option3Value');

  const isOnlyDefault = option1Values.length === 1 && (option1Values[0] === 'Default Title' || option1Values[0] === 'Default' || option1Values[0] === '');

  const handleApplyCoupon = async () => {
    if (!coupon) return;
    setCheckingCoupon(true);
    setCouponMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/marketing/discounts/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon, cartTotal: Number(selectedVariant?.price || 0) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid coupon");

      setCouponMsg({ type: 'SUCCESS', text: data.message });
    } catch (err: any) {
      setCouponMsg({ type: 'ERROR', text: err.message });
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleAddToBag = async () => {
    if (!selectedVariant) return;
    
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }

    setIsAdding(true);
    await new Promise(r => setTimeout(r, 800));

    addItem({
      id: `${product.id}-${selectedVariant.id}`, // Unique ID for cart entry
      variantId: selectedVariant.id,
      title: product.title,
      price: Number(selectedVariant.price),
      quantity: 1,
      maxStock: selectedVariant.inventory, // FIX: pass stock cap to cart
      image: product.images[0]?.url || "",
      taxInclusive: product.taxInclusive,
      size: selectedVariant.option1Value || "",
      color: selectedVariant.option2Value || "",
      material: selectedVariant.option3Value || "",
      options: {
        [product.variants[0].option1Name || 'Option 1']: selectedVariant.option1Value || '',
        [product.variants[0].option2Name || 'Option 2']: selectedVariant.option2Value || '',
        [product.variants[0].option3Name || 'Option 3']: selectedVariant.option3Value || '',
      },
      handle: product.handle,
    });

    setIsAdding(false);
    toggleDrawer(true);
  };

  return (
    <div className="space-y-8">
      {/* Brand & Category */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase font-bold tracking-[0.4em] text-wine">
          {product.type || "Collection"}
        </p>
        <h1 className="text-4xl md:text-5xl font-serif text-theme-text leading-tight">
          {product.title}
        </h1>
        <div className="flex items-center gap-2 mt-2">
           <span className="flex h-2 w-2 rounded-full bg-green-500" />
           <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-widest">
             {viewers} People are looking at this right now
           </span>
        </div>
      </div>

      {/* Pricing & Scarcity */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <span className="text-2xl font-bold text-theme-text">
              {selectedVariant ? `₹${Number(selectedVariant.price).toLocaleString()}` : "Price TBD"}
            </span>
            {selectedVariant && (selectedVariant?.mrp || selectedVariant?.compareAtPrice) && Number(selectedVariant.mrp || selectedVariant.compareAtPrice) > Number(selectedVariant.price) && (
              <span className="text-xl md:text-2xl text-theme-text-muted font-sans font-light line-through opacity-70">
                ₹{Number(selectedVariant.mrp || selectedVariant.compareAtPrice).toLocaleString()}
              </span>
            )}
          </div>

          <AnimatePresence>
            {selectedVariant && selectedVariant.inventory > 0 && selectedVariant.inventory <= 10 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full"
              >
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase text-red-600 tracking-wider">
                  Only {selectedVariant.inventory} left in stock
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <span className="text-[10px] text-theme-text-muted uppercase tracking-[0.2em] font-medium mt-1">
          {product.taxInclusive !== false ? "Inclusive of GST" : "+ 12% GST (calculated at checkout)"}
        </span>
        {selectedVariant && (
          <div className="flex items-center gap-2 mt-2 w-fit">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400 drop-shadow-[0_0_3px_rgba(250,204,21,0.8)] animate-pulse" />
            <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-widest">
              Earn {Math.floor(Number(selectedVariant.price) / 100)} Reward Points
            </span>
          </div>
        )}
      </div>

      {/* Multi-Dimensional Variant Selectors */}
      <div className="space-y-6">
        {product.sizeGuide && option1Values.length === 0 && (
          <div className="flex justify-end">
            <button 
              onClick={() => setIsSizeGuideOpen(true)}
              className="text-wine underline underline-offset-4 text-[10px] font-bold uppercase tracking-widest"
            >
              Size Guide
            </button>
          </div>
        )}
        {/* Option 1 (e.g. Size) */}
        {!isOnlyDefault && option1Values.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-charcoal/60">
              <span>Select {product.variants[0]?.option1Name || "Size"}</span>
              {product.sizeGuide && (
                <button 
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-wine underline underline-offset-4"
                >
                  Size Guide
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {option1Values.map((val) => {
                const isAvailable = variantsArray.some(v => normalizeSize(v?.option1Value || "") === val && v?.inventory > 0 && (selectedOptions.option2 ? v?.option2Value === selectedOptions.option2 : true) && (selectedOptions.option3 ? v?.option3Value === selectedOptions.option3 : true));
                return (
                  <button
                    key={val}
                    onClick={() => setSelectedOptions(prev => ({ ...prev, option1: val }))}
                    className={`px-6 py-3 rounded-xl border text-xs font-bold tracking-widest transition-all ${
                      selectedOptions.option1 === val
                        ? "bg-theme-text text-theme-bg border-theme-text shadow-lg"
                        : "bg-theme-bg text-theme-text border-theme-border hover:border-primary"
                    } ${!isAvailable ? "opacity-50 line-through decoration-1" : ""}`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Option 2 (e.g. Color) */}
        {option2Values.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-charcoal/60">
              <span>Select {product.variants[0]?.option2Name || "Color"}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {option2Values.map((val) => {
                const isAvailable = variantsArray.some(v => v?.option2Value === val && v?.inventory > 0 && (selectedOptions.option1 ? v?.option1Value === selectedOptions.option1 : true) && (selectedOptions.option3 ? v?.option3Value === selectedOptions.option3 : true));
                return (
                  <button
                    key={val}
                    onClick={() => setSelectedOptions(prev => ({ ...prev, option2: val }))}
                    className={`px-6 py-3 rounded-xl border text-xs font-bold tracking-widest transition-all ${
                      selectedOptions.option2 === val
                        ? "bg-theme-text text-theme-bg border-theme-text shadow-lg"
                        : "bg-theme-bg text-theme-text border-theme-border hover:border-primary"
                    } ${!isAvailable ? "opacity-50 line-through decoration-1" : ""}`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Option 3 (e.g. Material) */}
        {option3Values.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-charcoal/60">
              <span>Select {product.variants[0]?.option3Name || "Material"}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {option3Values.map((val) => {
                const isAvailable = variantsArray.some(v => v?.option3Value === val && v?.inventory > 0 && (selectedOptions.option1 ? v?.option1Value === selectedOptions.option1 : true) && (selectedOptions.option2 ? v?.option2Value === selectedOptions.option2 : true));
                return (
                  <button
                    key={val}
                    onClick={() => setSelectedOptions(prev => ({ ...prev, option3: val }))}
                    className={`px-6 py-3 rounded-xl border text-xs font-bold tracking-widest transition-all ${
                      selectedOptions.option3 === val
                        ? "bg-theme-text text-theme-bg border-theme-text shadow-lg"
                        : "bg-theme-bg text-theme-text border-theme-border hover:border-primary"
                    } ${!isAvailable ? "opacity-50 line-through decoration-1" : ""}`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          id="main-cta"
          onClick={handleAddToBag}
          disabled={isAdding || !selectedVariant || selectedVariant.inventory <= 0}
          className="flex-1 group relative bg-wine text-white py-5 rounded-2xl text-[10px] uppercase font-bold tracking-[0.3em] overflow-hidden transition-all shadow-xl active:scale-95 disabled:opacity-50"
        >
          <div className="relative z-10 flex items-center justify-center gap-3">
            {isAdding ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <ShoppingBag size={18} />
            )}
            <span>{(selectedVariant?.inventory ?? 0) > 0 ? (isAdding ? "Adding to Bag..." : "Add to Bag") : (selectedVariant ? "Sold Out" : "Option Unavailable")}</span>
          </div>
          <div className="absolute inset-0 bg-charcoal -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-[0.22, 1, 0.36, 1]" />
        </button>

        <button 
          onClick={() => toggleWishlist(product.id)}
          className={`p-5 rounded-2xl border transition-colors ${
            mounted && isInWishlist(product.id)
              ? "bg-wine text-ivory border-wine shadow-lg"
              : "border-charcoal/10 hover:bg-beige text-wine"
          }`}
        >
          <Heart size={20} fill={mounted && isInWishlist(product.id) ? "currentColor" : "none"} />
        </button>
      </div>

      <button
        disabled={isAdding || !selectedVariant || selectedVariant.inventory <= 0}
        onClick={() => {
          handleAddToBag();
          setTimeout(() => router.push('/checkout'), 1000);
        }}
        className="w-full bg-charcoal text-white py-4 rounded-2xl text-[10px] uppercase font-bold tracking-[0.3em] hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {(selectedVariant?.inventory ?? 0) > 0 ? "Buy Now" : "Sold Out"}
      </button>

      {/* Coupon Check Section */}
      <div className="bg-theme-surface p-6 rounded-2xl border border-theme-border space-y-4">
        <div className="flex justify-between items-center">
           <h4 className="text-[10px] uppercase font-bold tracking-widest text-theme-text-muted flex items-center gap-2">
             <Tag size={12} /> Apply Coupon
           </h4>
        </div>
        <div className="flex gap-2">
           <input 
            type="text" 
            placeholder="Enter Code (e.g. RAAGHAS10)" 
            value={coupon}
            onChange={e => setCoupon(e.target.value.toUpperCase())}
            className="flex-1 bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-xs outline-none focus:border-wine uppercase text-theme-text"
           />
           <button 
            onClick={handleApplyCoupon}
            disabled={checkingCoupon || !coupon}
            className="bg-theme-text text-theme-bg px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-wine hover:text-white transition-all disabled:opacity-50"
           >
             {checkingCoupon ? <Loader2 className="animate-spin" size={14} /> : "Apply"}
           </button>
        </div>
        <AnimatePresence>
          {couponMsg && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`text-[10px] font-bold flex items-center gap-2 ${couponMsg.type === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}`}
            >
              {couponMsg.type === 'SUCCESS' ? <Check size={12} /> : <AlertCircle size={12} />}
              <span>{couponMsg.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Shipping & Returns Details */}
      <div className="pt-8 border-t border-theme-border space-y-4">
         <details className="group">
           <summary className="flex justify-between items-center cursor-pointer list-none">
             <span className="text-[10px] uppercase font-bold tracking-widest text-theme-text">Shipping & Delivery</span>
             <ChevronDown size={14} className="group-open:rotate-180 transition-transform text-theme-text-muted" />
           </summary>
           <div className="pt-4 text-xs text-theme-text-muted leading-relaxed space-y-2">
             <p>• Hand-packed in our signature luxury boxes.</p>
             <p>• Dispatched within 48 hours of quality check.</p>
           </div>
         </details>
         <details className="group">
           <summary className="flex justify-between items-center cursor-pointer list-none">
             <span className="text-[10px] uppercase font-bold tracking-widest text-theme-text">Returns & Exchanges</span>
             <ChevronDown size={14} className="group-open:rotate-180 transition-transform text-theme-text-muted" />
           </summary>
           <div className="pt-4 text-xs text-theme-text-muted leading-relaxed space-y-2">
             <p>• Items must be unworn with original tags.</p>
             <p>• Reverse pickup started within 24 hours.</p>
           </div>
         </details>
      </div>

      {/* Trust & Delivery Tokens */}
      <div className="grid grid-cols-3 gap-4 pt-8 border-t border-charcoal/5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 bg-ivory rounded-full flex items-center justify-center text-wine">
            <ShieldCheck size={18} />
          </div>
          <p className="text-[9px] uppercase font-bold tracking-widest text-charcoal/60">Premium Quality</p>
        </div>
        <div className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 bg-ivory rounded-full flex items-center justify-center text-wine">
            <Sparkles size={18} />
          </div>
          <p className="text-[9px] uppercase font-bold tracking-widest text-charcoal/60">Trending Styles</p>
        </div>
        <div className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 bg-ivory rounded-full flex items-center justify-center text-wine">
            <Tag size={18} />
          </div>
          <p className="text-[9px] uppercase font-bold tracking-widest text-charcoal/60">Affordable Luxury</p>
        </div>
      </div>

      {/* Product Details Narrative */}
      <div className="pt-8 space-y-6">
        <h3 className="text-lg font-serif italic text-theme-text">Product Details</h3>
        <div 
          className="text-sm font-sans text-theme-text-muted leading-relaxed italic prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: product.description || "A masterpiece of artisanal craftsmanship, this piece embodies the timeless elegance of Raaghas." }}
        />
      </div>

      {/* Share & Earn Section */}
      <div className="bg-gradient-to-r from-wine/10 to-transparent p-6 rounded-2xl border border-wine/20 space-y-4">
        <div className="flex justify-between items-center">
           <h4 className="text-[10px] uppercase font-bold tracking-widest text-wine flex items-center gap-2">
             <Share2 size={12} /> Share & Earn
           </h4>
        </div>
        <p className="text-xs text-theme-text-muted">
          Share this product with friends. If they sign up using your link, you'll earn <span className="font-bold text-wine">₹100 credits</span>.
        </p>
        {referralCode ? (
          <div className="flex gap-2">
            <input 
              type="text"
              readOnly
              value={`https://raaghas.in/products/${product.handle}?ref=${referralCode}`}
              className="flex-1 bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-xs outline-none text-theme-text opacity-70"
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`https://raaghas.in/products/${product.handle}?ref=${referralCode}`);
                setCopiedRef(true);
                setTimeout(() => setCopiedRef(false), 2000);
              }}
              className="bg-wine text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all"
            >
              {copiedRef ? "Copied!" : <Copy size={14} />}
            </button>
          </div>
        ) : (
          <button 
            onClick={() => router.push('/account?tab=referral')}
            className="text-[10px] uppercase font-bold tracking-widest text-wine border-b border-wine/50 hover:border-wine"
          >
            Sign in to get your link
          </button>
        )}
      </div>

      <AnimatePresence>
        {isSizeGuideOpen && product.sizeGuide && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm"
            onClick={() => setIsSizeGuideOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-theme-surface rounded-3xl shadow-2xl overflow-hidden max-w-2xl w-full max-h-[85vh] flex flex-col border border-theme-border"
            >
              <div className="flex justify-between items-center p-6 border-b border-theme-border bg-theme-bg/50">
                <h3 className="font-serif text-2xl text-theme-text">{product.sizeGuide.name}</h3>
                <button 
                  onClick={() => setIsSizeGuideOpen(false)}
                  className="p-2 hover:bg-theme-bg rounded-full transition-colors text-theme-text-muted hover:text-theme-text"
                >
                  <X size={20} />
                </button>
              </div>
              <div 
                className="p-6 overflow-y-auto max-h-[70vh] text-theme-text-muted text-sm 
                           [&>table]:w-full [&>table]:border-collapse [&>table]:border-theme-border 
                           [&_th]:border [&_th]:border-theme-border [&_th]:p-3 [&_th]:bg-theme-bg [&_th]:text-left [&_th]:font-bold [&_th]:text-theme-text
                           [&_td]:border [&_td]:border-theme-border [&_td]:p-3 
                           [&_tr:hover]:bg-theme-bg/50" 
                dangerouslySetInnerHTML={{ __html: product.sizeGuide.htmlContent }} 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
