"use client";
export const dynamic = 'force-dynamic';

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { API_URL } from "@/lib/api";
import { getAssetUrl } from "@/lib/utils/assets";
import Link from "next/link";
import ProductCard from "@/components/products/ProductCard";
import { ChevronDown, Filter, X, Loader2, SlidersHorizontal, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "@/hooks/useDebounce";
import { safeFetch } from "@/lib/safe-fetch";
import Breadcrumb from "@/components/layout/Breadcrumb";

function CollectionPageContent({ handle }: { handle: string }) {
  const decodedHandle = decodeURIComponent(handle);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL State
  const page = Number(searchParams.get("page") || "1");
  const sort = searchParams.get("sort") || "newest";
  const selectedTags = searchParams.getAll("tags");
  const selectedSizes = searchParams.getAll("sizes");
  const inStockOnly = searchParams.get("inStock") === "true";
  const showCombo = searchParams.get("combo") === "true";

  // Price uses local state for instant slider feedback; URL is updated debounced
  const [minPrice, setMinPrice] = useState(() => Number(searchParams.get("minPrice") || "0"));
  const [maxPrice, setMaxPrice] = useState(() => Number(searchParams.get("maxPrice") || "10000"));

  // Other UI state
  const [products, setProducts] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<"size" | "availability" | "price" | "sort">("size");
  const [totalPages, setTotalPages] = useState(1);
  const limit = 12;

  // Temp state for mobile filter drawer
  const [tempSizes, setTempSizes] = useState<string[]>([]);
  const [tempInStock, setTempInStock] = useState<boolean>(false);
  const [tempMinPrice, setTempMinPrice] = useState<number>(0);
  const [tempMaxPrice, setTempMaxPrice] = useState<number>(10000);
  const [tempSort, setTempSort] = useState<string>("newest");

  useEffect(() => {
    if (showFilters) {
      setTempSizes(selectedSizes);
      setTempInStock(inStockOnly);
      setTempMinPrice(minPrice);
      setTempMaxPrice(maxPrice);
      setTempSort(sort);
    }
  }, [showFilters, selectedSizes, inStockOnly, minPrice, maxPrice, sort]);

  const debouncedMinPrice = useDebounce(minPrice, 500);
  const debouncedMaxPrice = useDebounce(maxPrice, 500);

  const updateParams = (updates: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      params.delete(key);
      if (value !== null && value !== "") {
        if (Array.isArray(value)) value.forEach(v => params.append(key, v));
        else params.set(key, value);
      }
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setPage = (p: number) => updateParams({ page: String(p) });
  const setSort = (s: string) => updateParams({ sort: s, page: "1" });
  
  const toggleSize = (size: string) => {
    const nextSizes = selectedSizes.includes(size)
      ? selectedSizes.filter(s => s !== size)
      : [...selectedSizes, size];
    updateParams({ sizes: nextSizes, page: "1" });
  };
  
  const toggleTempSize = (size: string) => {
    setTempSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  };

  const setInStockOnly = (v: boolean) => updateParams({ inStock: v ? "true" : null, page: "1" });

  const applyMobileFilters = () => {
    setMinPrice(tempMinPrice);
    setMaxPrice(tempMaxPrice);
    updateParams({
      sizes: tempSizes,
      inStock: tempInStock ? "true" : null,
      sort: tempSort,
      minPrice: tempMinPrice > 0 ? String(tempMinPrice) : null,
      maxPrice: tempMaxPrice < 10000 ? String(tempMaxPrice) : null,
      page: "1"
    });
    setShowFilters(false);
  };

  const clearAllFilters = () => {
    setMinPrice(0);
    setMaxPrice(10000);
    updateParams({ sizes: [], tags: [], inStock: null, combo: null, minPrice: null, maxPrice: null, page: "1" });
  };

  const clearFilter = (key: string, value?: string) => {
    if (key === 'size' && value) {
      updateParams({ sizes: selectedSizes.filter(s => s !== value), page: "1" });
    } else if (key === 'tag' && value) {
      updateParams({ tags: selectedTags.filter(t => t !== value), page: "1" });
    } else if (key === 'inStock') {
      updateParams({ inStock: null, page: "1" });
    } else if (key === 'price') {
      setMinPrice(0);
      setMaxPrice(10000);
      updateParams({ minPrice: null, maxPrice: null, page: "1" });
    }
  };

  const priceInitialized = useRef(false);
  useEffect(() => {
    if (!priceInitialized.current) { priceInitialized.current = true; return; }
    // Skip if mobile filters are open to prevent background jumps
    if (showFilters) return;
    const urlMin = Number(searchParams.get("minPrice") || "0");
    const urlMax = Number(searchParams.get("maxPrice") || "10000");
    if (debouncedMinPrice === urlMin && debouncedMaxPrice === urlMax) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedMinPrice > 0) params.set("minPrice", String(debouncedMinPrice));
    else params.delete("minPrice");
    if (debouncedMaxPrice < 10000) params.set("maxPrice", String(debouncedMaxPrice));
    else params.delete("maxPrice");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedMinPrice, debouncedMaxPrice, showFilters]);

  useEffect(() => { fetchCollections(); }, []);
  useEffect(() => { fetchProducts(); }, [decodedHandle, searchParams]);

  const fetchCollections = async () => {
    try {
      const [colData, themeDataRes] = await Promise.all([
        safeFetch("/products/collections", { retries: 3, timeoutMs: 8000 }),
        safeFetch("/cms/theme", { retries: 2, timeoutMs: 5000 })
      ]);
      const data = colData.data || [];
      const rawTheme = themeDataRes.data || {};
      const themeData = rawTheme.config || rawTheme;
      let validCollections = Array.isArray(data) ? data.filter((c: any) => !c.isVirtual) : [];
      if (themeData.headerCollections && Array.isArray(themeData.headerCollections) && themeData.headerCollections.length > 0) {
        validCollections = themeData.headerCollections.map((h: string) => validCollections.find((c: any) => c.handle === h)).filter(Boolean);
      }
      setCollections(validCollections);
    } catch (error) {
      console.error("Error fetching collections:", error);
    }
  };

  const fetchProducts = async () => {
    if (page === 1) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const urlMinPrice = Number(searchParams.get("minPrice") || "0");
      const urlMaxPrice = Number(searchParams.get("maxPrice") || "10000");

      const query = new URLSearchParams({
        collection: decodedHandle,
        sort,
        page: String(page),
        limit: String(limit),
        returnMeta: "true",
      });
      if (urlMinPrice > 0) query.append("minPrice", String(urlMinPrice));
      if (urlMaxPrice < 10000) query.append("maxPrice", String(urlMaxPrice));
      selectedTags.forEach(t => query.append("tags", t));
      selectedSizes.forEach(s => query.append("sizes", s));
      if (inStockOnly) query.append("inStock", "true");
      if (showCombo) query.append("combo", "true");

      const { data, error } = await safeFetch(`/products?${query.toString()}`, { retries: 3, timeoutMs: 10000 });
      
      if (error) {
         setProducts(page === 1 ? [] : prev => prev);
         if (page === 1) setTotalPages(1);
         return;
      }

      if (data && data.data && data.meta) {
        setProducts(prev => page === 1 ? data.data : [...prev, ...data.data]);
        setTotalPages(data.meta.totalPages);
      } else {
        const arr = Array.isArray(data) ? data : [];
        setProducts(prev => page === 1 ? arr : [...prev, ...arr]);
        if (page === 1) setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      if (page === 1) setProducts([]);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      if (page === 1) window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const displayTitle = decodedHandle === "all"
    ? "All Collections"
    : decodedHandle.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const hasActiveFilters = selectedSizes.length > 0 || selectedTags.length > 0 || inStockOnly || minPrice > 0 || maxPrice < 10000;

  return (
    <div className="bg-theme-bg min-h-screen">
      {/* Header */}
      <div className="pt-[140px] md:pt-[120px] pb-16 px-6 md:px-12 text-center max-w-4xl mx-auto border-b border-theme-border/10">
        <div className="flex justify-center mb-4">
          <Breadcrumb items={[
            { label: "Home", href: "/" },
            { label: "Collections", href: "/collections/all" },
            { label: displayTitle, href: `/collections/${decodedHandle}` },
          ]} />
        </div>
        <h1 className="text-4xl md:text-7xl font-serif text-theme-text mb-6 tracking-tight">{displayTitle}</h1>
        <p className="text-theme-text/80 font-sans tracking-wide leading-relaxed text-sm md:text-lg max-w-2xl mx-auto">
          Refined aesthetics and traditional craftsmanship. Discover our Must-Have Picks from our luxury {displayTitle.toLowerCase()} designed for modern elegance and timeless grace.
        </p>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-12 flex flex-col lg:flex-row gap-12">
        {/* Left Sidebar: Categories & Filters (Desktop) */}
        <aside className="hidden lg:block w-72 shrink-0 space-y-12 sticky top-32 h-fit overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar pb-12">
           {/* Categories Section (Always open) */}
           <div className="space-y-6">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Categories</h3>
              <div className="space-y-3">
                 <Link
                   href={`/collections/all?${searchParams.toString()}`}
                   className={`block text-[11px] font-bold uppercase tracking-widest transition-colors ${handle === 'all' ? 'text-wine' : 'text-theme-text/80 hover:text-theme-text'}`}
                 >
                   All Collections
                 </Link>
                 {collections.map(col => (
                   <Link
                     key={col.id}
                     href={`/collections/${col.handle}?${searchParams.toString()}`}
                     className={`block text-[11px] font-bold uppercase tracking-widest transition-colors ${handle === col.handle ? 'text-wine' : 'text-theme-text/80 hover:text-theme-text'}`}
                   >
                     {col.title} <span className="opacity-40 ml-1">({col._count?.products || 0})</span>
                   </Link>
                 ))}
              </div>
           </div>

           {/* Price Accordion */}
           <details className="group border-t border-theme-border/10 pt-6" open>
              <summary className="flex justify-between items-center cursor-pointer list-none outline-none">
                 <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Price Range</h3>
                 <ChevronDown size={14} className="text-theme-text/80 transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-4 pt-6">
                 <input type="range" min="0" max="10000" step="100" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-wine h-1 bg-theme-border rounded-lg appearance-none cursor-pointer" />
                 <div className="flex items-center gap-4">
                    <div className="flex-1">
                       <label className="text-[9px] uppercase tracking-widest text-theme-text/80 mb-1 block">Min (₹)</label>
                       <input type="number" min="0" max={maxPrice} value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} className="w-full bg-transparent border border-theme-border/20 rounded text-[11px] p-2 outline-none focus:border-wine" />
                    </div>
                    <div className="flex-1">
                       <label className="text-[9px] uppercase tracking-widest text-theme-text/80 mb-1 block">Max (₹)</label>
                       <input type="number" min={minPrice} max="10000" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full bg-transparent border border-theme-border/20 rounded text-[11px] p-2 outline-none focus:border-wine" />
                    </div>
                 </div>
              </div>
           </details>

           {/* Size Accordion */}
           <details className="group border-t border-theme-border/10 pt-6" open>
              <summary className="flex justify-between items-center cursor-pointer list-none outline-none">
                 <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Size</h3>
                 <ChevronDown size={14} className="text-theme-text/80 transition-transform group-open:rotate-180" />
              </summary>
              <div className="flex flex-wrap gap-2 pt-6">
                 {["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"].map(size => (
                   <button
                     key={size}
                     onClick={() => toggleSize(size)}
                     className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${selectedSizes.includes(size) ? 'bg-theme-text text-theme-bg border-theme-text' : 'border-theme-border text-theme-text/80 hover:border-wine hover:text-wine'}`}
                   >
                      {size}
                   </button>
                 ))}
              </div>
           </details>

           {/* Availability Accordion */}
           <details className="group border-t border-theme-border/10 pt-6" open>
              <summary className="flex justify-between items-center cursor-pointer list-none outline-none">
                 <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Availability</h3>
                 <ChevronDown size={14} className="text-theme-text/80 transition-transform group-open:rotate-180" />
              </summary>
              <div className="flex flex-col gap-4 mt-6">
                 <label className="flex items-center gap-3 cursor-pointer group">
                   <input type="checkbox" className="w-4 h-4 cursor-pointer accent-wine" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                   <span className="text-[10px] font-bold text-theme-text/80 group-hover:text-theme-text uppercase tracking-widest">In Stock Only</span>
                 </label>
              </div>
           </details>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 w-full max-w-full overflow-hidden">
          {/* Mobile Actions: Refine & Sort */}
          <div className="lg:hidden flex flex-col gap-4 mb-6">
             <div className="flex items-center justify-between border-b border-theme-border/10 pb-4">
                 <button onClick={() => setShowFilters(true)} className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold text-primary py-2 border-r border-theme-border/10">
                   <Filter size={14} /> Refine
                 </button>
                 <div className="flex-1 flex items-center justify-center relative">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    >
                       <option value="newest">Newest</option>
                       <option value="price_asc">Price Low-High</option>
                       <option value="price_desc">Price High-Low</option>
                       <option value="alphabetical">A → Z</option>
                    </select>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-primary pointer-events-none">
                       <SlidersHorizontal size={14} /> 
                       {sort === 'newest' ? 'Newest' : sort === 'price_asc' ? 'Low-High' : sort === 'price_desc' ? 'High-Low' : 'A-Z'}
                    </div>
                 </div>
             </div>
          </div>

          {/* Sort (Desktop Only) */}
          <div className="hidden lg:flex justify-between items-center mb-8">
             <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-theme-text/80">
                Showing {products.length} products
             </div>
             <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold">
                <span className="opacity-40">Arrange by:</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent text-theme-text outline-none cursor-pointer border-b border-theme-border/10 pb-1">
                   <option value="newest">Newest First</option>
                   <option value="price_asc">Price: Low to High</option>
                   <option value="price_desc">Price: High to Low</option>
                   <option value="alphabetical">A → Z</option>
                </select>
             </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
             <div className="flex flex-wrap items-center gap-2 mb-8">
                <span className="text-[10px] uppercase font-bold text-theme-text/80 mr-2">Active:</span>
                {selectedSizes.map(size => (
                  <span key={size} className="inline-flex items-center gap-1 px-3 py-1 bg-theme-border/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary">
                    Size: {size} <button onClick={() => clearFilter('size', size)} className="hover:text-wine ml-1"><X size={12} /></button>
                  </span>
                ))}
                {inStockOnly && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-theme-border/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary">
                    In Stock <button onClick={() => clearFilter('inStock')} className="hover:text-wine ml-1"><X size={12} /></button>
                  </span>
                )}
                {(minPrice > 0 || maxPrice < 10000) && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-theme-border/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary">
                    ₹{minPrice} - ₹{maxPrice} <button onClick={() => clearFilter('price')} className="hover:text-wine ml-1"><X size={12} /></button>
                  </span>
                )}
                <button onClick={clearAllFilters} className="text-[10px] font-bold uppercase tracking-widest underline ml-2 text-theme-text/80 hover:text-wine">Clear All</button>
             </div>
          )}

          {/* Product Grid */}
          <div className="min-h-[400px]">
            {isLoading && page === 1 ? (
              <div className="py-32 flex flex-col items-center justify-center gap-4">
                 <Loader2 className="animate-spin text-wine" size={32} />
                 <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-theme-text/80">Hydrating the lookbook...</p>
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-8 md:gap-y-12">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={{
                      id: product.id,
                      handle: product.handle,
                      title: product.title,
                      price: product.variants?.[0]?.price || '0',
                      compareAtPrice: product.variants?.[0]?.mrp,
                      mrp: product.mrp,
                      imageUrl: getAssetUrl(product.images?.[0]?.url) || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b',
                      category: product.category || product.type,
                      variants: product.variants
                    }} />
                  ))}
                </div>

                {/* Load More Button */}
                {page < totalPages && (
                  <div className="mt-16 flex justify-center border-t border-theme-border/10 pt-12">
                     <button
                       onClick={() => setPage(page + 1)}
                       disabled={isLoadingMore}
                       className="px-12 py-4 border border-theme-border rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-wine hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                     >
                       {isLoadingMore ? <><Loader2 size={14} className="animate-spin" /> Loading...</> : "Load More Products"}
                     </button>
                  </div>
                )}
              </>
            ) : (
              <div className="py-32 text-center space-y-4">
                 <div className="w-16 h-16 bg-theme-text/5 rounded-full flex items-center justify-center mx-auto text-theme-text/80">
                    <ShoppingBag size={24} />
                 </div>
                 <p className="text-[11px] uppercase font-bold text-theme-text/80 tracking-widest">No products found matching criteria</p>
                 <button onClick={clearAllFilters} className="text-primary text-[10px] uppercase font-bold border-b border-primary pb-0.5">Reset Filters</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Sidebar Drawer */}
      <AnimatePresence>
        {showFilters && (
          <div className="fixed inset-0 z-[100] flex items-end">
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full h-[85vh] bg-theme-surface rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 pb-4 border-b border-theme-border/10 bg-theme-surface z-20">
                 <h2 className="text-xl font-bold font-serif text-theme-text">Filters</h2>
                 <button onClick={() => setShowFilters(false)} className="p-2 bg-theme-bg rounded-full text-theme-text/80 hover:text-wine hover:bg-wine/10 transition-colors"><X size={18} /></button>
              </div>

              {/* Split Body */}
              <div className="flex flex-1 overflow-hidden bg-theme-surface">
                 {/* Left Tabs */}
                 <div className="w-[35%] bg-theme-bg border-r border-theme-border/10 overflow-y-auto">
                    {[
                      { id: "size", label: "Size" },
                      { id: "availability", label: "Stock" },
                      { id: "price", label: "Price" },
                      { id: "sort", label: "Sort" }
                    ].map(tab => (
                       <button
                         key={tab.id}
                         onClick={() => setActiveFilterTab(tab.id as any)}
                         className={`w-full text-left px-3 py-5 text-[11px] uppercase tracking-wider font-bold transition-colors border-l-4 ${activeFilterTab === tab.id ? 'bg-wine/5 border-wine text-wine' : 'border-transparent text-theme-text/80 hover:bg-theme-bg/80 hover:text-theme-text'}`}
                       >
                         {tab.label}
                         {tab.id === 'size' && tempSizes.length > 0 && <span className="inline-block w-2 h-2 rounded-full bg-wine ml-2" />}
                         {tab.id === 'availability' && tempInStock && <span className="inline-block w-2 h-2 rounded-full bg-wine ml-2" />}
                         {tab.id === 'price' && (tempMaxPrice < 10000 || tempMinPrice > 0) && <span className="inline-block w-2 h-2 rounded-full bg-wine ml-2" />}
                       </button>
                    ))}
                 </div>

                 {/* Right Content */}
                 <div className="w-[65%] p-6 overflow-y-auto custom-scrollbar">
                    {activeFilterTab === "sort" && (
                       <div className="flex flex-col gap-4">
                          {[
                            { value: "newest", label: "Newest First" },
                            { value: "price_asc", label: "Price: Low to High" },
                            { value: "price_desc", label: "Price: High to Low" },
                            { value: "alphabetical", label: "Alphabetical A-Z" }
                          ].map(s => (
                            <label key={s.value} className="flex items-center gap-3 cursor-pointer group py-2">
                              <input type="radio" name="sort" className="w-4 h-4 cursor-pointer accent-wine" checked={tempSort === s.value} onChange={() => setTempSort(s.value)} />
                              <span className={`text-xs font-bold ${tempSort === s.value ? 'text-wine' : 'text-theme-text'}`}>{s.label}</span>
                            </label>
                          ))}
                       </div>
                    )}

                    {activeFilterTab === "size" && (
                       <div className="flex flex-col gap-4">
                          {["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"].map(size => (
                            <label key={size} className="flex items-center gap-3 cursor-pointer group py-2">
                              <input type="checkbox" className="w-4 h-4 cursor-pointer accent-wine" checked={tempSizes.includes(size)} onChange={() => toggleTempSize(size)} />
                              <span className={`text-xs font-bold ${tempSizes.includes(size) ? 'text-wine' : 'text-theme-text'}`}>{size}</span>
                            </label>
                          ))}
                       </div>
                    )}

                    {activeFilterTab === "availability" && (
                       <div className="flex flex-col gap-4">
                          <label className="flex items-center gap-3 cursor-pointer group py-2">
                            <input type="checkbox" className="w-4 h-4 cursor-pointer accent-wine" checked={tempInStock} onChange={(e) => setTempInStock(e.target.checked)} />
                            <span className={`text-xs font-bold ${tempInStock ? 'text-wine' : 'text-theme-text'}`}>In Stock Only</span>
                          </label>
                       </div>
                    )}

                    {activeFilterTab === "price" && (
                       <div className="space-y-6 pt-4">
                          <div className="text-center pb-4">
                             <span className="text-lg font-bold font-serif text-wine">₹{tempMinPrice.toLocaleString()} - ₹{tempMaxPrice.toLocaleString()}</span>
                          </div>
                          <input type="range" min="0" max="10000" step="100" value={tempMaxPrice} onChange={(e) => setTempMaxPrice(Number(e.target.value))} className="w-full accent-wine h-2 bg-theme-border rounded-lg appearance-none cursor-pointer" />
                          <div className="flex items-center gap-4 mt-6">
                            <div className="flex-1">
                              <label className="text-[10px] uppercase tracking-widest text-theme-text/80 mb-2 block">Min (₹)</label>
                              <input type="number" min="0" max={tempMaxPrice} value={tempMinPrice} onChange={(e) => setTempMinPrice(Number(e.target.value))} className="w-full bg-theme-bg border border-theme-border/20 rounded-lg text-sm p-3 outline-none focus:border-wine" />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] uppercase tracking-widest text-theme-text/80 mb-2 block">Max (₹)</label>
                              <input type="number" min={tempMinPrice} max="10000" value={tempMaxPrice} onChange={(e) => setTempMaxPrice(Number(e.target.value))} className="w-full bg-theme-bg border border-theme-border/20 rounded-lg text-sm p-3 outline-none focus:border-wine" />
                            </div>
                          </div>
                       </div>
                    )}
                 </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="p-4 pb-12 border-t border-theme-border/10 bg-theme-surface z-20 flex gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                 <button onClick={() => { setTempSizes([]); setTempInStock(false); setTempMinPrice(0); setTempMaxPrice(10000); setTempSort("newest"); }} className="flex-1 bg-white border border-theme-border text-wine py-4 text-xs font-bold hover:bg-theme-bg transition-all rounded-xl shadow-sm">
                    Clear
                 </button>
                 <button onClick={applyMobileFilters} className="flex-[1.5] bg-wine text-white py-4 text-xs font-bold hover:bg-wine/90 transition-all rounded-xl shadow-lg">
                    Show Products
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CollectionPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = React.use(params);
  return (
    <Suspense>
      <CollectionPageContent handle={handle} />
    </Suspense>
  );
}
