"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingBag, Trash2, ArrowRight, Minus, Plus, 
  ShieldCheck, Sparkles, Tag, ChevronRight 
} from "lucide-react";
import EnsembleCurator from "@/components/products/EnsembleCurator";

export default function CartPage() {
  const { items, updateQuantity, removeItem, cartTotal } = useCart();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const isEmpty = items.length === 0;

  return (
    <div className="min-h-screen bg-ivory/30 pb-24 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-charcoal/40 mb-12">
          <Link href="/" className="hover:text-wine transition-colors">Home</Link>
          <ChevronRight size={10} />
          <span className="text-charcoal font-bold">Shopping Bag</span>
        </div>

        <div className="grid lg:grid-cols-12 gap-16">
          
          {/* Main Cart Area */}
          <div className="lg:col-span-8">
            <div className="flex justify-between items-end mb-10 pb-6 border-b border-charcoal/5">
              <h1 className="text-4xl md:text-5xl font-serif text-charcoal">Your Selection</h1>
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-charcoal/40">
                {items.length} {items.length === 1 ? 'Piece' : 'Pieces'}
              </p>
            </div>

            <AnimatePresence mode="popLayout">
              {isEmpty ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-24 text-center space-y-8"
                >
                  <div className="w-20 h-20 bg-charcoal/5 rounded-full flex items-center justify-center mx-auto text-charcoal/20">
                    <ShoppingBag size={32} />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-serif text-charcoal">Your bag is breathing empty.</h2>
                    <p className="text-xs text-charcoal/40 uppercase font-bold tracking-widest">Discover something timeless for your wardrobe.</p>
                  </div>
                  <Link 
                    href="/collections/all"
                    className="inline-block bg-charcoal text-ivory px-10 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-wine transition-all rounded-xl"
                  >
                    Shop Collections
                  </Link>
                </motion.div>
              ) : (
                <div className="space-y-8">
                  {items.map((item) => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="group relative bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-charcoal/5 flex flex-col md:flex-row gap-8 items-start md:items-center"
                    >
                      <Link 
                        href={`/products/${item.handle}`}
                        className="w-full md:w-32 aspect-[3/4] bg-beige rounded-2xl overflow-hidden flex-shrink-0"
                      >
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                      </Link>

                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-wine mb-1 block">Artisan Craft</span>
                            <h3 className="text-lg font-serif text-charcoal hover:text-wine transition-colors">
                              <Link href={`/products/${item.handle}`}>{item.title}</Link>
                            </h3>
                            {item.size && (
                              <p className="text-[10px] uppercase font-bold text-charcoal/40 tracking-widest mt-1">Size: {item.size}</p>
                            )}
                          </div>
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-charcoal/20 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                          <div className="flex items-center border border-charcoal/10 rounded-xl overflow-hidden bg-ivory/30">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-3 hover:bg-white text-charcoal/40 hover:text-charcoal transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-10 text-center text-xs font-bold font-sans">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              disabled={item.quantity >= (item.maxStock || 999)}
                              className="p-3 hover:bg-white text-charcoal/40 hover:text-charcoal transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title={item.quantity >= (item.maxStock || 999) ? 'Maximum stock reached' : ''}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <p className="text-lg font-serif text-charcoal">₹{(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>

            {/* AI Cross-sell Section */}
            {items.length > 0 && (
              <div className="mt-16 pt-16 border-t border-charcoal/5">
                <div className="mb-10">
                  <h2 className="text-3xl font-serif text-charcoal">Complete the Look</h2>
                  <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-wine">AI curated recommendations for your selection</p>
                </div>
                <EnsembleCurator productId={items[0].id} />
              </div>
            )}
          </div>

          {/* Checkout Sidebar */}
          {!isEmpty && (
            <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit">
              <div className="bg-white rounded-[2rem] p-10 shadow-xl shadow-charcoal/5 border border-charcoal/5 space-y-8">
                <h3 className="text-xl font-serif text-charcoal pb-6 border-b border-charcoal/5">Order Summary</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-charcoal/60">Subtotal</span>
                    <span className="font-bold">₹{cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-charcoal/60">Shipping</span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-green-600">Complimentary</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-charcoal/5 flex justify-between items-end">
                  <span className="text-lg font-serif">Estimated Total</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-wine">₹{cartTotal.toLocaleString()}</p>
                    <p className="text-[9px] uppercase font-bold tracking-widest text-charcoal/30">VAT & Duties inclusive</p>
                  </div>
                </div>

                {checkoutError && (
                  <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold mb-4">
                    {checkoutError}
                  </div>
                )}

                <button 
                  onClick={() => {
                    const outOfStockItems = items.filter(item => item.quantity > (item.maxStock || 0));
                    if (outOfStockItems.length > 0) {
                      setCheckoutError("Please adjust your quantity. Some items in your bag exceed available stock.");
                      return;
                    }
                    setCheckoutError(null);
                    
                    import("js-cookie").then(Cookies => {
                      const token = Cookies.default.get('auth_token');
                      if (!token || token === 'null') {
                         window.location.href = '/sign-in?redirect=/checkout';
                      } else {
                         window.location.href = '/checkout';
                      }
                    });
                  }}
                  className="w-full bg-charcoal text-ivory py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-wine transition-all shadow-xl group"
                >
                  Continue to Checkout
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Trust Signals */}
                <div className="pt-8 grid grid-cols-3 gap-4 border-t border-charcoal/5">
                   <div className="text-center space-y-2">
                     <ShieldCheck size={16} className="mx-auto text-wine/40" />
                     <p className="text-[8px] uppercase font-bold tracking-widest opacity-40 leading-tight">Premium Quality</p>
                   </div>
                   <div className="text-center space-y-2">
                     <Sparkles size={16} className="mx-auto text-wine/40" />
                     <p className="text-[8px] uppercase font-bold tracking-widest opacity-40 leading-tight">Trending Styles</p>
                   </div>
                   <div className="text-center space-y-2">
                     <Tag size={16} className="mx-auto text-wine/40" />
                     <p className="text-[8px] uppercase font-bold tracking-widest opacity-40 leading-tight">Affordable Luxury</p>
                   </div>
                </div>
              </div>

              {/* Assistance Box */}
              <div className="mt-8 p-8 bg-charcoal rounded-[2rem] text-ivory/60 text-center space-y-4">
                 <p className="text-[10px] uppercase font-bold tracking-widest italic">Need Personal Assistance?</p>
                 <p className="text-xs italic leading-relaxed">Our master stylists are available for virtual appointments and styling advice.</p>
                 <button className="text-ivory text-[10px] uppercase font-bold tracking-widest border-b border-ivory/20 pb-1 hover:text-wine transition-colors">Talk to a Stylist</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
