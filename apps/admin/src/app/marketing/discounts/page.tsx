"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { Plus, Tag, Search, ToggleRight, ToggleLeft, Edit3, Trash2, Calendar, Users, X, Percent, IndianRupee, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

interface Discount {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  minOrderValue?: number;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
}

function CreateDiscountModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (form: any) => void }) {
  const [form, setForm] = useState({
    code: "", type: "PERCENTAGE", value: 10, minOrderValue: 0, maxUses: "", expiresAt: "",
    autoApply: false, applicableCategoriesText: "", minQuantity: ""
  });

  const handleSubmit = () => {
    const payload = {
      ...form,
      minQuantity: form.minQuantity ? Number(form.minQuantity) : null,
      applicableCategories: form.applicableCategoriesText ? form.applicableCategoriesText.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    };
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-charcoal">Create Discount Code</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-charcoal"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-5">
          {/* Code */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Discount Code</label>
            <input
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold uppercase outline-none focus:border-wine"
              placeholder="E.g. SUMMER25"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
            />
            <p className="text-[10px] text-gray-400 mt-1">Customers will enter this at checkout.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Type</label>
              <select
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
              </select>
            </div>
            {/* Value */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Value</label>
              <div className="relative">
                <input
                  type="number" min={1}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-10 text-sm outline-none focus:border-wine"
                  value={form.value}
                  onChange={e => setForm({ ...form, value: Number(e.target.value) })}
                />
                {form.type === "PERCENTAGE" ? (
                  <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                ) : (
                  <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-5">
            {/* Minimum Spend */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Minimum Spend (₹)</label>
              <input
                type="number" min={0} placeholder="0 = No limit"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine"
                value={form.minOrderValue || ''}
                onChange={e => setForm({ ...form, minOrderValue: Number(e.target.value) })}
              />
            </div>
            {/* Max Uses */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Usage Limit</label>
              <input
                type="number" min={1} placeholder="Empty = Unlimited"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine"
                value={form.maxUses}
                onChange={e => setForm({ ...form, maxUses: e.target.value })}
              />
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Expiration Date (Optional)</label>
            <input
              type="date"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine"
              value={form.expiresAt}
              onChange={e => setForm({ ...form, expiresAt: e.target.value })}
            />
          </div>
          {/* Automated Offers / Collections */}
          <div className="bg-wine/5 border border-wine/10 p-5 rounded-xl space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.autoApply}
                onChange={e => setForm({ ...form, autoApply: e.target.checked })}
                className="w-4 h-4 rounded text-wine focus:ring-wine"
              />
              <span className="text-sm font-bold text-wine">Auto-Apply this offer (No code needed)</span>
            </label>
            
            {form.autoApply && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-wine block mb-1.5">Applicable Collections</label>
                  <input
                    placeholder="e.g. Bridal, Festive (Comma separated)"
                    className="w-full bg-white border border-wine/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine"
                    value={form.applicableCategoriesText}
                    onChange={e => setForm({ ...form, applicableCategoriesText: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-wine block mb-1.5">Min Item Quantity</label>
                  <input
                    type="number" min={1} placeholder="e.g. 3"
                    className="w-full bg-white border border-wine/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine"
                    value={form.minQuantity}
                    onChange={e => setForm({ ...form, minQuantity: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="px-5 py-2.5 bg-wine text-white text-xs font-bold uppercase tracking-widest hover:bg-charcoal rounded-xl transition-colors disabled:opacity-50" disabled={!form.code}>
            Generate Code
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DiscountManager() {
  const { token } = useAdminAuth();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDiscounts = async () => {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/marketing/discounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setDiscounts(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDiscounts();
  }, [token]);

  const toggleStatus = async (id: string) => {
    // Optimistic update
    setDiscounts(discounts.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d));
    try {
      const baseUrl = API_BASE;
      await fetch(`${baseUrl}/marketing/discounts/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      // Revert if error
      setDiscounts(discounts.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d));
    }
  };

  const deleteDiscount = async (id: string) => {
    if (!confirm("Delete this discount code permanently?")) return;
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/marketing/discounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDiscounts(discounts.filter(d => d.id !== id));
      } else {
        alert("Failed to delete discount.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDiscount = async (form: any) => {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/marketing/discounts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        fetchDiscounts();
      } else {
        alert("Failed to create discount code.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = discounts.filter(d => !search || d.code.includes(search.toUpperCase()));

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-wine" size={32} /></div>;
  }

  return (
    <div className="space-y-8">
      {showModal && <CreateDiscountModal onClose={() => setShowModal(false)} onSubmit={handleCreateDiscount} />}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Discount Engine</h2>
          <p className="text-gray-500 text-sm mt-1">Manage discount codes, usage limits, and campaigns.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-wine text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-colors">
          <Plus size={16} /> New Code
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center relative">
        <Search size={16} className="absolute left-7 text-gray-300" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search codes (e.g. FESTIVE20)..."
          className="w-full pl-10 pr-4 py-2 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map(d => {
          const isExpired = d.expiresAt && new Date() > new Date(d.expiresAt);
          const isDepleted = d.usageLimit !== null && d.usedCount >= d.usageLimit;
          const statusRed = !d.isActive || isExpired || isDepleted;
          
          return (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-wine/20 transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${statusRed ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600'}`}>
                    <Tag size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-mono tracking-widest text-charcoal">{d.code}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${statusRed ? 'bg-red-400' : 'bg-green-400'}`} />
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        {!d.isActive ? "Disabled" : isExpired ? "Expired" : isDepleted ? "Depleted" : "Active"}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleStatus(d.id)} className={`p-1 transition-colors ${d.isActive ? 'text-green-500' : 'text-gray-300'}`}>
                    {d.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                  <button onClick={() => deleteDiscount(d.id)} className="p-2 border border-gray-100 rounded-xl text-gray-300 hover:border-red-200 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Reward Block */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-wine mr-1">
                  {d.type === "FIXED_AMOUNT" && "₹"}
                  {d.value}
                  {d.type === "PERCENTAGE" && "%"}
                </span>
                <span className="text-sm font-bold text-wine ml-2 uppercase tracking-widest">OFF</span>
              </div>

              {/* Rules & Stats Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm border-t border-gray-50 pt-4">
                <div className="flex items-center gap-2 text-gray-500">
                  <IndianRupee size={14} className="text-gray-400" />
                  <span>Min Spend: <strong className="text-charcoal">{d.minOrderValue ? `₹${d.minOrderValue.toLocaleString()}` : 'None'}</strong></span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar size={14} className="text-gray-400" />
                  <span>Expires: <strong className="text-charcoal">{d.expiresAt || 'Never'}</strong></span>
                </div>

                <div className="flex items-center gap-2 text-gray-500 col-span-2">
                  <Users size={14} className="text-gray-400" />
                  <span>Redemptions: <strong className="text-charcoal">{d.usedCount}</strong> {d.usageLimit ? `/ ${d.usageLimit}` : '(Unlimited)'}</span>
                </div>
                
                {d.usageLimit !== null && d.usageLimit > 0 && (
                  <div className="col-span-2 mt-2 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-wine h-full rounded-full transition-all" style={{ width: `${Math.min((d.usedCount / d.usageLimit) * 100, 100)}%` }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {filtered.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
          <Tag size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-bold text-charcoal">No discount codes found.</p>
        </div>
      )}
    </div>
  );
}
