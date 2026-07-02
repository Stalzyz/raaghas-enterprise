"use client";

import { API_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { CheckCircle, Gift, Sparkles, Tag } from "lucide-react";
import Link from "next/link";
import { getAssetUrl } from "@/lib/utils/assets";

interface ProductRecommendation {
  id: string;
  variantId: string;
  title: string;
  price: number;
  image: string;
  maxStock: number;
  handle: string;
  taxInclusive?: boolean;
  taxRate?: number;
}

export function OffersProgress() {
  const { cartTotal, addItem, toggleDrawer } = useCart();
  const [mounted, setMounted] = useState(false);
  const [threshold, setThreshold] = useState(1899);
  const [recommendedItems, setRecommendedItems] = useState<ProductRecommendation[]>([]);
  
  useEffect(() => {
    setMounted(true);
    // Fetch global settings to get the dynamic free shipping threshold
    fetch(`https://api.raaghas.in/api/v1/logistics/free-shipping-threshold`)
      .then(res => res.json())
      .then(data => {
         if (data?.threshold) {
            setThreshold(Number(data.threshold));
         }
      })
      .catch(console.error);

    // Fetch dynamic cheap/upsell products
    const apiBase = API_URL;
    fetch(`${apiBase}/api/v1/products?limit=10&sort=price_asc&inStock=true`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formatted = data.map((product: any) => ({
            id: product.id,
            variantId: product.variants?.[0]?.id || product.id,
            title: product.title,
            price: Number(product.variants?.[0]?.price || 0),
            image: product.images?.[0]?.url || "",
            maxStock: Number(product.variants?.[0]?.inventory ?? 99),
            handle: product.handle,
            taxInclusive: product.taxInclusive,
            taxRate: Number(product.taxRate || 5)
          }));
          setRecommendedItems(formatted);
        }
      })
      .catch(console.error);
  }, []);

  if (!mounted) return null;

  const progressPercentage = Math.min((cartTotal / threshold) * 100, 100);
  const amountNeeded = threshold - cartTotal;
  const isUnlocked = cartTotal >= threshold;
  const visibleRecommendations = recommendedItems.filter(item => item.price <= amountNeeded + 500);

  return (
    <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className={isUnlocked ? "text-green-500" : "text-wine"} size={20} />
          <h3 className="font-serif font-bold text-lg text-theme-text">
            {isUnlocked ? "Benefits Unlocked!" : "Unlock Free Shipping"}
          </h3>
        </div>
        {isUnlocked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-green-500"
          >
            <CheckCircle size={20} />
          </motion.div>
        )}
      </div>

      {/* Progress Message */}
      <p className="text-sm text-theme-text-muted">
        {isUnlocked 
          ? "You qualify for Free Premium Shipping & exclusive wholesale perks!" 
          : `Add ₹${amountNeeded.toLocaleString()} more to your cart to get Free Shipping.`}
      </p>

      {/* Progress Bar */}
      <div className="h-3 w-full bg-theme-bg rounded-full overflow-hidden border border-theme-border relative">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`absolute top-0 left-0 h-full ${isUnlocked ? "bg-green-500" : "bg-wine"}`}
        />
        {/* Sparkles effect if unlocked */}
        <AnimatePresence>
          {isUnlocked && (
             <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-white/20"
             />
          )}
        </AnimatePresence>
      </div>

      {/* Cross-Sell Carousel (Only show if close to threshold, e.g. < ₹1500 needed) */}
      {!isUnlocked && amountNeeded <= 1500 && visibleRecommendations.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="pt-4 border-t border-theme-border"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-theme-text-muted mb-3 flex items-center gap-2">
            <Sparkles size={12} className="text-wine"/> Quick Add to Unlock
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {visibleRecommendations.map((item) => (
              <div key={item.id} className="min-w-[120px] bg-theme-bg border border-theme-border p-2 rounded-lg text-center flex flex-col justify-between">
                <div>
                  <div className="w-full h-16 bg-theme-surface mb-2 rounded overflow-hidden flex items-center justify-center relative">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-theme-text-muted">No Image</span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-theme-text line-clamp-2 leading-tight">{item.title}</p>
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold text-wine mb-1">₹{item.price}</p>
                  <button 
                    onClick={() => {
                      addItem({
                        id: item.id,
                        variantId: item.variantId,
                        title: item.title,
                        price: item.price,
                        quantity: 1,
                        image: item.image,
                        maxStock: item.maxStock,
                        handle: item.handle,
                        taxInclusive: item.taxInclusive,
                        taxRate: item.taxRate,
                      });
                      toggleDrawer(true);
                    }}
                    className="w-full text-[9px] uppercase tracking-wider bg-theme-surface border border-theme-border px-2 py-1 rounded block hover:bg-wine hover:text-white transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
