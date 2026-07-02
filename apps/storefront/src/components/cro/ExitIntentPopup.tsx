"use client";

import { API_URL } from "@/lib/api";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Mail, Gift } from "lucide-react";

export function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    // Check if already triggered in this session
    if (sessionStorage.getItem("exitIntentShown")) {
      setHasTriggered(true);
      return;
    }

    const mouseOutFn = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasTriggered) {
        setShow(true);
        setHasTriggered(true);
        sessionStorage.setItem("exitIntentShown", "true");
      }
    };

    document.addEventListener("mouseout", mouseOutFn);
    return () => document.removeEventListener("mouseout", mouseOutFn);
  }, [hasTriggered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API_URL}/api/v1/marketing/discounts/track-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch (err) {
      console.error("Failed to sync popup lead:", err);
    }
    setSubscribed(true);
    setTimeout(() => {
      setShow(false);
    }, 3000);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-charcoal/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-ivory shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row"
          >
            <button 
              onClick={() => setShow(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-ivory/50 text-charcoal hover:bg-ivory transition-colors"
            >
              <X size={16} />
            </button>

            {/* Image side */}
            <div className="hidden md:block w-1/3 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop')` }} />

            {/* Content side */}
            <div className="w-full md:w-2/3 p-8 md:p-10 text-center space-y-6">
              {!subscribed ? (
                <>
                  <div className="mx-auto w-12 h-12 rounded-full bg-wine/10 text-wine flex items-center justify-center">
                    <Gift size={24} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-serif text-charcoal">Wait! Before you go...</h3>
                    <p className="text-sm font-sans text-charcoal/60">
                      Unlock an exclusive ₹150 OFF your first purchase. No minimum order required.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full bg-white border border-charcoal/10 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-wine transition-colors"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-wine text-ivory font-bold uppercase tracking-widest text-xs py-4 rounded-lg hover:bg-wine-light transition-colors"
                    >
                      Claim My ₹150 OFF
                    </button>
                  </form>
                  <button onClick={() => setShow(false)} className="text-[10px] text-charcoal/40 hover:underline pt-2">
                    No thanks, I prefer paying full price
                  </button>
                </>
              ) : (
                <div className="py-12 space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-2xl font-bold">✓</div>
                  <h3 className="text-2xl font-serif text-charcoal">You're on the list!</h3>
                  <p className="text-sm font-sans text-charcoal/60">
                    Use code <span className="font-bold text-wine">WELCOME150</span> at checkout.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
