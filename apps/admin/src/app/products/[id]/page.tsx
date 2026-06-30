"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Save,
  ChevronLeft,
  Image as ImageIcon,
  Trash2,
  Plus,
  Package,
  Tag,
  Layout,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [product, setProduct] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [sizeGuides, setSizeGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in');
        const prodRes = await fetch(`${baseUrl}/products/${id}?adminMode=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const collRes = await fetch(`${baseUrl}/products/collections`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const sgRes = await fetch(`${baseUrl}/size-guides`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProduct(prodData);
          setSelectedCollectionIds((prodData.collections || []).map((c: any) => c.id));
        }
        if (collRes.ok) setCollections(await collRes.json());
        if (sgRes.ok) setSizeGuides(await sgRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (token) loadData();
  }, [id, token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in');
      const res = await fetch(`${baseUrl}/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...product, collections: selectedCollectionIds })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      alert("Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in');
      
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        
        const res = await fetch(`${baseUrl}/cms/media/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
          credentials: 'include'
        });

        if (res.ok) {
          const media = await res.json();
          return {
            url: media.url,
            altText: product.title,
            position: product.images?.length || 0
          };
        }
        return null;
      });

      const uploadedImages = (await Promise.all(uploadPromises)).filter(img => img !== null);
      
      if (uploadedImages.length > 0) {
        setProduct({ 
          ...product, 
          images: [...(product.images || []), ...uploadedImages] 
        });
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Some uploads failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addVariant = () => {
    const newVariant = {
      sku: `${product.id.split('-')[0]}-${Date.now().toString().slice(-4)}`,
      price: product.variants?.[0]?.price || 0,
      inventory: 0,
      option1Value: "New Option",
      option2Value: null,
      option3Value: null
    };
    setProduct({ ...product, variants: [...(product.variants || []), newVariant] });
  };

  const removeVariant = (index: number) => {
    if (product.variants.length <= 1) return alert("Product must have at least one variant.");
    const newVariants = [...product.variants];
    newVariants.splice(index, 1);
    setProduct({ ...product, variants: newVariants });
  };

  const removeImage = (index: number) => {
    const newImages = [...product.images];
    newImages.splice(index, 1);
    setProduct({ ...product, images: newImages });
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-wine" size={32} />
    </div>
  );

  if (!product) return (
    <div className="p-12 text-center space-y-4">
      <AlertCircle className="mx-auto text-red-400" size={48} />
      <h2 className="text-xl font-bold">Product Not Found</h2>
      <button onClick={() => router.back()} className="text-wine font-bold underline">Go Back</button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      {/* Hidden File Input */}
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        multiple
      />

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between sticky top-0 bg-[#FDFCFB]/80 backdrop-blur-md z-10 py-4 -mx-4 px-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-charcoal">{product.title}</h1>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mt-0.5">Edit Sanctuary Item</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.open(`/inventory?search=${product.id}`, '_blank')}
            className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Package size={16} /> Restock
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg active:scale-95 ${
              success ? 'bg-green-500 text-white shadow-green-200' : 'bg-wine text-ivory hover:bg-charcoal shadow-wine/20'
            }`}
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : success ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {success ? "Saved Successfully" : saving ? "Synchronizing..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ─── Left Column: Core Data ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Basic Info */}
          <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-wine">
              <Package size={14} /> Basic Information
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Product Title</label>
                <input 
                  type="text"
                  value={product.title}
                  onChange={(e) => setProduct({ ...product, title: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-wine/30 transition-all outline-none font-medium"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Description (Rich Text)</label>
                <textarea 
                  rows={6}
                  value={product.description}
                  onChange={(e) => setProduct({ ...product, description: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-wine/30 transition-all outline-none leading-relaxed"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-wine">
                <Tag size={14} /> Inventory & Variants
              </div>
              <button 
                onClick={addVariant}
                className="text-[10px] font-bold text-wine uppercase tracking-widest hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Add Variant
              </button>
            </div>
            
            <div className="space-y-4">
              {(Array.isArray(product.variants) ? product.variants : []).map((variant: any, idx: number) => (
                <div key={variant?.id || idx} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                  <button 
                    onClick={() => removeVariant(idx)}
                    className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Option 1 (e.g. Size)</label>
                      <input 
                        value={variant?.option1Value || ""}
                        className="w-full text-xs font-bold text-charcoal bg-white border border-gray-100 rounded-lg px-3 py-2 outline-none focus:border-wine/30"
                        placeholder="Size (S, M, L...)"
                        onChange={(e) => {
                          const newVariants = [...product.variants];
                          newVariants[idx] = { ...newVariants[idx], option1Value: e.target.value };
                          setProduct({ ...product, variants: newVariants });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Option 2 (e.g. Color)</label>
                      <input 
                        value={variant?.option2Value || ""}
                        className="w-full text-xs font-bold text-charcoal bg-white border border-gray-100 rounded-lg px-3 py-2 outline-none focus:border-wine/30"
                        placeholder="Color"
                        onChange={(e) => {
                          const newVariants = [...product.variants];
                          newVariants[idx] = { ...newVariants[idx], option2Value: e.target.value };
                          setProduct({ ...product, variants: newVariants });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Option 3 (e.g. Material)</label>
                      <input 
                        value={variant?.option3Value || ""}
                        className="w-full text-xs font-bold text-charcoal bg-white border border-gray-100 rounded-lg px-3 py-2 outline-none focus:border-wine/30"
                        placeholder="Material"
                        onChange={(e) => {
                          const newVariants = [...product.variants];
                          newVariants[idx] = { ...newVariants[idx], option3Value: e.target.value };
                          setProduct({ ...product, variants: newVariants });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-wine">₹</span>
                        <input 
                          type="number"
                          value={variant?.price || 0}
                          className="w-full pl-7 pr-3 py-2 text-xs font-bold text-charcoal bg-white border border-gray-100 rounded-lg outline-none focus:border-wine/30"
                          onChange={(e) => {
                            const newVariants = [...product.variants];
                            newVariants[idx] = { ...newVariants[idx], price: Number(e.target.value) };
                            setProduct({ ...product, variants: newVariants });
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Stock</label>
                      <input 
                        type="number"
                        value={variant?.inventory || 0}
                        className="w-full px-3 py-2 text-xs font-bold text-charcoal bg-white border border-gray-100 rounded-lg outline-none focus:border-wine/30"
                        onChange={(e) => {
                          const newVariants = [...product.variants];
                          newVariants[idx] = { ...newVariants[idx], inventory: Number(e.target.value) };
                          setProduct({ ...product, variants: newVariants });
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">SKU</label>
                    <input 
                      value={variant?.sku || ""}
                      className="w-full text-[10px] font-mono text-gray-500 bg-white border border-gray-100 rounded-lg px-3 py-1.5 outline-none focus:border-wine/30"
                      onChange={(e) => {
                        const newVariants = [...product.variants];
                        newVariants[idx] = { ...newVariants[idx], sku: e.target.value };
                        setProduct({ ...product, variants: newVariants });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ─── Right Column: Sidebar Data ──────────────────────────────────── */}
        <div className="space-y-8">
          
          {/* Status & Categorization */}
          <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Availability & Status</label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                     <div>
                       <span className="text-xs font-bold text-charcoal block">Product Status</span>
                       <span className="text-[10px] text-gray-400">Draft products are hidden from the store.</span>
                     </div>
                     <select 
                       value={product.status || 'DRAFT'}
                       onChange={(e) => setProduct({...product, status: e.target.value})}
                       className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-600 rounded-lg focus:border-wine outline-none"
                     >
                       <option value="DRAFT">Draft</option>
                       <option value="ACTIVE">Active</option>
                     </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                     <span className="text-xs font-bold text-charcoal">Published to Store</span>
                     <button 
                       onClick={() => setProduct({ ...product, published: !product.published })}
                       className={`w-12 h-6 rounded-full transition-all relative ${product.published ? 'bg-wine' : 'bg-gray-200'}`}
                     >
                       <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${product.published ? 'left-7' : 'left-1'}`} />
                     </button>
                  </div>
                </div>
             </div>

             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Collections
                  {selectedCollectionIds.length > 0 && (
                    <span className="ml-2 bg-wine text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {selectedCollectionIds.length}
                    </span>
                  )}
                </label>
                {collections.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3 border border-gray-100 rounded-xl bg-gray-50">No collections found</p>
                ) : (
                  <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50 max-h-64 overflow-y-auto">
                    {/* Shop by Category */}
                    {(Array.isArray(collections) ? collections : []).filter((c: any) => c.isVirtual).length > 0 && (
                      <div>
                        <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 bg-gray-100 border-b border-gray-200 sticky top-0">
                          Shop by Category
                        </p>
                        {(Array.isArray(collections) ? collections : []).filter((c: any) => c.isVirtual).map((c: any) => (
                          <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white transition-colors group">
                            <input
                              type="checkbox"
                              checked={selectedCollectionIds.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCollectionIds(prev => [...prev, c.id]);
                                else setSelectedCollectionIds(prev => prev.filter(id => id !== c.id));
                              }}
                              className="w-3.5 h-3.5 rounded accent-wine flex-shrink-0"
                            />
                            <span className="text-xs font-medium text-charcoal group-hover:text-wine transition-colors">{c.title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {/* Shop by Collection */}
                    {(Array.isArray(collections) ? collections : []).filter((c: any) => !c.isVirtual).length > 0 && (
                      <div>
                        <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 bg-gray-100 border-b border-gray-200 border-t sticky top-0">
                          Shop by Collection
                        </p>
                        {(Array.isArray(collections) ? collections : []).filter((c: any) => !c.isVirtual).map((c: any) => (
                          <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white transition-colors group">
                            <input
                              type="checkbox"
                              checked={selectedCollectionIds.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCollectionIds(prev => [...prev, c.id]);
                                else setSelectedCollectionIds(prev => prev.filter(id => id !== c.id));
                              }}
                              className="w-3.5 h-3.5 rounded accent-wine flex-shrink-0"
                            />
                            <span className="text-xs font-medium text-charcoal group-hover:text-wine transition-colors">{c.title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
             </div>

             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Size Guide</label>
                <select 
                  value={product.sizeGuideId || ""}
                  onChange={(e) => setProduct({ ...product, sizeGuideId: e.target.value || null })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium outline-none appearance-none"
                >
                   <option value="">None (Hide Size Guide)</option>
                   {(Array.isArray(sizeGuides) ? sizeGuides : []).map(sg => (
                     <option key={sg.id} value={sg.id}>{sg.name}</option>
                   ))}
                </select>
             </div>
          </section>

          {/* Loyalty Credit Points Preview */}
          <section className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-3xl border border-amber-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-3">
              <Sparkles size={14} /> Loyalty Credits
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-medium">Customer earns on purchase</p>
                <p className="text-2xl font-bold text-amber-800 mt-1">
                  {Math.floor((product.variants?.[0]?.price || 0) * 0.02)} pts
                </p>
                <p className="text-[10px] text-amber-600 mt-1">2% of ₹{Number(product.variants?.[0]?.price || 0).toLocaleString()} = {Math.floor((product.variants?.[0]?.price || 0) * 0.02)} credit points</p>
              </div>
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 text-2xl font-bold border border-amber-200">
                ✦
              </div>
            </div>
          </section>

          {/* GST / Tax Settings */}
          <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-wine">Invoicing &amp; GST</div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">HSN Code</label>
              <input
                type="text"
                value={product.hsnCode || 'TEXTILE-00'}
                onChange={(e) => setProduct({ ...product, hsnCode: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium outline-none uppercase"
                placeholder="e.g. TEXTILE-00"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">GST Tax Rate (%)</label>
              <select
                value={product.taxRate ? Number(product.taxRate).toFixed(2) : '12.00'}
                onChange={(e) => setProduct({ ...product, taxRate: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium outline-none"
              >
                <option value="0.00">0% (Nil Rated)</option>
                <option value="5.00">5%</option>
                <option value="12.00">12%</option>
                <option value="18.00">18%</option>
                <option value="28.00">28%</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Price includes Tax?</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="radio"
                    name="taxInclusive"
                    checked={product.taxInclusive !== false}
                    onChange={() => setProduct({ ...product, taxInclusive: true })}
                    className="accent-wine"
                  />
                  <div>
                    <p className="text-xs font-bold text-charcoal">Inclusive</p>
                    <p className="text-[10px] text-gray-400">GST is part of the displayed price</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="radio"
                    name="taxInclusive"
                    checked={product.taxInclusive === false}
                    onChange={() => setProduct({ ...product, taxInclusive: false })}
                    className="accent-wine"
                  />
                  <div>
                    <p className="text-xs font-bold text-charcoal">Exclusive</p>
                    <p className="text-[10px] text-gray-400">GST added on top at checkout</p>
                  </div>
                </label>
              </div>
              {product.taxInclusive === false && (
                <p className="text-xs text-amber-600 mt-3 bg-amber-50 px-3 py-2 rounded-lg">
                  ⚠️ {product.taxRate ?? 12}% GST will be added to the displayed price at checkout.
                </p>
              )}
            </div>
          </section>

          {/* Media Manager */}
          <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
             <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Media</label>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] font-bold text-wine hover:underline uppercase tracking-widest flex items-center gap-1"
                >
                   <Plus size={12} /> Add Image
                </button>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <AnimatePresence>
                  {(Array.isArray(product.images) ? product.images : []).map((img: any, idx: number) => (
                    <motion.div 
                      layout
                      key={img?.id || idx} 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative aspect-[3/4] rounded-2xl overflow-hidden group"
                    >
                      <img 
                        src={typeof img === 'string' ? (img.startsWith('http') ? img : `${(process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005/api/v1' : 'https://api.raaghas.in/api/v1')).replace('/api/v1', '')}${img}`) : (img?.url?.startsWith('http') ? img.url : `${(process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005/api/v1' : 'https://api.raaghas.in/api/v1')).replace('/api/v1', '')}${img?.url || ''}`)} 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={() => removeImage(idx)}
                            className="p-2 bg-white text-red-500 rounded-xl shadow-xl hover:scale-110 transition-transform"
                          >
                            <Trash2 size={16} />
                          </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300 hover:border-wine/30 hover:text-wine/30 transition-all cursor-pointer disabled:opacity-50"
                >
                   {isUploading ? <Loader2 className="animate-spin" size={24} /> : <ImageIcon size={24} />}
                   <span className="text-[10px] font-bold uppercase tracking-widest mt-2">
                     {isUploading ? "Uploading..." : "Upload"}
                   </span>
                </button>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
}
