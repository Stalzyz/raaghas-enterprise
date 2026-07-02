"use client";

import { API_URL } from "@/lib/api";

import { useState, useRef, useEffect } from "react";
import { Search, Loader2, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ProductCard from "@/components/products/ProductCard";

export default function SmartSearchBar({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{ message: string; products: any[] } | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search trigger
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 800);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/ai/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        if (onClose && !query) onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, query]);

  return (
    <div ref={containerRef} className="relative w-full max-w-4xl mx-auto z-[100]">
      {/* The Search Bar Input */}
      <div className={`relative flex items-center transition-all duration-300 ${isFocused ? 'scale-[1.02]' : 'scale-100'}`}>
        <div className="absolute left-4 text-primary">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <input
          id="smart-search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Ask our AI Stylist (e.g., 'Show me red silk kurtis under ₹5000')"
          className="w-full bg-theme-surface/80 backdrop-blur-md border border-primary/20 text-theme-text rounded-full py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary shadow-lg transition-all"
        />
        <div className="absolute right-4 text-gray-400">
          {isSearching ? (
             <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : query ? (
             <button onClick={() => { setQuery(''); setResults(null); }} className="hover:text-primary transition-colors">
               <X className="w-5 h-5" />
             </button>
          ) : (
             <Search className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* The Command Palette Dropdown */}
      <AnimatePresence>
        {isFocused && (query || results) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 10, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 bg-theme-bg md:bg-theme-surface/95 md:backdrop-blur-2xl border border-theme-border rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden z-[100]"
          >
            {/* AI Message */}
            {results && results.message && (
              <div className="bg-primary/5 border-b border-primary/10 p-6 flex items-start gap-4">
                <div className="bg-primary text-white p-2 rounded-full mt-1">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-theme-text font-serif italic text-sm md:text-base leading-relaxed">
                    {results.message}
                  </p>
                </div>
              </div>
            )}

            {/* Product Grid */}
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
               {isSearching && !results && (
                 <div className="flex flex-col items-center justify-center py-12 text-theme-text-muted">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                    <p className="tracking-widest uppercase text-xs font-bold">Styling your request...</p>
                 </div>
               )}
               
               {!isSearching && results?.products && results.products.length > 0 && (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {results.products.map((product) => (
                     <div key={product.id} onClick={() => setIsFocused(false)}>
                       <ProductCard
                         product={{
                           id: product.id,
                           handle: product.handle,
                           title: product.title,
                           price: product.variants?.[0]?.offerPrice || product.variants?.[0]?.sellingPrice || product.variants?.[0]?.price || '0',
                           compareAtPrice: product.variants?.[0]?.mrp || product.variants?.[0]?.price || undefined,
                           imageUrl: product.images?.[0]?.url || '',
                           category: product.category,
                           isOutOfStock: product.variants?.reduce((sum: number, v: any) => sum + (v.inventory || 0), 0) <= 0,
                           variants: product.variants
                         }}
                       />
                     </div>
                   ))}
                 </div>
               )}

               {!isSearching && results?.products && results.products.length === 0 && (
                 <div className="py-12 text-center text-theme-text-muted font-bold tracking-widest uppercase text-xs">
                   No perfectly matched pieces found. Try a different style!
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
