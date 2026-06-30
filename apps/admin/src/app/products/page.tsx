"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Package, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  FileSpreadsheet,
  X,
  Sparkles,
  Check
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function ProductManagement() {
  const { token } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [replaceCollections, setReplaceCollections] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc'>('newest');
  const [selectAllInventory, setSelectAllInventory] = useState(false);
  const [isSettingTax, setIsSettingTax] = useState(false);

  const currentPage = Number(searchParams.get("page") || "1");
  const setCurrentPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const itemsPerPage = 50;

  useEffect(() => {
    async function loadProducts() {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005/api/v1' : 'https://api.raaghas.in/api/v1')}/products?adminMode=true&limit=2000`, {
          headers,
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setProducts(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [token]);

  useEffect(() => {
    async function loadCollections() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005/api/v1' : 'https://api.raaghas.in/api/v1')}/products/collections`);
        if (res.ok) {
          setCollections(await res.json());
        }
      } catch (e) {}
    }
    loadCollections();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);


  const handleFileUpload = async () => {
    if (!importFile) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005/api/v1' : 'https://api.raaghas.in/api/v1');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/products/bulk-upload`, {
        method: "POST",
        headers,
        credentials: 'include', // Send admin_token cookie as auth fallback
        body: formData,
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        const msg = resData.summary
          ? `Import complete! ✅ ${resData.summary.success} created, ${resData.summary.updated} updated, ${resData.summary.failed} failed.`
          : 'Import successful!';
        alert(msg);
        setShowImportModal(false);
        window.location.reload();
      } else {
        if (res.status === 401) {
          alert('Session expired. Please refresh the page and try again.');
        } else {
          alert(`Import failed: ${resData.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error("Import failed:", err);
      alert("Network error during import. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleBulkAction = async (action: string, data?: any) => {
    if (selectedIds.length === 0) return;
    
    if (action === 'export') {
       handleExportCSV(selectedIds);
       return;
    }

    if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) return;
    
    setIsBulkLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005/api/v1' : 'https://api.raaghas.in/api/v1');
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}/products/bulk-action`, {
        method: "POST",
        headers,
        credentials: 'include',
        body: JSON.stringify({ action, productIds: selectedIds, data }),
      });

      if (res.ok) {
        const responseData = await res.json();
        if (responseData.message) alert(responseData.message);
        setSelectedIds([]);
        window.location.reload();
      } else {
        alert('Bulk action failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error performing bulk action');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleSetDefaultTax = async () => {
    if (!confirm("This will set taxRate = 5% and taxInclusive = true for ALL products. Continue?")) return;
    setIsSettingTax(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005/api/v1' : 'https://api.raaghas.in/api/v1');
      const res = await fetch(`${baseUrl}/products/set-default-tax`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ taxRate: 5 })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Done! Updated ${data.updated} products to 5% GST.`);
      } else {
        alert("Failed to update tax rates.");
      }
    } catch (err) {
      alert("Error updating tax rates.");
    } finally {
      setIsSettingTax(false);
    }
  };

  const handleExportCSV = (ids?: string[]) => {
    // If global selection is on, use all filtered products. Otherwise use selected or visible.
    const productsToExport = selectAllInventory 
      ? filteredProducts 
      : (ids ? formattedProducts.filter(p => ids.includes(p.id)) : filteredProducts);

    if (productsToExport.length === 0) {
      alert("No products to export");
      return;
    }

    const headers = [
      "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Tags", "Published",
      "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value", "Option3 Name", "Option3 Value",
      "Variant SKU", "Variant Inventory Qty", "Variant Price", "Variant Compare At Price",
      "Image Src", "Image Position", "Status", "Product_ID"
    ];

    const rows = productsToExport.flatMap(p => {
       const vCount = p.variants ? p.variants.length : 0;
       const iCount = p.images ? p.images.length : 0;
       const rowCount = Math.max(1, Math.max(vCount, iCount));
       const pRows = [];

       for (let i = 0; i < rowCount; i++) {
          const v = p.variants?.[i];
          const img = p.images?.[i];
          const isFirstRow = i === 0;

          pRows.push([
             `"${p.handle || ''}"`,
             isFirstRow ? `"${p.name.replace(/"/g, '""')}"` : `""`,
             isFirstRow ? `"${(p.description || '').replace(/"/g, '""')}"` : `""`,
             isFirstRow ? `"${(p.vendor || 'Raaghas').replace(/"/g, '""')}"` : `""`,
             isFirstRow ? `"${(p.category || '').replace(/"/g, '""')}"` : `""`,
             isFirstRow ? `"${(p.tags || '').replace(/"/g, '""')}"` : `""`,
             isFirstRow ? (p.status === 'Draft' ? "FALSE" : "TRUE") : `""`,
             v ? `"Size"` : `""`,
             v ? `"${(v.option1Value || '').replace(/"/g, '""')}"` : `""`,
             v ? `"Color"` : `""`,
             v ? `"${(v.option2Value || '').replace(/"/g, '""')}"` : `""`,
             v ? `""` : `""`,
             v ? `"${(v.option3Value || '').replace(/"/g, '""')}"` : `""`,
             v ? `"${(v.sku || '').replace(/"/g, '""')}"` : `""`,
             v ? (v.inventory || 0) : `""`,
             v ? (v.price || 0) : `""`,
             v ? (v.compareAtPrice || "") : `""`,
             img ? `"${img.url || ''}"` : `""`,
             img ? (img.position || i + 1) : `""`,
             isFirstRow ? `"${p.status}"` : `""`,
             isFirstRow ? p.id : `""`
          ]);
       }
       return pRows;
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `raaghas_products_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  let lowStockCount = 0;
  let outOfStockCount = 0;
  // Collect all unique categories directly from p.category field
  const activeCategories = new Set<string>();

  const formattedProducts = products.map((p: any) => {
    // FIX: Use p.category directly — this is the actual product category field
    // Collections are marketing groupings, not the product category
    const category = p.category && p.category !== 'Uncategorized' ? p.category : (p.productType || p.collections?.[0]?.title || 'General');
    if (category && category !== 'General') activeCategories.add(category);
    
    const stock = p.variants?.reduce((sum: number, v: any) => sum + (v.inventory || 0), 0) || 0;
    
    if (stock === 0) outOfStockCount++;
    else if (stock < 20) lowStockCount++;

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in')).replace('/api/v1', '');
    const rawImageUrl = p.images?.[0]?.url || '';
    const imageUrl = rawImageUrl
      ? (rawImageUrl.startsWith('http') ? rawImageUrl : `${apiBase}${rawImageUrl}`)
      : 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=100&h=150';

    return {
      id: p.id,
      name: p.title,
      handle: p.handle,
      description: p.description || "",
      sizeGuide: p.sizeGuideId || "",
      sku: p.variants?.[0]?.sku || "No SKU",
      priceNum: p.variants?.[0]?.price ? Number(p.variants[0].price) : 0,
      price: p.variants?.[0]?.price ? `₹${p.variants[0].price}` : "N/A",
      stock,
      status: !p.published ? "Draft" : stock === 0 ? "Out of Stock" : stock < 20 ? "Low Stock" : "Active",
      category,
      createdAt: p.createdAt || '',
      subCategory: p.subCategory || "N/A",
      fabric: p.fabric || "N/A",
      image: imageUrl,
      variants: p.variants || [],
      images: p.images || [],
      tags: p.tags || "",
      vendor: p.vendor || "Raaghas"
    };
  });

  // Filter Logic
  const filteredProducts = formattedProducts
    .filter(p => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.handle.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
      const matchesStatus = statusFilter === "ALL" || p.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesCategory = categoryFilter === "ALL" || p.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    })
    // Client-side sort based on selected sort order
    .sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOrder === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOrder === 'price_asc') return a.priceNum - b.priceNum;
      if (sortOrder === 'price_desc') return b.priceNum - a.priceNum;
      return 0;
    });

  const totalProductsCount = filteredProducts.length;
  const totalPages = Math.ceil(totalProductsCount / itemsPerPage);
  
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedProducts.length) {
      setSelectedIds([]);
      setSelectAllInventory(false);
    } else {
      setSelectedIds(paginatedProducts.map((p: any) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Product Inventory</h2>
          <p className="text-gray-500 font-medium font-sans text-sm">Manage your collections, variants, and stock levels.</p>
        </div>
         <div className="flex gap-4">
            <Link 
              href="/products/import"
              className="flex items-center gap-2 px-6 py-2 bg-charcoal text-ivory rounded-lg text-sm font-bold shadow-lg shadow-charcoal/20 hover:bg-wine transition-all"
            >
               <Sparkles size={18} className="text-ivory" /> Smart AI Import
            </Link>
            <button 
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-200 text-charcoal rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-all"
            >
               <UploadCloud size={18} /> Import CSV
            </button>
            <button
              onClick={() => handleExportCSV(selectedIds.length > 0 ? selectedIds : undefined)}
              className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-200 text-charcoal rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-all"
            >
               <FileSpreadsheet size={18} /> Export CSV
            </button>
            <button
              onClick={handleSetDefaultTax}
              disabled={isSettingTax}
              className="flex items-center gap-2 px-6 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg text-sm font-bold shadow-sm hover:bg-amber-50 transition-all disabled:opacity-50"
              title="Set 5% GST on all products"
            >
               {isSettingTax ? "Updating..." : "Set 5% GST (All)"}
            </button>
            <Link 
              href="/products/new"
              className="flex items-center gap-2 px-6 py-2 bg-wine text-ivory rounded-lg text-sm font-bold shadow-lg shadow-wine/20 hover:bg-wine-dark transition-all"
            >
               <Plus size={18} /> Add New Product
            </Link>
         </div>
      </div>

       {/* Stats Grid for Inventory */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <InventoryStat label="Total Products" value={totalProductsCount} />
          <InventoryStat label="Low Stock Items" value={lowStockCount} warning />
          <InventoryStat label="Out of Stock" value={outOfStockCount} danger />
          <InventoryStat label="Active Categories" value={activeCategories.size} />
       </div>

      {/* Selection Banner (Global Select All) */}
      {selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0 && totalProductsCount > paginatedProducts.length && (
        <div className="bg-charcoal text-ivory px-6 py-3 rounded-xl flex justify-center items-center gap-4 text-xs font-bold tracking-widest animate-in fade-in slide-in-from-top-1">
           {selectAllInventory ? (
             <>
               <span className="flex items-center gap-2"><Check size={14} className="text-green-400" /> All {totalProductsCount} products in your inventory are selected.</span>
               <button onClick={() => { setSelectedIds([]); setSelectAllInventory(false); }} className="text-wine underline underline-offset-4 hover:text-white transition-colors">Clear selection</button>
             </>
           ) : (
             <>
               <span>All {paginatedProducts.length} products on this page are selected.</span>
               <button onClick={() => setSelectAllInventory(true)} className="text-wine underline underline-offset-4 hover:text-white transition-colors">Select all {totalProductsCount} products in inventory</button>
             </>
           )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md w-full">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
           <input 
             type="text" 
             placeholder="Search by name, SKU, or handle..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:border-wine transition-colors" 
           />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
           <div className="flex items-center gap-2 border border-gray-200 rounded-lg bg-gray-50 pl-2 overflow-hidden">
              <Filter size={16} className="text-gray-400" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold uppercase tracking-widest text-gray-600 outline-none py-2 pr-4 cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Draft">Draft</option>
              </select>
           </div>
           <div className="flex items-center gap-2 border border-gray-200 rounded-lg bg-gray-50 pl-2 overflow-hidden">
              <select 
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-xs font-bold uppercase tracking-widest text-gray-600 outline-none py-2 pr-4 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {Array.from(activeCategories).sort().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
           </div>
           <div className="w-px h-6 bg-gray-200" />
           <div className="flex items-center gap-2 border border-gray-200 rounded-lg bg-gray-50 pl-2 overflow-hidden">
              <select
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value as any); setCurrentPage(1); }}
                className="bg-transparent text-xs font-bold uppercase tracking-widest text-gray-600 outline-none py-2 pr-4 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
           </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-wine/10 border border-wine/20 p-4 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2">
          <div className="flex items-center gap-4">
             <span className="text-wine font-bold text-sm bg-white px-3 py-1 rounded-md shadow-sm border border-wine/10">{selectedIds.length} Selected</span>
             <p className="text-charcoal text-sm font-medium hidden md:block">Choose an action to apply to all selected products</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => handleBulkAction('export')}
               className="px-4 py-2 bg-white text-charcoal text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 hover:bg-gray-50 shadow-sm"
             >
               Export Selected
             </button>
             <button 
               onClick={() => router.push(`/products/bulk-edit?ids=${selectedIds.join(',')}`)}
               className="px-4 py-2 bg-white text-blue-700 text-xs font-bold uppercase tracking-widest rounded-lg border border-blue-200 hover:bg-blue-50 shadow-sm"
             >
               Bulk Edit
             </button>
             <button 
               onClick={() => setShowCollectionModal(true)}
               className="px-4 py-2 bg-white text-purple-700 text-xs font-bold uppercase tracking-widest rounded-lg border border-purple-200 hover:bg-purple-50 shadow-sm"
             >
               Add to Collection
             </button>
             <button 
               onClick={() => handleBulkAction('publish')}
               disabled={isBulkLoading}
               className="px-4 py-2 bg-white text-green-700 text-xs font-bold uppercase tracking-widest rounded-lg border border-green-200 hover:bg-green-50 shadow-sm"
             >
               Publish
             </button>
             <button 
               onClick={() => handleBulkAction('archive')}
               disabled={isBulkLoading}
               className="px-4 py-2 bg-white text-orange-700 text-xs font-bold uppercase tracking-widest rounded-lg border border-orange-200 hover:bg-orange-50 shadow-sm"
             >
               Archive
             </button>
             <button 
               onClick={() => handleBulkAction('delete')}
               disabled={isBulkLoading}
               className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow-sm shadow-red-600/20 hover:bg-red-700"
             >
               {isBulkLoading ? 'Deleting...' : 'Delete'}
             </button>
          </div>
        </div>
      )}

      {/* Product Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold border-b border-gray-200">
              <th className="px-6 py-4 w-12">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-wine focus:ring-wine"
                />
              </th>
              <th className="px-6 py-4">Product Details</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Price / SKU</th>
              <th className="px-6 py-4">Inventory</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-xs text-gray-400 font-bold uppercase tracking-widest"><Sparkles className="inline-block animate-pulse mb-1 mr-2" size={14}/> Syncing with Shopify Backend...</td></tr>
            ) : paginatedProducts.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">No products found. Start your Shopify Migration.</td></tr>
            ) : paginatedProducts.map((p) => (
              <tr key={p.id} className={`hover:bg-gray-50 transition-colors group ${selectedIds.includes(p.id) ? 'bg-wine/5' : ''}`}>
                <td className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    className="w-4 h-4 rounded border-gray-300 text-wine focus:ring-wine"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-16 bg-beige rounded overflow-hidden flex-shrink-0">
                       <img
                         src={p.image}
                         alt={p.name}
                         className="w-full h-full object-cover"
                         onError={(e: any) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-100'); e.currentTarget.parentElement?.insertAdjacentHTML('beforeend', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'); }}
                       />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-charcoal">{p.name}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-widest">/{p.handle}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <span className="text-[10px] bg-gray-100 px-2 py-1 rounded font-bold uppercase tracking-widest text-gray-500">{p.category}</span>
                </td>
                <td className="px-6 py-4">
                   <p className="text-sm font-bold text-wine">{p.price}</p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 max-w-[120px] truncate" title={p.sku}>{p.sku}</p>
                </td>
                <td className="px-6 py-4">
                   <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold">{p.stock} units</span>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                         <div 
                           className={`h-full rounded-full ${p.stock > 20 ? 'bg-green-500' : p.stock > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                           style={{ width: `${Math.min(100, (p.stock / 100) * 100)}%` }} 
                        />
                      </div>
                   </div>
                </td>
                <td className="px-6 py-4 text-center">
                   <span className={`text-[9px] uppercase font-bold px-2 py-1 rounded inline-block ${
                     p.status === 'Active' ? 'bg-green-100 text-green-700' : 
                     p.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' : 
                     p.status === 'Draft' ? 'bg-gray-100 text-gray-600' :
                     'bg-red-100 text-red-700'
                   }`}>
                     {p.status}
                   </span>
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity relative">
                       <Link 
                         href={`/products/${p.id}`}
                         className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-charcoal"
                       >
                         <ExternalLink size={16} />
                       </Link>
                       <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === p.id ? null : p.id);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-charcoal"
                          >
                            <MoreVertical size={16} />
                          </button>
                                                   {activeDropdown === p.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                               <button onClick={() => router.push(`/products/${p.id}`)} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-3">
                                  <ExternalLink size={14} /> Edit Details
                               </button>
                               <button 
                                 onClick={() => window.open(`/inventory?search=${p.id}`, '_blank')}
                                 className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-3"
                               >
                                  <Package size={14} /> Restock Inventory
                               </button>
                               <button 
                                 onClick={async () => {
                                   if (!confirm('Duplicate this product?')) return;
                                   try {
                                     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005/api/v1' : 'https://api.raaghas.in/api/v1')}/products/${p.id}/duplicate`, {
                                       method: 'POST',
                                       headers: { Authorization: `Bearer ${token}` }
                                     });
                                     if (res.ok) window.location.reload();
                                   } catch (err) { alert('Failed to duplicate'); }
                                 }} 
                                 className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-3"
                               >
                                  <Sparkles size={14} /> Duplicate
                               </button>
                               <div className="h-px bg-gray-50 my-1" />
                               <button 
                                 onClick={async () => {
                                    if (!confirm(`Are you sure you want to ${p.status === 'Draft' ? 'Publish' : 'Archive'} this product?`)) return;
                                    try {
                                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005/api/v1' : 'https://api.raaghas.in/api/v1')}/products/${p.id}/toggle-publish`, {
                                        method: 'PATCH',
                                        headers: { Authorization: `Bearer ${token}` }
                                      });
                                      if (res.ok) window.location.reload();
                                    } catch (err) { alert('Action failed'); }
                                 }}
                                 className={`w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-3 ${p.status === 'Draft' ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`}
                               >
                                  {p.status === 'Draft' ? <Check size={14} /> : <X size={14} />} 
                                  {p.status === 'Draft' ? 'Publish Product' : 'Archive Product'}
                               </button>
                               <a 
                                 href={`https://raaghas.in/products/${p.handle}`} 
                                 target="_blank" 
                                 className="w-full text-left px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-3 border-t border-gray-50 mt-1"
                               >
                                  <Package size={14} /> View on Store
                               </a>
                            </div>
                          )}
                       </div>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Info */}
        <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
           <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Showing {paginatedProducts.length} of {totalProductsCount} Products (Page {currentPage} of {totalPages})</p>
           <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-20"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-20"
              >
                <ChevronRight size={16} />
              </button>
           </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Import CSV</h3>
            <p className="text-sm text-gray-500 mb-4">Upload a CSV file to bulk import or update products.</p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full text-sm mb-6 border p-2 rounded"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleFileUpload}
                disabled={!importFile || isImporting}
                className="px-4 py-2 bg-wine text-white rounded-lg hover:bg-wine-dark disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Add to Collection</h3>
            <p className="text-sm text-gray-500 mb-4">Assign {selectedIds.length} products to a collection.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Existing Collection</label>
                <select 
                  value={selectedCollectionId}
                  onChange={(e) => { setSelectedCollectionId(e.target.value); setNewCollectionTitle(""); }}
                  className="w-full text-sm border p-2 rounded outline-none"
                >
                  <option value="">Select a collection...</option>
                  {collections.filter(c => !c.isVirtual).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-px bg-gray-200 flex-1" />
                <span className="text-xs font-bold text-gray-400 uppercase">OR Create New</span>
                <div className="h-px bg-gray-200 flex-1" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">New Collection Title</label>
                <input 
                  type="text" 
                  value={newCollectionTitle}
                  onChange={(e) => { setNewCollectionTitle(e.target.value); setSelectedCollectionId(""); }}
                  placeholder="e.g. Summer Edit"
                  className="w-full text-sm border p-2 rounded outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-4">
                <input 
                  type="checkbox" 
                  checked={replaceCollections}
                  onChange={(e) => setReplaceCollections(e.target.checked)}
                  className="w-4 h-4 rounded text-wine focus:ring-wine border-gray-300"
                />
                <span className="text-sm text-gray-700">Replace existing collections</span>
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowCollectionModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleBulkAction('add_to_collection', { 
                    collectionId: selectedCollectionId, 
                    newCollectionTitle, 
                    replace: replaceCollections 
                  });
                  setShowCollectionModal(false);
                }}
                disabled={(!selectedCollectionId && !newCollectionTitle) || isBulkLoading}
                className="px-4 py-2 bg-wine text-white rounded-lg hover:bg-wine-dark disabled:opacity-50 text-sm font-bold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function InventoryStat({ label, value, warning, danger }: any) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <div className="flex justify-between items-end">
         <p className={`text-2xl font-bold tracking-tight ${danger ? 'text-red-600' : warning ? 'text-yellow-600' : 'text-charcoal'}`}>{value}</p>
         { (warning || danger) && <AlertCircle size={16} className={danger ? 'text-red-500' : 'text-yellow-500'} /> }
      </div>
    </div>
  );
}
