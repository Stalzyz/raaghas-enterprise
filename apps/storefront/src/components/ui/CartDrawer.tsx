"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, updateQuantity, cartTotal: subtotal } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with sophisticated blur */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            onClick={onClose}
            className="fixed inset-0 bg-charcoal/30 z-[100]"
          />
          
          {/* Drawer with spring physics */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 200, mass: 1 }}
            className="fixed bottom-24 right-6 z-[9995] w-[380px] h-[520px] bg-[var(--surface)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[var(--border)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface)] backdrop-blur-md sticky top-0 z-10">
              <div className="space-y-1">
                <h2 className="text-2xl font-serif text-charcoal flex items-center gap-3">
                  Shopping Bag
                  <span className="text-[10px] bg-wine text-white px-2 py-0.5 rounded-full font-sans font-bold">
                    {items.length}
                  </span>
                </h2>
                <p className="text-[10px] uppercase tracking-[0.2em] text-charcoal/40 font-bold">Raaghas Collections</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-3 hover:rotate-90 hover:bg-wine hover:text-white transition-all duration-500 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Items */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {items.length > 0 ? (
                items.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ delay: 0.1 + index * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="flex gap-6 group"
                  >
                    <div className="w-28 aspect-[3/4] bg-beige overflow-hidden relative shadow-md group-hover:shadow-xl transition-shadow duration-700">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                    </div>
                    
                    <div className="flex-1 flex flex-col py-1">
                      <div className="flex justify-between items-start mb-2">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal leading-tight line-clamp-2">{item.title}</h3>
                          <p className="text-[10px] text-charcoal/40 font-bold tracking-[0.1em]">Selected Size: {item.size}</p>
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-charcoal/20 hover:text-wine transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="mt-auto flex justify-between items-end border-t border-[var(--border)] pt-4">
                        <div className="flex items-center gap-6">
                           <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="text-charcoal/40 hover:text-charcoal transition-colors font-serif"
                           >—</button>
                           <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                           <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="text-charcoal/40 hover:text-charcoal transition-colors font-serif"
                           >+</button>
                        </div>
                        <span className="text-lg font-serif italic text-wine">₹{item.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 pb-20">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-12 bg-beige rounded-full text-wine/10 relative"
                  >
                    <ShoppingBag size={80} strokeWidth={1} />
                    <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 3 }}
                      className="absolute -top-2 -right-2 text-wine"
                    >
                      ✨
                    </motion.div>
                  </motion.div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-serif text-charcoal">Your bag is empty</h3>
                    <p className="text-xs text-charcoal/40 max-w-[200px] leading-relaxed">Discover elegance in our latest luxury collections.</p>
                  </div>
                  <button 
                    onClick={onClose} 
                    className="bg-charcoal text-white px-8 py-3.5 text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-wine transition-all shadow-xl"
                  >
                    Start Exploring
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-10 bg-[var(--surface)] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] border-t border-[var(--border)] space-y-8">
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-[0.2em] text-charcoal/40">
                    <span>Bag Total</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-[0.2em] text-charcoal/40 italic">
                    <span>Shipping estim.</span>
                    <span className="text-charcoal/60 lowercase">Calculated at checkout</span>
                  </div>
                </div>

                <div className="p-4 bg-[var(--surface)] border-t border-[var(--border)]">
                   <div className="flex justify-between text-2xl font-serif mb-10 items-baseline">
                      <span className="text-lg font-sans uppercase font-bold tracking-widest text-charcoal/20 leading-none">Total Value</span>
                      <span className="text-wine text-3xl italic">₹{subtotal.toLocaleString()}</span>
                   </div>
                   <button className="w-full group relative bg-wine text-white py-5 uppercase font-bold text-xs tracking-[0.3em] overflow-hidden shadow-2xl">
                     <span className="relative z-10 flex items-center justify-center gap-4 group-hover:translate-x-2 transition-transform duration-500">
                       Continue to Checkout
                       <ArrowRight size={18} />
                     </span>
                     <div className="absolute inset-0 bg-charcoal translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                   </button>
                   <div className="flex justify-center gap-6 mt-6 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-4" alt="PayPal" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Visa_2014_logo_detail.svg" className="h-4" alt="Visa" />
                   </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
