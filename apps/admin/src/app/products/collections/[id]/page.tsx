"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft,
  Search, 
  Plus, 
  Trash2,
  Loader2,
  Image as ImageIcon,
  Check,
  X,
  Edit2
} from "lucide-react";
import Link from "next/link";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function CollectionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAdminAuth();
  const [collection, setCollection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  
  // Advanced filters and infinite scroll
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");

  const toggleTableSelection = (id: string) => {
    const newSet = new Set(selectedTableIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTableIds(newSet);
  };

  const handleSelectAllTable = (checked: boolean) => {
    if (checked && collection?.products) {
      setSelectedTableIds(new Set(collection.products.map((p: any) => p.id)));
    } else {
      setSelectedTableIds(new Set());
    }
  };

  useEffect(() => {
    if (token && params.id) loadCollection();
  }, [token, params.id]);

  async function loadCollection() {
    setLoading(true);
    try {
      const apiBase = (API_BASE).replace(/\/api\/v1\/?$/, '') + '/api/v1';
      const res = await fetch(`${apiBase}/products/collections/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setCollection(data);
      }
    } catch (err) {
      console.error("Failed to load collection details:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle new searches and filter changes
  useEffect(() => {
    if (!isSearchModalOpen) return;
    
    // Reset state for new search
    setPage(1);
    setHasMore(true);
    setSearchResults([]);
    
    const delay = setTimeout(() => {
      fetchProducts(1, true);
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery, inStockOnly, filterCategory, isSearchModalOpen]);

  // Handle pagination loading
  useEffect(() => {
    if (!isSearchModalOpen || page === 1) return;
    fetchProducts(page, false);
  }, [page]);

  async function fetchProducts(currentPage: number, isNewSearch: boolean) {
    if (!hasMore && !isNewSearch) return;
    
    setSearching(true);
    try {
      const apiBase = (API_BASE).replace(/\/api\/v1\/?$/, '') + '/api/v1';
      const url = new URL(`${apiBase}/products`);
      url.searchParams.append('adminMode', 'true');
      url.searchParams.append('limit', '50');
      url.searchParams.append('page', currentPage.toString());
      if (searchQuery) url.searchParams.append('search', searchQuery);
      if (inStockOnly) url.searchParams.append('inStock', 'true');
      if (filterCategory !== 'all') url.searchParams.append('type', filterCategory);
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const productsArray = Array.isArray(data) ? data : (data.data || data.products || []);
        
        // Filter out products already in the collection
        const existingIds = new Set(collection?.products?.map((p: any) => p.id) || []);
        const filtered = productsArray.filter((p: any) => !existingIds.has(p.id));
        
        if (isNewSearch) {
          setSearchResults(filtered);
        } else {
          setSearchResults(prev => {
            const newMap = new Map(prev.map(p => [p.id, p]));
            filtered.forEach((p: any) => newMap.set(p.id, p));
            return Array.from(newMap.values());
          });
        }
        
        setHasMore(productsArray.length >= 50);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && !searching && hasMore) {
      setPage(p => p + 1);
    }
  };

  const toggleProductSelection = (id: string) => {
    const newSet = new Set(selectedProductIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedProductIds(newSet);
  };

  const handleAddProducts = async () => {
    if (selectedProductIds.size === 0) return;
    setIsAdding(true);
    try {
      const apiBase = (API_BASE).replace(/\/api\/v1\/?$/, '') + '/api/v1';
      const res = await fetch(`${apiBase}/products/collections/${params.id}/products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ productIds: Array.from(selectedProductIds) })
      });

      if (res.ok) {
        setIsSearchModalOpen(false);
        setSelectedProductIds(new Set());
        loadCollection();
      }
    } catch (err) {
      alert("Failed to add products");
    } finally {
      setIsAdding(false);
    }
  };

  const handleBulkRemove = async () => {
    if (!confirm(`Remove ${selectedTableIds.size} products from this collection?`)) return;
    setIsAdding(true);
    try {
      const apiBase = (API_BASE).replace(/\/api\/v1\/?$/, '') + '/api/v1';
      const res = await fetch(`${apiBase}/products/bulk-action`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          action: 'remove_from_collection', 
          productIds: Array.from(selectedTableIds),
          data: { collectionId: params.id }
        })
      });

      if (res.ok) {
        setSelectedTableIds(new Set());
        loadCollection();
      } else {
        alert("Failed to remove products from collection");
      }
    } catch (err) {
      alert("Failed to remove products");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveProduct = async (productId: string, title: string) => {
    if (!confirm(`Remove "${title}" from this collection?`)) return;
    try {
      const apiBase = (API_BASE).replace(/\/api\/v1\/?$/, '') + '/api/v1';
      const res = await fetch(`${apiBase}/products/collections/${params.id}/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        loadCollection();
      }
    } catch (err) {
      alert("Failed to remove product");
    }
  };

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-wine" size={32} /></div>;
  }

  if (!collection) {
    return <div className="p-8 text-center text-gray-500">Collection not found</div>;
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <button 
        onClick={() => router.push('/products/collections')}
        className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-charcoal transition-colors"
      >
        <ArrowLeft size={16} /> Back to Collections
      </button>

      {/* Header */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm relative">
        <div className="h-48 bg-gradient-to-r from-wine/5 to-wine/10 relative">
          {collection.image && (
             <img src={collection.image} className="w-full h-full object-cover opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <h1 className="text-4xl font-bold text-white tracking-tight">{collection.title}</h1>
            <p className="text-gray-300 font-mono text-xs mt-2 uppercase tracking-widest">/{collection.handle}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center relative">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-charcoal">Products ({collection.products?.length || 0})</h2>
          {selectedTableIds.size > 0 && (
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-left-2">
              <span className="text-xs font-bold text-gray-500">{selectedTableIds.size} selected</span>
              <button 
                onClick={() => router.push(`/products/bulk-edit?ids=${Array.from(selectedTableIds).join(',')}`)}
                className="px-3 py-1.5 bg-white border border-gray-200 text-blue-700 rounded hover:bg-blue-50 shadow-sm text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Bulk Edit
              </button>
              <button 
                onClick={handleBulkRemove}
                disabled={isAdding}
                className="px-3 py-1.5 bg-red-50 border border-red-100 text-red-600 rounded hover:bg-red-100 shadow-sm text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isAdding ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Remove
              </button>
            </div>
          )}
        </div>
        <div className="relative">
          <button 
            onClick={() => { 
              if (!isSearchModalOpen) {
                setSearchQuery("");
                setSelectedProductIds(new Set());
              }
              setIsSearchModalOpen(!isSearchModalOpen);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-wine text-ivory rounded-xl text-sm font-bold shadow-lg shadow-wine/20 hover:bg-wine-dark transition-all"
          >
            {isSearchModalOpen ? <X size={18} /> : <Plus size={18} />} 
            {isSearchModalOpen ? "Close" : "Add Products"}
          </button>

          {/* Dropdown Multi-Select Search */}
          {isSearchModalOpen && (
            <div 
              className="absolute right-0 top-full mt-2 w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
              role="dialog"
              aria-label="Search and add products to collection"
            >
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} aria-hidden="true" />
                  <input 
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-wine/30 focus:ring-2 focus:ring-wine/10 transition-all outline-none"
                    autoFocus
                    aria-label="Search products"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-charcoal p-1 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Clear search"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
                
                {/* Advanced Filters */}
                <div className="flex items-center gap-4 mb-3 border-b border-gray-100 pb-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-600 hover:text-charcoal transition-colors">
                    <input 
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="w-4 h-4 rounded text-wine focus:ring-wine border-gray-300"
                    />
                    In Stock Only
                  </label>
                  <select 
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg text-xs py-1 px-2 focus:border-wine/30 outline-none flex-1 font-bold text-gray-600"
                  >
                    <option value="all">All Categories</option>
                    <option value="sarees">Sarees</option>
                    <option value="kurtis">Kurtis</option>
                    <option value="lehengas">Lehengas</option>
                    <option value="jewelry">Jewelry</option>
                  </select>
                </div>

                {!searching && searchResults.length > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-600 hover:text-charcoal transition-colors">
                    <input 
                      type="checkbox"
                      checked={selectedProductIds.size === searchResults.length && searchResults.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProductIds(new Set(searchResults.map(p => p.id)));
                        } else {
                          setSelectedProductIds(new Set());
                        }
                      }}
                      className="w-4 h-4 rounded text-wine focus:ring-wine border-gray-300"
                      aria-label={`Select all ${searchResults.length} matching products`}
                    />
                    Select All {searchResults.length} {searchQuery ? 'Matching' : ''} Products
                  </label>
                )}
              </div>

              <div 
                className="max-h-[300px] overflow-y-auto p-2"
                aria-live="polite"
                aria-busy={searching && page === 1}
                onScroll={handleScroll}
              >
                {searching && page === 1 ? (
                  <div className="flex h-24 items-center justify-center">
                    <Loader2 className="animate-spin text-wine" size={20} aria-label="Loading products" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-xs font-bold text-gray-400">
                    No matching products found.
                  </div>
                ) : (
                  <div className="space-y-1" role="listbox" aria-multiselectable="true">
                    {searchResults.map(p => {
                      const isSelected = selectedProductIds.has(p.id);
                      const mainImg = p.images?.sort((a: any, b: any) => a.position - b.position)[0]?.url;
                      return (
                        <div 
                          key={p.id}
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleProductSelection(p.id);
                            }
                          }}
                          onClick={() => toggleProductSelection(p.id)}
                          className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border outline-none focus-visible:ring-2 focus-visible:ring-wine/30 ${isSelected ? 'bg-wine/5 border-wine/30' : 'hover:bg-gray-50 border-transparent'}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-wine border-wine text-white' : 'border-gray-300'}`}>
                            {isSelected && <Check size={10} strokeWidth={3} aria-hidden="true" />}
                          </div>
                          <div className="w-8 h-8 bg-beige rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 flex items-center justify-center">
                            {mainImg ? <img src={mainImg} alt={p.title} className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <ImageIcon className="text-wine/40" size={14} aria-hidden="true" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-charcoal truncate">{p.title}</p>
                            <p className="text-[9px] font-mono text-gray-400 mt-0.5 truncate">{p.handle}</p>
                          </div>
                        </div>
                      );
                    })}
                    {searching && page > 1 && (
                      <div className="flex justify-center p-4">
                        <Loader2 className="animate-spin text-wine" size={16} />
                      </div>
                    )}
                  </div>
                )}
              </div>


              {selectedProductIds.size > 0 && (
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {selectedProductIds.size} Selected
                  </span>
                  <button 
                    onClick={handleAddProducts}
                    disabled={isAdding}
                    className="px-4 py-2 bg-wine text-ivory rounded-lg text-xs font-bold shadow-lg shadow-wine/20 hover:bg-wine-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAdding && <Loader2 className="animate-spin" size={14} />}
                    Add to Collection
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold border-b border-gray-100">
              <th className="px-6 py-4 w-12">
                <input 
                  type="checkbox"
                  checked={collection?.products?.length > 0 && selectedTableIds.size === collection.products.length}
                  onChange={(e) => handleSelectAllTable(e.target.checked)}
                  className="w-4 h-4 rounded text-wine focus:ring-wine border-gray-300"
                />
              </th>
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!collection.products || collection.products.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">No products in this collection.</td></tr>
            ) : collection.products.map((p: any) => {
               const mainImg = p.images?.sort((a: any, b: any) => a.position - b.position)[0]?.url;
               const stock = p.variants?.reduce((acc: number, v: any) => acc + (v.inventory || 0), 0) || 0;
               return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox"
                      checked={selectedTableIds.has(p.id)}
                      onChange={() => toggleTableSelection(p.id)}
                      className="w-4 h-4 rounded text-wine focus:ring-wine border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-beige rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100">
                         {mainImg ? <img src={mainImg} className="w-full h-full object-cover" /> : <ImageIcon className="text-wine/40" size={20} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-charcoal max-w-[300px] truncate">{p.title}</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-widest">{p.variants?.length || 0} Variants</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-600">
                    ₹{p.variants?.[0]?.sellingPrice || p.variants?.[0]?.price || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {stock > 0 ? `${stock} In Stock` : 'Out of Stock'}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/products/${p.id}`}
                          className="p-2 hover:bg-wine/5 rounded-lg text-gray-400 hover:text-wine transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 size={16} />
                        </Link>
                        <button 
                          onClick={() => handleRemoveProduct(p.id, p.title)}
                          className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove from Collection"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                  </td>
                </tr>
               )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
