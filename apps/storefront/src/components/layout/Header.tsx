"use client";

import { ShoppingBag, Search, ChevronDown, Menu, User, LogOut, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import MagneticLink from "../ui/MagneticLink";
import MobileNav from "./MobileNav";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/components/providers/AuthProvider";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "@/components/providers/ThemeContext";
import SmartSearchBar from "./SmartSearchBar";

export function Header({ settings, theme: themeConfig, menu }: { settings: any, theme: any, menu: any }) {
  const storeName = themeConfig?.storeName || settings?.storeName || "RAAGHAS";
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { cartCount, toggleDrawer } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const { theme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Auto-hide only when scrolling down past 100px
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <>
      {themeConfig?.announcementBar && (
        <div className="bg-primary text-white text-[10px] py-2 text-center uppercase tracking-[0.2em] font-bold z-[60] relative">
           {themeConfig.announcementBar}
        </div>
      )}
      <nav className={`fixed ${themeConfig?.announcementBar ? 'top-8' : 'top-0'} left-0 right-0 z-[10000] bg-theme-bg/95 backdrop-blur-2xl border-b border-theme-border transition-transform duration-300 shadow-sm ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center py-6 px-6 md:px-12">
          {/* Mobile Menu Icon */}
          <div className="md:hidden flex-shrink-0">
            <button 
              onClick={() => setIsMobileNavOpen(true)}
              className="p-2 text-theme-text hover:text-primary transition-colors"
              aria-label="Open Menu"
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Branding */}
          <Link href="/" className="text-2xl font-serif tracking-[0.2em] text-primary flex-shrink-0 flex items-center">
            {theme === 'dark' ? (
               (themeConfig?.logoDark || settings?.logoDark) ? <img src={themeConfig?.logoDark || settings?.logoDark} alt={storeName} className="h-10 md:h-12 w-auto max-w-[200px] object-contain" style={{ maxHeight: '48px' }} /> : <span className="text-primary text-3xl">{storeName}</span>
            ) : (
               (themeConfig?.logoLight || settings?.logoLight) ? <img src={themeConfig?.logoLight || settings?.logoLight} alt={storeName} className="h-10 md:h-12 w-auto max-w-[200px] object-contain" style={{ maxHeight: '48px' }} /> : <span className="text-primary text-3xl">{storeName}</span>
            )}
          </Link>

          {/* Navigation - Desktop */}
          <div className="hidden md:flex gap-10 text-[10px] md:text-[11px] uppercase tracking-[0.3em] font-sans items-center relative z-[300]">
            {menu?.items?.filter((item: any) => item.label.toLowerCase() !== 'wholesale' && item.label.toLowerCase() !== 'our story').map((item: any) => (
              <div key={item.id} className="relative group flex items-center gap-1 cursor-pointer">
                <Link href={item.url || '#'} className="hover:text-primary transition-all duration-300 relative py-1">
                  {item.label}
                  <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
                {item?.children && item.children.length > 0 && <ChevronDown size={10} className="text-theme-text-muted group-hover:text-primary transition-colors" />}
                
                {item?.children && item.children.length > 0 && (
                  <div className="absolute top-full left-0 pt-6 hidden group-hover:block w-56 transition-all z-[200]">
                    <div className="bg-theme-bg border border-theme-border shadow-2xl overflow-y-auto max-h-[70vh] py-4 custom-scrollbar">
                      {item.children.map((child: any) => (
                        <Link 
                          key={child.id} 
                          href={child.url} 
                          className="block px-6 py-2.5 text-[10px] hover:bg-primary/5 hover:text-primary transition-all uppercase tracking-widest font-bold"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 md:gap-6 flex-shrink-0 text-primary">
            <ThemeToggle />
            <MagneticLink>
              <button 
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setTimeout(() => document.getElementById('smart-search-input')?.focus(), 300);
                }} 
                className="p-2 hover:opacity-70 transition-colors text-primary md:hidden"
              >
                <Search className="w-5 h-5" />
              </button>
            </MagneticLink>
            <MagneticLink>
              <button onClick={() => toggleDrawer(true)} className="p-2 hover:opacity-70 transition-colors relative">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-lg animate-in fade-in zoom-in duration-300">
                    {cartCount}
                  </span>
                )}
              </button>
            </MagneticLink>
            
            <div className="hidden md:block relative">
              {isAuthenticated ? (
                <div className="relative group">
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-2 hover:bg-white/50 rounded-xl transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                      {user?.email?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  </button>
                  
                  {/* Account Dropdown */}
                  <div className="absolute top-full right-0 pt-4 hidden group-hover:block transition-all w-48 z-[200]">
                    <div className="bg-theme-surface border border-theme-border shadow-2xl rounded-2xl p-2 animate-in fade-in slide-in-from-top-2">
                       <Link href="/account" className="flex items-center justify-between px-4 py-3 hover:bg-theme-bg rounded-xl transition-all">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-theme-text">Account</span>
                          <User size={12} className="text-gray-400" />
                       </Link>
                       <button 
                         onClick={logout}
                         className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-500/10 text-red-500 rounded-xl transition-all"
                       >
                          <span className="text-[10px] font-bold uppercase tracking-widest">Logout</span>
                          <LogOut size={12} />
                       </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link href="/sign-in">
                  <button 
                    style={{ borderRadius: "var(--btn-radius)" }}
                    className="text-[10px] bg-theme-text text-theme-bg px-6 py-2.5 uppercase tracking-widest font-bold hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    Login
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Smart AI Search Bar */}
        <div className="block max-w-4xl mx-auto px-4 md:px-6 pb-4 md:pb-6 mt-[-10px]">
          <SmartSearchBar />
        </div>
      </nav>

      <MobileNav 
        isOpen={isMobileNavOpen} 
        onClose={() => setIsMobileNavOpen(false)} 
        menuItems={menu?.items || []} 
      />
    </>
  );
}
