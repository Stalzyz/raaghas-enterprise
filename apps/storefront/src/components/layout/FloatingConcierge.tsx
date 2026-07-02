"use client";

import { API_URL } from "@/lib/api";

import { MessageCircle, X, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { OffersProgress } from "../ui/OffersProgress";
import { ShippingPredictor } from "../ui/ShippingPredictor";

export function FloatingConcierge() {
  const [supportPhone, setSupportPhone] = useState<string>("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showOffersPanel, setShowOffersPanel] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/settings/public`)
      .then(res => res.json())
      .then(data => {
        if (data.supportPhone) setSupportPhone(data.supportPhone);
      })
      .catch(err => console.error("Error fetching concierge settings", err));

    const visibilityTimer = setTimeout(() => setIsVisible(true), 2000);
    const tooltipTimer = setTimeout(() => setShowTooltip(true), 6000);
    
    return () => {
      clearTimeout(visibilityTimer);
      clearTimeout(tooltipTimer);
    };
  }, []);

  if (!supportPhone && !isVisible) return null;

  const openWhatsApp = () => {
    const phone = supportPhone.replace(/[^0-9]/g, '') || "919000000000";
    const message = encodeURIComponent("Hello Raaghas Concierge, I'm exploring your collections and need some styling assistance.");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: 50 }}
          className="fixed bottom-32 left-6 md:bottom-12 md:left-12 z-[9999]"
        >
          <div className="relative group">
            {/* Ambient Pulse */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute -inset-6 bg-wine/20 rounded-full blur-2xl pointer-events-none" 
            />
            
            {/* Tooltip Overlay */}
            <AnimatePresence>
              {showTooltip && (
                <motion.div 
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-full left-0 mb-6 bg-theme-surface border border-theme-border p-4 rounded-2xl shadow-2xl min-w-[200px]"
                >
                  <button 
                    onClick={() => setShowTooltip(false)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-theme-surface border border-theme-border rounded-full flex items-center justify-center text-[10px] hover:bg-wine hover:text-white transition-all shadow-sm"
                  >
                    <X size={10} />
                  </button>
                  <p className="text-[10px] font-bold text-wine uppercase tracking-[0.2em] mb-1">Style Muse</p>
                  <p className="text-[11px] text-theme-text/70 leading-relaxed font-medium">How can I help you discover the perfect ensemble today?</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => setShowOffersPanel(!showOffersPanel)}
                className="relative flex items-center gap-3 bg-theme-surface border border-theme-border pl-4 pr-6 py-3 rounded-full shadow-2xl hover:bg-wine hover:text-white transition-all duration-700 group"
              >
                <div className="w-10 h-10 bg-wine text-white rounded-full flex items-center justify-center group-hover:bg-theme-surface group-hover:text-wine transition-colors duration-500 shadow-inner">
                  <MapPin size={20} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-wine group-hover:text-white transition-colors">Offers</span>
                  <span className="text-[10px] font-medium text-theme-text/60 group-hover:text-white/80 transition-colors">& Shipping</span>
                </div>
              </button>

              <button
                onClick={openWhatsApp}
                className="relative flex items-center gap-3 bg-theme-surface border border-theme-border pl-4 pr-6 py-3 rounded-full shadow-2xl hover:bg-wine hover:text-white transition-all duration-700 group"
              >
                <div className="w-10 h-10 bg-wine text-white rounded-full flex items-center justify-center group-hover:bg-theme-surface group-hover:text-wine transition-colors duration-500 shadow-inner">
                  <MessageCircle size={20} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-wine group-hover:text-white transition-colors">Guide</span>
                  <span className="text-[10px] font-medium text-theme-text/60 group-hover:text-white/80 transition-colors">Styling Help</span>
                </div>
              </button>
            </div>

            {/* Offers & Shipping Panel Overlay */}
            <AnimatePresence>
              {showOffersPanel && (
                <motion.div 
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-full left-0 mb-6 bg-theme-bg border border-theme-border p-2 rounded-2xl shadow-2xl w-[320px] max-h-[80vh] overflow-y-auto scrollbar-hide z-50"
                >
                  <button 
                    onClick={() => setShowOffersPanel(false)}
                    className="absolute top-4 right-4 z-10 w-8 h-8 bg-theme-surface border border-theme-border rounded-full flex items-center justify-center hover:bg-wine hover:text-white transition-all shadow-sm"
                  >
                    <X size={14} />
                  </button>
                  <div className="p-2 space-y-4 pt-10">
                    <OffersProgress />
                    <ShippingPredictor />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
