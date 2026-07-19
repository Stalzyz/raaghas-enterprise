"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Home, Search, ShoppingBag, User, Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useState, useEffect } from "react";

export function MobileBottomDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { items, toggleDrawer } = useCart();
  const [activeTab, setActiveTab] = useState(pathname);

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Search, label: "Search", href: "/search" },
    { icon: ShoppingBag, label: "Bag", href: "/cart", isCart: true, count: items.length },
    { icon: Heart, label: "Wishlist", href: "/wishlist" },
    { icon: User, label: "Profile", href: "/account" },
  ];

  const [isDockVisible, setIsDockVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Auto-hide dock when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsDockVisible(false);
      } else {
        setIsDockVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleNav = (item: any) => {
    if (item.isCart) {
      toggleDrawer(true);
      return;
    }
    if (item.label === "Search") {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        const searchInput = document.getElementById('smart-search-input');
        if (searchInput) searchInput.focus();
      }, 300);
      return;
    }
    if (item.action) {
      item.action();
      return;
    }
    router.push(item.href);
  };

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-[9998] md:hidden transition-transform duration-300 ${
        isDockVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="bg-theme-surface/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex items-center justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <button
              key={idx}
              onClick={() => handleNav(item)}
              className="relative flex-1 flex flex-col items-center justify-center py-2"
            >
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/5 rounded-2xl mx-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>

              <div className={`relative z-10 transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-theme-text-muted'}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {item.count !== undefined && item.count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-[8px] text-white w-4 h-4 rounded-full flex items-center justify-center font-bold border border-theme-surface">
                    {item.count}
                  </span>
                )}
              </div>
              
              {isActive && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[8px] font-bold uppercase tracking-widest text-primary mt-1 z-10"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
