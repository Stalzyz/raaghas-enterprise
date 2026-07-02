"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Trash2, Save, ShoppingBag, Receipt, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";

interface OrderItem {
  variantId: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  mrp: number;
}

export default function NewWholesaleOrder() {
  const { token } = useAdminAuth();
  const router = useRouter();
  
  const [retailers, setRetailers] = useState<any[]>([]);
  const [retailerId, setRetailerId] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  
  const [items, setItems] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [retRes, invRes] = await Promise.all([
          fetch(`${API_BASE}/wholesale/retailers`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/inventory/grid`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        if (retRes.ok) {
          const retData = await retRes.json();
          setRetailers(retData);
          if (retData.length > 0) setRetailerId(retData[0].id);
        }
        
        if (invRes.ok) {
          const invData = await invRes.json();
          setProducts(invData.map((v: any) => ({
            id: v.id,
            productId: v.productId,
            name: v.product?.title || "Unknown Product",
            sku: v.sku,
            mrp: Number(v.price) || 0
          })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchData();
  }, [token]);

  const activeRetailer = retailers.find(r => r.id === retailerId);
  const discountRate = activeRetailer?.priceList?.discountPercent || 0;

  const addItem = (prod: any) => {
    const exists = items.find(i => i.variantId === prod.id);
    if (exists) {
      setItems(items.map(i => i.variantId === prod.id ? { ...i, quantity: i.quantity + 5 } : i));
    } else {
      setItems([...items, { variantId: prod.id, productId: prod.productId, name: prod.name, sku: prod.sku, quantity: 5, mrp: prod.mrp }]);
    }
  };

  const updateQuantity = (variantId: string, q: number) => {
    if (q <= 0) {
      setItems(items.filter(i => i.variantId !== variantId));
    } else {
      setItems(items.map(i => i.variantId === variantId ? { ...i, quantity: q } : i));
    }
  };

  const remove = (variantId: string) => setItems(items.filter(i => i.variantId !== variantId));

  const totalMrp = items.reduce((acc, i) => acc + (i.mrp * i.quantity), 0);
  const totalWholesale = items.reduce((acc, i) => {
    const discountedPrice = i.mrp * (1 - discountRate / 100);
    return acc + (discountedPrice * i.quantity);
  }, 0);
  const savings = totalMrp - totalWholesale;

  const handleSave = async () => {
    if (!retailerId || items.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/wholesale/orders/draft`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          retailerId,
          notes,
          items: items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }))
        })
      });
      if (res.ok) {
        const order = await res.json();
        router.push(`/wholesale/orders/${order.id}`);
      } else {
        alert("Failed to create draft.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-wine" size={40} /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/wholesale/orders" className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-400">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-charcoal">Create Draft Order</h2>
            <p className="text-gray-500 text-sm mt-1">Select products and auto-apply wholesale tier discounts.</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={items.length === 0 || isSubmitting} className="flex items-center gap-2 bg-wine text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-colors disabled:opacity-50">
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save as Draft
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Builder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">1. Select Retailer</h3>
            <select
              value={retailerId}
              onChange={e => setRetailerId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-wine"
            >
              <option value="" disabled>Select a retailer</option>
              {retailers.map(r => (
                <option key={r.id} value={r.id}>{r.businessName} — {r.tier} ({r.priceList?.discountPercent || 0}% off MRP)</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">2. Add Products</h3>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products by Item Code or name..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-wine"
              />
            </div>
            
            {search && (
              <div className="mt-2 border border-wine/20 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-60 overflow-y-auto">
                {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => { addItem(p); setSearch(""); }} className="w-full flex justify-between items-center p-3 hover:bg-wine/5 text-left transition-colors">
                    <div>
                      <p className="text-sm font-bold text-charcoal">{p.name}</p>
                      <p className="text-[10px] uppercase font-bold text-gray-400">{p.sku} • MRP ₹{p.mrp}</p>
                    </div>
                    <Plus size={16} className="text-wine" />
                  </button>
                ))}
                {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                  <div className="p-4 text-center text-xs text-gray-400">No products found.</div>
                )}
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-gray-100">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Quantity</th>
                    <th className="pb-3 text-right">Unit Price</th>
                    <th className="pb-3 text-right">Total</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(item => {
                    const discountedUnit = item.mrp * (1 - discountRate / 100);
                    const rowTotal = discountedUnit * item.quantity;
                    return (
                      <tr key={item.variantId}>
                        <td className="py-4">
                          <p className="text-sm font-bold text-charcoal">{item.name}</p>
                          <p className="text-[10px] text-gray-400">{item.sku}</p>
                        </td>
                        <td className="py-4">
                          <input
                            type="number" min={1}
                            value={item.quantity}
                            onChange={e => updateQuantity(item.variantId, parseInt(e.target.value))}
                            className="w-20 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-wine text-center"
                          />
                        </td>
                        <td className="py-4 text-right">
                          <p className="text-sm font-bold text-wine">₹{discountedUnit.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 line-through">₹{item.mrp}</p>
                        </td>
                        <td className="py-4 text-right">
                          <p className="text-sm font-bold text-charcoal">₹{rowTotal.toLocaleString()}</p>
                        </td>
                        <td className="py-4 text-right">
                          <button onClick={() => remove(item.variantId)} className="text-gray-300 hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No products added yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Order Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Retailer</span>
                <span className="font-bold text-charcoal text-right">{activeRetailer?.businessName || "None"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Applied Tier</span>
                <span className="font-bold text-wine uppercase tracking-widest text-[10px] mt-0.5">{activeRetailer?.tier || "NONE"} ({discountRate}%)</span>
              </div>
              <div className="pt-3 border-t border-gray-50 flex justify-between text-sm">
                <span className="text-gray-500">Total Items</span>
                <span className="font-bold text-charcoal">{items.reduce((a, b) => a + b.quantity, 0)} pieces</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total MRP Value</span>
                <span className="font-medium text-gray-400 line-through">₹{totalMrp.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-wine font-medium">B2B Discount</span>
                <span className="font-bold text-wine">- ₹{savings.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
              <span className="text-sm font-bold text-charcoal">Net Payable</span>
              <span className="text-3xl font-bold text-charcoal">₹{totalWholesale.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Order Notes</h3>
            <textarea
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine resize-none"
              placeholder="E.g., Require priority dispatch..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
