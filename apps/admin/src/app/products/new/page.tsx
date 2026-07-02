"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Save, Plus, Trash2, X, Settings2, Sparkles, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size", "Custom"];

export default function AddProductPage() {
  const { token } = useAdminAuth();
  const [form, setForm] = useState({
    title: "",
    description: "",
    shortDescription: "",
    category: "New Arrivals",
    subCategory: "",
    brand: "Raaghas",
    vendor: "",
    productType: "Apparel",
    gender: "Unisex",
    ageGroup: "Adult",
    fabric: "",
    material: "",
    pattern: "",
    fitType: "",
    sleeveType: "",
    neckType: "",
    length: "",
    occasion: "",
    style: "",
    status: "DRAFT",
    basePrice: "0",
    baseMrp: "0",
    baseSku: "",
    hsnCode: "TEXTILE-00",
    taxRate: "12.00",
    taxInclusive: true,
    tags: "",
    searchKeywords: "",
    seoTitle: "",
    metaDescription: "",
    metaKeywords: "",
    bundleIds: "",
    featuredCoupon: "",
    sizeGuideId: "",
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [hasVariants, setHasVariants] = useState(true);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["M", "L"]);

  const [images, setImages] = useState<any[]>([]);
  const [sizeGuides, setSizeGuides] = useState<any[]>([]);
  const [allCollections, setAllCollections] = useState<any[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadGuides() {
      if (!token) return;
      // NEXT_PUBLIC_API_URL already includes /api/v1 — don't append it again
      const baseUrl = `${API_BASE}/api/v1`;
      try {
        const [sgRes, collRes] = await Promise.all([
          fetch(`${baseUrl}/size-guides`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${baseUrl}/products/collections`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (sgRes.ok) setSizeGuides(await sgRes.json());
        if (collRes.ok) setAllCollections(await collRes.json());
      } catch (e) {
        console.error("Failed to fetch size guides / collections", e);
      }
    }
    loadGuides();
  }, [token]);

  // ─── MULTI-DIMENSIONAL VARIANT SYSTEM ───
  const [options, setOptions] = useState<Array<{ name: string, values: string[] }>>([
    { name: "Size", values: ["M", "L"] }
  ]);

  // Variant Matrix: keyed by a join of values (e.g. "M-Red")
  const [variantMatrix, setVariantMatrix] = useState<Record<string, { 
    price: string, 
    mrp: string,
    costPrice: string,
    sku: string, 
    barcode: string,
    stock: string 
  }>>({});

  // Helper to generate Cartesian product of options
  const generateCombinations = (opts: typeof options) => {
    if (opts.length === 0) return [];
    let combinations: string[][] = [[]];
    for (const option of opts) {
      const nextCombinations: string[][] = [];
      for (const comb of combinations) {
        for (const val of option.values) {
          nextCombinations.push([...comb, val]);
        }
      }
      combinations = nextCombinations;
    }
    return combinations;
  };

  const combinations = generateCombinations(options);

  // Sync matrix when options change
  useEffect(() => {
    const nextMatrix = { ...variantMatrix };
    combinations.forEach(comb => {
      const key = comb.join("-");
      if (!nextMatrix[key]) {
        const skuSuffix = comb.map(v => v.substring(0, 3).toUpperCase()).join("-");
        nextMatrix[key] = { 
          price: form.basePrice, 
          mrp: form.baseMrp || form.basePrice,
          costPrice: "0",
          sku: `${form.baseSku}-${skuSuffix}`, 
          barcode: "",
          stock: "0" 
        };
      }
    });
    setVariantMatrix(nextMatrix);
  }, [options, form.baseSku, form.basePrice]);

  const addOption = () => {
    if (options.length >= 2) return alert("Maximum 2 variant dimensions supported currently.");
    setOptions([...options, { name: "Color", values: [] }]);
  };

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOptionName = (idx: number, name: string) => {
    const next = [...options];
    next[idx].name = name;
    setOptions(next);
  };

  const addValue = (idx: number, val: string) => {
    if (!val) return;
    const next = [...options];
    if (next[idx].values.includes(val)) return;
    next[idx].values.push(val);
    setOptions(next);
  };

  const removeValue = (optIdx: number, valIdx: number) => {
    const next = [...options];
    next[optIdx].values.splice(valIdx, 1);
    setOptions(next);
  };

  // ─── AI DATA HYDRATION ───
  useEffect(() => {
    const rawData = sessionStorage.getItem("ai_importer_data");
    if (rawData) {
      try {
        const aiData = JSON.parse(rawData);
        setForm(prev => ({
          ...prev,
          title: aiData.title || prev.title,
          description: aiData.description || prev.description,
          category: aiData.type || prev.category,
          basePrice: String(aiData.suggestedPrice) || prev.basePrice,
        }));
        if (aiData.image) {
          setImages([{ id: Date.now(), url: aiData.image, isPrimary: true }]);
        }
        sessionStorage.removeItem("ai_importer_data");
      } catch (err) {
        console.error("Failed to hydrate AI data:", err);
      }
    }
  }, []);

  const syncBasePricing = () => {
    const updated = { ...variantMatrix };
    combinations.forEach(comb => {
      const key = comb.join("-");
      if (updated[key]) {
        updated[key].price = form.basePrice;
        updated[key].mrp = form.baseMrp || form.basePrice;
        const skuSuffix = comb.map(v => v.substring(0, 3).toUpperCase()).join("-");
        updated[key].sku = `${form.baseSku}-${skuSuffix}`;
      }
    });
    setVariantMatrix(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setIsUploading(true);
    const baseUrl = API_BASE;
    
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${baseUrl}/cms/media/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
          credentials: 'include'
        });
        if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
        return await res.json();
      });

      const results = await Promise.all(uploadPromises);
      const newImages = results.map(data => ({
        id: data.id || Date.now() + Math.random(),
        url: data.url,
        isPrimary: images.length === 0 && results.indexOf(data) === 0
      }));
      
      setImages(prev => [...prev, ...newImages]);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(err.message);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const removeImage = (id: any) => {
    setImages(prev => {
      const next = prev.filter(img => img.id !== id);
      // If we removed the primary, make the first remaining one primary
      if (next.length > 0 && !next.some(img => img.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const addImageUrl = () => {
    const url = prompt("Enter the public image URL:");
    if (url) {
      setImages(prev => [...prev, { id: Date.now(), url, isPrimary: prev.length === 0 }]);
    }
  };

  const handleSave = async () => {
    if (!form.title) return alert("Product title is required");
    setIsUploading(true);
    try {
      const payload = {
        ...form,
        taxRate: parseFloat(form.taxRate) || 5,
        collections: selectedCollectionIds.filter(id => !id.startsWith('virtual-')),
        images: images.map(img => ({ url: img.url, isPrimary: img.isPrimary })),
        variants: combinations.map(comb => {
          const key = comb.join("-");
          const data = variantMatrix[key];
          return {
            option1Name: options[0]?.name || null,
            option1Value: comb[0] || null,
            option2Name: options[1]?.name || null,
            option2Value: comb[1] || null,
            price: data.price,
            mrp: data.mrp,
            sellingPrice: data.price,
            costPrice: data.costPrice,
            sku: data.sku,
            barcode: data.barcode,
            inventory: parseInt(data.stock)
          };
        })
      };

      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/products`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Product saved successfully!");
        window.location.href = "/products";
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || errData.message || "Failed to save product");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const generateAiDescription = async () => {
    if (!form.title) return alert("Please enter a product title first so AI knows what to write about.");
    
    setIsGeneratingDescription(true);
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/ai/generate-description`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: form.title,
          category: form.category
        }),
      });

      if (!res.ok) throw new Error("AI Generation failed");

      const data = await res.json();
      setForm(prev => ({ ...prev, description: data.description }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      
      {/* ─── ACTION HEADER ─── */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm sticky top-4 z-40">
        <div className="flex items-center gap-4">
          <Link href="/products" className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-400">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-charcoal">New Product</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={form.status}
            onChange={(e) => setForm({...form, status: e.target.value})}
            className="px-4 py-2 bg-gray-50 border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-500 rounded-xl focus:border-wine outline-none"
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active (Published)</option>
          </select>
          <button 
            onClick={handleSave}
            disabled={isUploading}
            className="flex items-center gap-2 bg-wine text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-colors disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ─── LEFT COLUMN (Core Details & Variants) ─── */}
        <div className="col-span-2 space-y-6">
          
          {/* General Information */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">1. General Information</h3>
            
            <div>
              <label className="text-sm font-bold text-charcoal block mb-1">Title</label>
              <input 
                type="text" 
                placeholder="e.g. Premium Dupion Silk Set" 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine transition-colors"
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
              />
            </div>
            
            <div>
              <label className="text-sm font-bold text-charcoal block mb-1">Short Description</label>
              <input 
                type="text" 
                placeholder="Brief 1-sentence hook..." 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine transition-colors"
                value={form.shortDescription}
                onChange={e => setForm({...form, shortDescription: e.target.value})}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-bold text-charcoal block">Long Description</label>
                <button 
                  onClick={generateAiDescription}
                  disabled={isGeneratingDescription}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-wine hover:text-charcoal transition-colors disabled:opacity-50"
                >
                  {isGeneratingDescription ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} 
                  {isGeneratingDescription ? "Generating..." : "Magic Write"}
                </button>
              </div>
              <textarea 
                rows={5}
                placeholder="Describe the fabric, fit, and origin..." 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine transition-colors resize-y"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              />
            </div>
          </div>

          {/* Textile & Style Attributes */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">2. Textile & Style Attributes</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">Fabric</label>
                <input type="text" value={form.fabric} onChange={e => setForm({...form, fabric: e.target.value})} placeholder="e.g. Dupion Silk" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine" />
              </div>
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">Material</label>
                <input type="text" value={form.material} onChange={e => setForm({...form, material: e.target.value})} placeholder="e.g. 100% Pure Silk" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine" />
              </div>
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">Pattern</label>
                <input type="text" value={form.pattern} onChange={e => setForm({...form, pattern: e.target.value})} placeholder="e.g. Floral Embroidery" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine" />
              </div>
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">Fit Type</label>
                <input type="text" value={form.fitType} onChange={e => setForm({...form, fitType: e.target.value})} placeholder="e.g. Regular Fit" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine" />
              </div>
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">Occasion</label>
                <input type="text" value={form.occasion} onChange={e => setForm({...form, occasion: e.target.value})} placeholder="e.g. Wedding, Festive" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine" />
              </div>
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">Style</label>
                <input type="text" value={form.style} onChange={e => setForm({...form, style: e.target.value})} placeholder="e.g. Traditional, Modern" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine" />
              </div>
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">Neck Type</label>
                <input type="text" value={form.neckType} onChange={e => setForm({...form, neckType: e.target.value})} placeholder="e.g. Round, V-Neck" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine" />
              </div>
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">Sleeve Type</label>
                <input type="text" value={form.sleeveType} onChange={e => setForm({...form, sleeveType: e.target.value})} placeholder="e.g. Full Sleeve, 3/4 Sleeve" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-charcoal block mb-1">Size Guide</label>
                <select 
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine"
                  value={form.sizeGuideId || ""}
                  onChange={(e) => setForm({ ...form, sizeGuideId: e.target.value || "" })}
                >
                   <option value="">No Size Guide</option>
                   {(Array.isArray(sizeGuides) ? sizeGuides : []).map(sg => (
                     <option key={sg.id} value={sg.id}>{sg.title}</option>
                   ))}
                </select>
              </div>
            </div>
          </div>

          {/* Media Block */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <div className="flex justify-between items-end">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">2. Gallery</h3>
              <button 
                onClick={addImageUrl}
                className="text-xs font-bold text-wine hover:text-charcoal transition-colors"
              >
                Add from URL
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
                {/* Upload Button */}
                <div 
                  onClick={() => document.getElementById('product-image-upload')?.click()}
                  className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 cursor-pointer hover:border-wine hover:text-wine transition-colors bg-gray-50"
                >
                  {isUploading ? (
                    <Loader2 className="animate-spin text-wine" size={24} />
                  ) : (
                    <>
                      <UploadCloud size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-center">Add<br/>Images</span>
                    </>
                  )}
                </div>
                
                <input 
                  id="product-image-upload"
                  type="file" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept="image/*"
                  multiple
                />
               
               {/* Existing Images */}
               {images.map(img => (
                 <div key={img.id} className="aspect-[3/4] rounded-xl relative overflow-hidden group bg-gray-100 border border-gray-200">
                    <img src={img.url?.startsWith('http') ? img.url : `${(`${API_BASE}/api/v1`).replace('/api/v1', '')}${img.url}`} className="w-full h-full object-cover" />
                    {img.isPrimary && (
                      <span className="absolute top-2 left-2 bg-charcoal text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">Primary</span>
                    )}
                    <button 
                      onClick={() => removeImage(img.id)}
                      className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    >
                      <Trash2 size={14} />
                    </button>
                 </div>
               ))}
            </div>
          </div>

          {/* ─── VARIANT MATRIX GENERATOR ─── */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Settings2 size={16} className="text-wine"/> 3. Inventory & Options
              </h3>
            </div>

            {/* Base Configuration */}
            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
               <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Base Price (Selling)</label>
                  <input type="number" value={form.basePrice} onChange={e => setForm({...form, basePrice: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-wine" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Base MRP</label>
                  <input type="number" value={form.baseMrp} onChange={e => setForm({...form, baseMrp: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-wine" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Base SKU Root</label>
                  <input type="text" value={form.baseSku} onChange={e => setForm({...form, baseSku: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-wine" />
               </div>
               <div className="col-span-3 flex justify-end">
                  <button onClick={syncBasePricing} className="text-[10px] bg-charcoal text-white px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest hover:bg-wine">Sync Config to all sizes</button>
               </div>
            </div>

            {/* Variant Options Builder */}
            <div className="space-y-6">
              {options.map((opt, optIdx) => (
                <div key={optIdx} className="p-4 border border-gray-100 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                       <input 
                         value={opt.name} 
                         onChange={e => updateOptionName(optIdx, e.target.value)}
                         className="text-sm font-bold text-charcoal bg-transparent border-b border-transparent focus:border-wine outline-none w-full"
                         placeholder="Option Name (e.g. Size)"
                       />
                    </div>
                    {optIdx > 0 && <button onClick={() => removeOption(optIdx)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>}
                  </div>
                  {/* Quick-pick for Size options */}
                  {opt.name.toLowerCase() === 'size' && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Quick Pick</p>
                      <div className="flex flex-wrap gap-2">
                        {SIZES.map(sz => {
                          const active = opt.values.includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => active ? removeValue(optIdx, opt.values.indexOf(sz)) : addValue(optIdx, sz)}
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${active ? 'bg-wine text-white border-wine' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-wine hover:text-wine'}`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => { SIZES.slice(0, 6).forEach(sz => addValue(optIdx, sz)); }}
                          className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-wine hover:text-wine transition-all"
                        >
                          + All Standard
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((val, valIdx) => (
                      <span key={valIdx} className="bg-wine text-white text-xs font-bold pl-3 pr-2 py-1.5 rounded-lg flex items-center gap-2 group">
                        {val}
                        <button onClick={() => removeValue(optIdx, valIdx)} className="hover:bg-white/20 rounded-md p-0.5"><X size={12}/></button>
                      </span>
                    ))}
                    <input
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          addValue(optIdx, (e.target as HTMLInputElement).value.trim());
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      className="text-xs bg-gray-50 border border-dashed border-gray-300 px-3 py-1.5 rounded-lg outline-none focus:border-wine focus:bg-white"
                      placeholder="Or type a custom value & hit Enter..."
                    />
                  </div>
                </div>
              ))}
              {options.length < 2 && (
                <button 
                  onClick={addOption}
                  className="w-full py-3 border-2 border-dashed border-gray-100 rounded-xl text-xs font-bold text-gray-400 uppercase tracking-widest hover:border-wine hover:text-wine transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16}/> Add another option (Color, Fabric, etc.)
                </button>
              )}
            </div>

            {/* Stocks Table */}
            {combinations.length > 0 && (
              <div className="pt-4 border-t border-gray-100 overflow-x-auto">
                <p className="text-sm font-bold text-charcoal mb-4">Stock & Overrides</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm min-w-[600px]">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Variant</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">SKU / Barcode</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-28">MRP (₹)</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-28">Selling (₹)</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-28">Cost (₹)</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-24">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {combinations.map(comb => {
                        const key = comb.join("-");
                        const data = variantMatrix[key];
                        if (!data) return null;
                        return (
                          <tr key={key} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {comb.map((v, i) => (
                                  <span key={i} className="bg-gray-100 text-charcoal text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200">{v}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 space-y-1">
                              <input type="text" placeholder="SKU" value={data.sku} onChange={e => setVariantMatrix({...variantMatrix, [key]: {...data, sku: e.target.value}})} className="w-full px-2 py-1 border border-gray-200 bg-white rounded text-[10px] outline-none focus:border-wine" />
                              <input type="text" placeholder="Barcode" value={data.barcode} onChange={e => setVariantMatrix({...variantMatrix, [key]: {...data, barcode: e.target.value}})} className="w-full px-2 py-1 border border-gray-200 bg-white rounded text-[10px] outline-none focus:border-wine" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" value={data.mrp} onChange={e => setVariantMatrix({...variantMatrix, [key]: {...data, mrp: e.target.value}})} className="w-full px-2 py-1 border border-gray-200 bg-white rounded text-sm outline-none focus:border-wine" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" value={data.price} onChange={e => setVariantMatrix({...variantMatrix, [key]: {...data, price: e.target.value}})} className="w-full px-2 py-1 border border-gray-200 bg-white rounded text-sm outline-none focus:border-wine" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" value={data.costPrice} onChange={e => setVariantMatrix({...variantMatrix, [key]: {...data, costPrice: e.target.value}})} className="w-full px-2 py-1 border border-gray-200 bg-white rounded text-sm outline-none focus:border-wine" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" value={data.stock} onChange={e => setVariantMatrix({...variantMatrix, [key]: {...data, stock: e.target.value}})} className="w-full px-2 py-1 border border-gray-200 bg-white rounded text-sm outline-none focus:border-wine" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ─── BUNDLES & OFFERS ─── */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">4. Bundles & Offers</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-bold text-charcoal block mb-1">Featured Coupon Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. RAAGHAS10" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine transition-colors uppercase"
                  value={form.featuredCoupon}
                  onChange={e => setForm({...form, featuredCoupon: e.target.value.toUpperCase()})}
                />
                <p className="text-[10px] text-gray-400 mt-2 italic font-sans">This code will be highlighted on the product page for the user.</p>
              </div>

              <div>
                <label className="text-sm font-bold text-charcoal block mb-1">Bundle Product IDs</label>
                <input 
                  type="text" 
                  placeholder="ID1, ID2, ID3" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine transition-colors"
                  value={form.bundleIds}
                  onChange={e => setForm({...form, bundleIds: e.target.value})}
                />
                <p className="text-[10px] text-gray-400 mt-2 italic font-sans">Comma separated IDs of products for the 'Buy the Look' bundle.</p>
              </div>
            </div>
          </div>

        </div>

        {/* ─── RIGHT COLUMN (Organization & SEO) ─── */}
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Organization & Demographic</h3>
            <div>
              <label className="text-sm font-bold text-charcoal block mb-1">Category</label>
              <select 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine"
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
              >
                <option>New Arrivals</option>
                <option>Premium Lehengas</option>
                <option>Kalamkari Prints</option>
                <option>Bridal Wear</option>
                <option>Sarees</option>
                <option>Ready to Wear</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-charcoal block mb-2">
                Collections
                {selectedCollectionIds.length > 0 && (
                  <span className="ml-2 bg-wine text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {selectedCollectionIds.length}
                  </span>
                )}
              </label>
              {allCollections.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3 border border-gray-200 rounded-xl bg-gray-50">Loading...</p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 max-h-64 overflow-y-auto">
                  {/* Shop by Category */}
                  {allCollections.filter((c: any) => c.isVirtual).length > 0 && (
                    <div>
                      <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 bg-gray-100 border-b border-gray-200 sticky top-0">
                        Shop by Category
                      </p>
                      <div className="space-y-0">
                        {allCollections.filter((c: any) => c.isVirtual).map((c: any) => (
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
                            <span className="text-xs text-charcoal group-hover:text-wine transition-colors">{c.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Shop by Collection */}
                  {allCollections.filter((c: any) => !c.isVirtual).length > 0 && (
                    <div>
                      <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 bg-gray-100 border-b border-gray-200 border-t sticky top-0">
                        Shop by Collection
                      </p>
                      <div className="space-y-0">
                        {allCollections.filter((c: any) => !c.isVirtual).map((c: any) => (
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
                            <span className="text-xs text-charcoal group-hover:text-wine transition-colors">{c.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-bold text-charcoal block mb-1">Sub-Category</label>
              <input type="text" value={form.subCategory} onChange={e => setForm({...form, subCategory: e.target.value})} placeholder="e.g. Designer Silk" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine" />
            </div>
            <div>
              <label className="text-sm font-bold text-charcoal block mb-1">Gender</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine">
                <option>Women</option>
                <option>Men</option>
                <option>Unisex</option>
                <option>Kids</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-charcoal block mb-1">Age Group</label>
              <select value={form.ageGroup} onChange={e => setForm({...form, ageGroup: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine">
                <option>Adult</option>
                <option>Teen</option>
                <option>Child</option>
                <option>Infant</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-charcoal block mb-1">Tags</label>
              <input 
                type="text" 
                placeholder="Silk, Handwoven, Red" 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine"
                value={form.tags}
                onChange={e => setForm({...form, tags: e.target.value})}
              />
              <p className="text-[10px] text-gray-400 mt-1">Comma separated.</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Invoicing & Tax</h3>
            <div>
              <label className="text-sm font-bold text-charcoal block mb-1">HSN Code</label>
              <input type="text" value={form.hsnCode} onChange={e => setForm({...form, hsnCode: e.target.value.toUpperCase()})} placeholder="e.g. TEXTILE-00" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine uppercase" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">GST Tax Rate (%)</label>
              <select value={form.taxRate ? Number(form.taxRate).toFixed(2) : '12.00'} onChange={e => setForm({...form, taxRate: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine">
                <option value="0.00">0% (Nil Rated)</option>
                <option value="5.00">5%</option>
                <option value="12.00">12%</option>
                <option value="18.00">18%</option>
                <option value="28.00">28%</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-charcoal block mb-2">Tax Included in Price?</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="taxInclusive"
                    checked={form.taxInclusive === true}
                    onChange={() => setForm({...form, taxInclusive: true})}
                    className="accent-wine"
                  />
                  <span className="text-sm text-charcoal font-medium">Inclusive</span>
                  <span className="text-xs text-gray-400">(GST is part of the price shown)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="taxInclusive"
                    checked={form.taxInclusive === false}
                    onChange={() => setForm({...form, taxInclusive: false})}
                    className="accent-wine"
                  />
                  <span className="text-sm text-charcoal font-medium">Exclusive</span>
                  <span className="text-xs text-gray-400">(GST added on top at checkout)</span>
                </label>
              </div>
              {form.taxInclusive === false && (
                <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">
                  ⚠️ {form.taxRate}% GST will be added to the displayed price at checkout.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Search & SEO Preview</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Customize how this product appears on Google and sharing targets (WhatsApp, FB).</p>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">SEO Title</label>
              <input type="text" value={form.seoTitle} onChange={e => setForm({...form, seoTitle: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm" placeholder={form.title || "Meta Title..."} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Meta Description</label>
              <textarea rows={3} value={form.metaDescription} onChange={e => setForm({...form, metaDescription: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm resize-none" placeholder="Provide a highly converting description for search engines..." />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Search Keywords</label>
              <input type="text" value={form.searchKeywords} onChange={e => setForm({...form, searchKeywords: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm" placeholder="Internal search boosters..." />
            </div>
            <div className="pt-2 border-t border-gray-100">
               <p className="text-[10px] text-gray-400 font-mono break-all">https://raaghas.com/products/{form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || "handle"}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
