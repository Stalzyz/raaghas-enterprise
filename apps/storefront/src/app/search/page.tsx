"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search as SearchIcon, X, SlidersHorizontal, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import Cookies from "js-cookie";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Query is persisted in URL so back button restores it
  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync input → URL (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) params.set("q", query);
      else params.delete("q");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch when URL query changes
  useEffect(() => {
    if (!urlQuery) { setResults([]); return; }
    const timer = setTimeout(() => { searchProducts(urlQuery); }, 200);
    return () => clearTimeout(timer);
  }, [urlQuery]);

  const searchProducts = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/products?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);

      // Meta Tracking
      const searchEventId = "evt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      import("@/components/analytics/MetaPixel").then((m) => {
        m.trackMetaEvent("Search", {
          search_string: q
        }, searchEventId);
      });
      fetch(API_URL + "/api/v1/marketing/capi/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "Search",
          metaEventId: searchEventId,
          contentIds: Array.isArray(data) ? data.slice(0, 10).map((p: any) => p.variants?.[0]?.id).filter(Boolean) : [],
          fbp: Cookies.get("_fbp"),
          fbc: Cookies.get("_fbc")
        })
      }).catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearQuery = () => {
    setQuery("");
    setResults([]);
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-theme-bg pb-32 pt-32 md:pt-44">
      {/* Search Header */}
      <div className="bg-theme-surface/80 backdrop-blur-xl sticky top-[100px] md:top-[120px] z-40 border-b border-theme-border">
        <div className="max-w-7xl mx-auto px-6 py-6 md:py-12">
          <div className="relative max-w-2xl mx-auto">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-theme-text-muted" size={24} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you looking for today?"
              className="w-full pl-16 pr-20 py-6 bg-theme-bg border border-theme-border rounded-[2.5rem] text-xl font-serif text-theme-text outline-none focus:ring-4 focus:ring-wine/5 transition-all placeholder:text-theme-text-muted"
            />
            {query && (
              <button
                onClick={clearQuery}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-theme-bg rounded-full text-theme-text-muted shadow-sm"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="animate-spin text-wine" size={40} />
            <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-theme-text-muted">Searching our archives...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-12">
            <div className="flex justify-between items-end">
              <h2 className="text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">
                Displaying {results.length} Treasures
              </h2>
              <button className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-theme-text">
                <SlidersHorizontal size={14} /> Refine
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
              {results.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.handle}`}
                  className="group space-y-4"
                >
                  <div className="aspect-[3/4] bg-theme-surface rounded-[2rem] overflow-hidden border border-theme-border relative shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:-translate-y-2">
                    <img
                      src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800'}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                    <div className="absolute top-4 right-4 px-3 py-1 bg-theme-surface/90 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-widest text-wine opacity-0 group-hover:opacity-100 transition-opacity">
                      View Details
                    </div>
                  </div>
                  <div className="text-center space-y-1 px-2">
                    <h3 className="text-sm font-bold tracking-widest uppercase text-theme-text line-clamp-1 group-hover:text-wine transition-colors">{product.title}</h3>
                    <p className="text-sm font-serif italic text-theme-text-muted">₹{product.variants?.[0]?.price ? Number(product.variants[0].price).toLocaleString() : "Price on Request"}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : query ? (
          <div className="text-center py-32 space-y-6">
            <div className="w-20 h-20 bg-theme-text/5 rounded-full flex items-center justify-center mx-auto text-theme-text-muted">
              <SearchIcon size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-serif text-theme-text">We couldn't find "{query}"</h2>
              <p className="text-sm text-theme-text-muted max-w-xs mx-auto">Try a different keyword or explore our new arrivals.</p>
            </div>
            <Link href="/collections/new-arrivals" className="inline-flex items-center gap-2 bg-theme-text text-theme-bg px-8 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl">
              Explore New Arrivals <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-16 py-12">
            <div className="space-y-8">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-theme-text-muted text-center">Trending Searches</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {["Kurti", "Salwar", "Under 500", "Combo", "Office Wear", "Kalamkari"].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-6 py-3 bg-theme-surface border border-theme-border rounded-full text-xs font-bold text-theme-text hover:bg-wine hover:text-white hover:border-wine transition-all shadow-sm"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
               <Link href="/collections/silk-edit" className="group relative aspect-video rounded-3xl overflow-hidden shadow-lg">
                  <img src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                     <span className="text-white text-[10px] font-bold uppercase tracking-widest">Silk Collection</span>
                  </div>
               </Link>
               <Link href="/collections/new-arrivals" className="group relative aspect-video rounded-3xl overflow-hidden shadow-lg">
                  <img src="https://images.unsplash.com/photo-1610030469617-64906f30d075" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                     <span className="text-white text-[10px] font-bold uppercase tracking-widest">Luxury Archive</span>
                  </div>
               </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  );
}
