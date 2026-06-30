"use client";

import { useCart } from "@/context/CartContext";
import { X, ShoppingBag, Plus, Minus, ArrowRight, ShieldCheck, Sparkles, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CartDrawer() {
  const { isDrawerOpen, toggleDrawer, items, updateQuantity, removeItem, cartTotal } = useCart();
  const router = useRouter();

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => toggleDrawer(false)}
            className="fixed inset-0 bg-theme-text/40 backdrop-blur-sm z-[9999]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 1 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 100) toggleDrawer(false);
            }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full max-w-md bg-theme-surface shadow-2xl z-[10000] flex flex-col border-l border-theme-border rounded-t-[2.5rem] md:rounded-t-none"
          >
            {/* Mobile Grab Handle */}
            <div className="w-12 h-1.5 bg-theme-border rounded-full mx-auto mt-4 md:hidden opacity-50" />
            <div className="flex justify-between items-center p-6 md:p-8 border-b border-theme-border">
              <h2 className="text-xl font-serif text-theme-text flex items-center gap-3">
                <ShoppingBag size={20} className="text-primary" />
                Your Curated Bag 
                <span className="text-xs bg-theme-bg px-2 py-0.5 rounded-full text-theme-text font-sans font-bold">
                  {items.length}
                </span>
              </h2>
              <button 
                onClick={() => toggleDrawer(false)} 
                className="p-2 hover:bg-theme-bg rounded-full transition-colors text-theme-text"
              >
                <X size={20} />
              </button>
            </div>



            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-theme-bg/30">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-theme-text/5 rounded-full flex items-center justify-center text-theme-text-muted">
                    <ShoppingBag size={32} />
                  </div>
                  <p className="text-[10px] uppercase font-bold text-theme-text-muted tracking-widest">
                    Your bag is empty
                  </p>
                  <button 
                    onClick={() => {
                      toggleDrawer(false);
                      router.push('/collections/new-arrivals');
                    }}
                    className="mt-4 text-primary text-[10px] uppercase font-bold border-b border-primary pb-0.5"
                  >
                    Discover the Collection
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 group">
                    <div className="w-24 aspect-[3/4] bg-theme-surface rounded-xl overflow-hidden border border-theme-border relative shrink-0">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <div className="flex-1 py-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-theme-text tracking-widest uppercase line-clamp-2 pr-2">{item.title}</h4>
                          <button onClick={() => removeItem(item.id)} className="text-theme-text-muted hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                        {item.size && <p className="text-[10px] text-theme-text-muted mt-1 font-bold uppercase">Size: {item.size}</p>}
                      </div>
                      
                      <div className="flex justify-between items-baseline mt-4">
                        <div className="flex items-center gap-3 bg-theme-bg border border-theme-border rounded-lg px-2 py-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="text-theme-text-muted hover:text-primary"><Minus size={12} /></button>
                          <span className="text-[10px] font-bold w-4 text-center text-theme-text">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="text-theme-text-muted hover:text-primary"><Plus size={12} /></button>
                        </div>
                        <span className="font-serif italic text-theme-text">₹{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 md:p-8 bg-theme-surface border-t border-theme-border space-y-6">
                <div className="space-y-3">
                   <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">
                     <span>Subtotal</span>
                     <span>₹{cartTotal.toLocaleString()}</span>
                   </div>
                   {items.some(item => item.taxInclusive === false) && (
                     <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">
                       <span>Additional Tax (GST)</span>
                       <span>₹{Math.round(items.reduce((acc, item) => item.taxInclusive === false ? acc + (item.price * item.quantity * ((item.taxRate || 5) / 100)) : acc, 0)).toLocaleString()}</span>
                     </div>
                   )}
                   <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">
                     <span>Shipping</span>
                     <span className="text-primary">Standard</span>
                   </div>
                </div>

                <div className="pt-4 border-t border-theme-border flex justify-between items-end">
                   <span className="text-lg font-serif italic text-theme-text">Estimated Total</span>
                   <span className="text-2xl font-bold text-theme-text">₹{(cartTotal + Math.round(items.reduce((acc, item) => item.taxInclusive === false ? acc + (item.price * item.quantity * ((item.taxRate || 5) / 100)) : acc, 0))).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400 drop-shadow-[0_0_3px_rgba(250,204,21,0.8)] animate-pulse" />
                  <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-widest">
                    You will earn {Math.floor(cartTotal / 100)} Reward Points
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  <button 
                    onClick={() => {
                      if (items.length === 0) {
                        toggleDrawer(false);
                        return;
                      }
                      
                      // Track Meta InitiateCheckout Event
                      import("@/components/analytics/MetaPixel").then((m) => {
                        m.trackMetaEvent("InitiateCheckout", {
                          value: cartTotal,
                          currency: "INR",
                          num_items: items.length,
                          content_type: "product"
                        });
                      });

                      toggleDrawer(false);
                      router.push('/checkout');
                    }}
                    className="w-full bg-primary text-white py-4 flex items-center justify-center gap-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-opacity"
                  >
                    Secure Checkout <ArrowRight size={14} />
                  </button>
                  <p className="text-center text-[9px] uppercase font-bold tracking-widest text-theme-text-muted flex items-center justify-center gap-1.5">
                    <ShieldCheck size={12} /> Encrypted & Secure Payment
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
