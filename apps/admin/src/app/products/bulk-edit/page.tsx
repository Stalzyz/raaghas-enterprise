"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { ArrowLeft, Save, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";

function BulkEditContent() {
  const { token } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids");

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editedItems, setEditedItems] = useState<Record<string, any>>({});
  const [sizeGuides, setSizeGuides] = useState<any[]>([]);

  const API = `${API_BASE}/api/v1`;

  useEffect(() => {
    async function loadGuides() {
      if (!token) return;
      try {
        const sgRes = await fetch(`${API}/cms/size-guides`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (sgRes.ok) setSizeGuides(await sgRes.json());
      } catch (e) {
        console.error(e);
      }
    }
    loadGuides();
  }, [token]);

  useEffect(() => {
    async function loadProducts() {
      if (!idsParam || !token) return;
      // FIX: Normalize IDs to strings for reliable comparison
      const ids = idsParam.split(',').map(id => id.trim()).filter(Boolean);

      try {
        // FIX: Fetch with a high limit and filter client-side
        const res = await fetch(`${API}/products?adminMode=true&limit=2000`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          // FIX: Strict string comparison for IDs
          const selected = (Array.isArray(data) ? data : data.data || []).filter(
            (p: any) => ids.includes(String(p.id))
          );
          setProducts(selected);

          // Initialize editedItems state
          const initialEdits: Record<string, any> = {};
          selected.forEach((p: any) => {
            initialEdits[p.id] = {
              id: p.id,
              // Core
              title: p.title || '',
              shortDescription: p.shortDescription || '',
              status: p.status || 'DRAFT',
              // Pricing & Inventory — read from first variant
              price: p.variants?.[0]?.price ?? 0,
              mrp: p.variants?.[0]?.mrp ?? 0,
              costPrice: p.variants?.[0]?.costPrice ?? 0,
              sku: p.variants?.[0]?.sku || '',
              barcode: p.variants?.[0]?.barcode || '',
              inventory: p.variants?.[0]?.inventory ?? 0,
              // Taxonomy
              category: p.category || '',
              subCategory: p.subCategory || '',
              brand: p.brand || '',
              vendor: p.vendor || '',
              productType: p.productType || '',
              gender: p.gender || '',
              ageGroup: p.ageGroup || '',
              // Attributes
              fabric: p.fabric || '',
              material: p.material || '',
              pattern: p.pattern || '',
              fitType: p.fitType || '',
              sleeveType: p.sleeveType || '',
              neckType: p.neckType || '',
              length: p.length || '',
              occasion: p.occasion || '',
              style: p.style || '',
              // SEO & Meta
              tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
              seoTitle: p.seoTitle || '',
              metaDescription: p.metaDescription || '',
              searchKeywords: p.searchKeywords || '',
              // Misc
              hsnCode: p.hsnCode || '',
              taxRate: p.taxRate || '12.00',
              taxInclusive: p.taxInclusive !== false,
              bundleIds: p.bundleIds || '',
              featuredCoupon: p.featuredCoupon || '',
              sizeGuideId: p.sizeGuideId || '',
            };
          });
          setEditedItems(initialEdits);

          if (selected.length === 0 && ids.length > 0) {
            setSaveResult({ success: false, message: `Could not load ${ids.length} selected products. They may have been deleted or the IDs are mismatched.` });
          }
        } else {
          const err = await res.json().catch(() => ({}));
          setSaveResult({ success: false, message: `Failed to fetch products: ${err.message || res.statusText}` });
        }
      } catch (err) {
        console.error("Failed to load products for bulk edit:", err);
        setSaveResult({ success: false, message: "Network error loading products." });
      } finally {
        setLoading(false);
      }
    }

    if (token) loadProducts();
  }, [token, idsParam]);

  const handleChange = (id: string, field: string, value: any) => {
    setEditedItems(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSaveResult(null);

    const itemsToUpdate = Object.entries(editedItems).map(([id, data]) => ({ id, ...(data as any) }));

    try {
      const res = await fetch(`${API}/products/bulk-update-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items: itemsToUpdate }),
      });

      if (res.ok) {
        const result = await res.json();
        setSaveResult({ success: true, message: `Successfully updated ${result.count ?? itemsToUpdate.length} products.` });
        setTimeout(() => router.push("/products"), 1500);
      } else {
        const errData = await res.json().catch(() => ({}));
        setSaveResult({ success: false, message: `Failed to update: ${errData.message || 'Unknown error'}` });
      }
    } catch (err) {
      console.error(err);
      setSaveResult({ success: false, message: "Network error saving products." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 space-y-2">
        <Sparkles className="animate-spin inline-block mr-2" />
        <p>Loading {idsParam?.split(',').length} products for bulk edit...</p>
      </div>
    );
  }

  // Helper for rendering input cells
  const renderInput = (id: string, field: string, type: string = "text", width: string = "w-32") => (
    <td className="px-3 py-2 border-r bg-white">
      <input
        type={type}
        value={editedItems[id]?.[field] ?? (type === "number" ? 0 : '')}
        onChange={(e) => handleChange(id, field, type === 'number' ? e.target.value : e.target.value)}
        className={`${width} border p-1 rounded focus:ring-1 focus:ring-wine outline-none text-xs`}
      />
    </td>
  );

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/products" className="p-2 border rounded hover:bg-gray-50">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold">Bulk Edit Products</h2>
            <p className="text-gray-500 text-sm">Editing {products.length} selected products</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || products.length === 0}
          className="flex items-center gap-2 px-6 py-2 bg-wine text-white rounded-lg shadow font-bold hover:bg-red-900 disabled:opacity-50"
        >
          <Save size={18} /> {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {/* Result banner */}
      {saveResult && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold ${saveResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <AlertCircle size={16} />
          {saveResult.message}
        </div>
      )}

      {products.length === 0 ? (
        <div className="bg-white border rounded-xl p-20 text-center space-y-4">
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No products loaded</p>
          <p className="text-gray-400 text-xs">Go back to Products, select items, and click Bulk Edit.</p>
          <Link href="/products" className="inline-block mt-4 px-6 py-2 bg-wine text-white rounded-lg font-bold text-sm">Back to Products</Link>
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden overflow-x-auto max-w-[calc(100vw-300px)]">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 font-bold text-gray-600 sticky left-0 bg-gray-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Product</th>
                <th className="px-4 py-3 font-bold text-gray-600 border-r bg-gray-100" colSpan={3}>Core Info</th>
                <th className="px-4 py-3 font-bold text-gray-600 border-r bg-blue-50" colSpan={6}>Pricing &amp; Inventory (Primary Variant)</th>
                <th className="px-4 py-3 font-bold text-gray-600 border-r bg-green-50" colSpan={7}>Taxonomy</th>
                <th className="px-4 py-3 font-bold text-gray-600 border-r bg-yellow-50" colSpan={9}>Attributes</th>
                <th className="px-4 py-3 font-bold text-gray-600 border-r bg-purple-50" colSpan={4}>SEO &amp; Meta</th>
                <th className="px-4 py-3 font-bold text-gray-600 border-r bg-gray-100" colSpan={6}>Misc</th>
              </tr>
              <tr className="text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2 sticky left-0 bg-gray-50 z-10 border-r border-b shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Reference Only</th>
                <th className="px-3 py-2 border-r border-b">Title</th>
                <th className="px-3 py-2 border-r border-b">Short Desc</th>
                <th className="px-3 py-2 border-r border-b">Status</th>
                <th className="px-3 py-2 border-r border-b">Selling Price</th>
                <th className="px-3 py-2 border-r border-b">MRP</th>
                <th className="px-3 py-2 border-r border-b">Cost Price</th>
                <th className="px-3 py-2 border-r border-b">SKU</th>
                <th className="px-3 py-2 border-r border-b">Barcode</th>
                <th className="px-3 py-2 border-r border-b">Stock</th>
                <th className="px-3 py-2 border-r border-b">Category</th>
                <th className="px-3 py-2 border-r border-b">Sub Category</th>
                <th className="px-3 py-2 border-r border-b">Brand</th>
                <th className="px-3 py-2 border-r border-b">Vendor</th>
                <th className="px-3 py-2 border-r border-b">Product Type</th>
                <th className="px-3 py-2 border-r border-b">Gender</th>
                <th className="px-3 py-2 border-r border-b">Age Group</th>
                <th className="px-3 py-2 border-r border-b">Fabric</th>
                <th className="px-3 py-2 border-r border-b">Material</th>
                <th className="px-3 py-2 border-r border-b">Pattern</th>
                <th className="px-3 py-2 border-r border-b">Fit Type</th>
                <th className="px-3 py-2 border-r border-b">Sleeve Type</th>
                <th className="px-3 py-2 border-r border-b">Neck Type</th>
                <th className="px-3 py-2 border-r border-b">Length</th>
                <th className="px-3 py-2 border-r border-b">Occasion</th>
                <th className="px-3 py-2 border-r border-b">Style</th>
                <th className="px-3 py-2 border-r border-b">Tags</th>
                <th className="px-3 py-2 border-r border-b">SEO Title</th>
                <th className="px-3 py-2 border-r border-b">Meta Desc</th>
                <th className="px-3 py-2 border-r border-b">Search Keywords</th>
                <th className="px-3 py-2 border-r border-b">HSN Code</th>
                <th className="px-3 py-2 border-r border-b">Tax Rate (%)</th>
                <th className="px-3 py-2 border-r border-b">Tax Inclusive?</th>
                <th className="px-3 py-2 border-r border-b">Bundle IDs</th>
                <th className="px-3 py-2 border-r border-b">Featured Coupon</th>
                <th className="px-3 py-2 border-r border-b">Size Guide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-2 border-r sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[250px] min-w-[250px] max-w-[250px]">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {p.images?.[0] && (
                        <img
                          src={p.images[0].url?.startsWith('http') ? p.images[0].url : `${API.replace('/api/v1', '')}${p.images[0].url}`}
                          className="w-8 h-10 object-cover rounded flex-shrink-0"
                          alt={p.title}
                          onError={(e: any) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <span className="font-medium text-gray-800 truncate text-xs" title={p.title}>{p.title}</span>
                    </div>
                  </td>

                  {/* Core */}
                  {renderInput(p.id, "title", "text", "w-48")}
                  {renderInput(p.id, "shortDescription", "text", "w-48")}
                  <td className="px-3 py-2 border-r bg-white">
                    <select
                      value={editedItems[p.id]?.status || 'DRAFT'}
                      onChange={(e) => handleChange(p.id, 'status', e.target.value)}
                      className="w-24 border p-1 rounded focus:ring-1 focus:ring-wine outline-none text-xs"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                  </td>

                  {/* Pricing & Inventory */}
                  {renderInput(p.id, "price", "number", "w-20")}
                  {renderInput(p.id, "mrp", "number", "w-20")}
                  {renderInput(p.id, "costPrice", "number", "w-20")}
                  {renderInput(p.id, "sku", "text", "w-28")}
                  {renderInput(p.id, "barcode", "text", "w-28")}
                  {renderInput(p.id, "inventory", "number", "w-20")}

                  {/* Taxonomy */}
                  {renderInput(p.id, "category", "text", "w-32")}
                  {renderInput(p.id, "subCategory", "text", "w-32")}
                  {renderInput(p.id, "brand", "text", "w-28")}
                  {renderInput(p.id, "vendor", "text", "w-28")}
                  {renderInput(p.id, "productType", "text", "w-28")}
                  {renderInput(p.id, "gender", "text", "w-24")}
                  {renderInput(p.id, "ageGroup", "text", "w-24")}

                  {/* Attributes */}
                  {renderInput(p.id, "fabric", "text", "w-28")}
                  {renderInput(p.id, "material", "text", "w-28")}
                  {renderInput(p.id, "pattern", "text", "w-28")}
                  {renderInput(p.id, "fitType", "text", "w-28")}
                  {renderInput(p.id, "sleeveType", "text", "w-28")}
                  {renderInput(p.id, "neckType", "text", "w-28")}
                  {renderInput(p.id, "length", "text", "w-28")}
                  {renderInput(p.id, "occasion", "text", "w-28")}
                  {renderInput(p.id, "style", "text", "w-28")}

                  {/* SEO & Meta */}
                  {renderInput(p.id, "tags", "text", "w-40")}
                  {renderInput(p.id, "seoTitle", "text", "w-40")}
                  {renderInput(p.id, "metaDescription", "text", "w-48")}
                  {renderInput(p.id, "searchKeywords", "text", "w-40")}

                  {/* Misc */}
                  {renderInput(p.id, "hsnCode", "text", "w-28")}
                  {renderInput(p.id, "taxRate", "number", "w-20")}
                  <td className="px-3 py-2 border-r bg-white">
                    <select
                      value={editedItems[p.id]?.taxInclusive === false ? 'exclusive' : 'inclusive'}
                      onChange={(e) => handleChange(p.id, 'taxInclusive', e.target.value === 'inclusive')}
                      className="w-28 border p-1 rounded focus:ring-1 focus:ring-wine outline-none text-xs"
                    >
                      <option value="inclusive">Inclusive</option>
                      <option value="exclusive">Exclusive (+Tax)</option>
                    </select>
                  </td>
                  {renderInput(p.id, "bundleIds", "text", "w-40")}
                  {renderInput(p.id, "featuredCoupon", "text", "w-32")}
                  {renderInput(p.id, "sizeGuideId", "text", "w-32")}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BulkEditPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500"><Sparkles className="animate-spin inline-block mr-2" /> Loading products...</div>}>
      <BulkEditContent />
    </Suspense>
  );
}
