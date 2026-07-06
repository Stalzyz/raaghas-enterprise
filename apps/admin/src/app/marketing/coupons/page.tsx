"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import { Zap, Plus, Search, Trash2, Edit2, Tag, Calendar, Users, Percent, IndianRupee, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import AutomatedOffers from "../offers/page";

export default function CouponManagement() {
  const { token } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'COUPONS' | 'OFFERS'>('COUPONS');
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    type: "PERCENTAGE",
    value: 10,
    minOrderValue: 0,
    maxDiscount: 0,
    usageLimit: 1000,
    usageLimitPerUser: 1,
    startDate: "",
    endDate: "",
    autoApply: false,
    minQuantity: 0,
  });

  const fetchCoupons = async () => {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/growth/coupons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCoupons(data);
        } else {
          setCoupons([]);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCoupons(); }, [token]);

  const handleCreate = async () => {
    try {
      if (!newCoupon.code.trim()) {
        alert("Please enter a valid coupon code.");
        return;
      }

      const baseUrl = API_BASE;
      const url = editingId ? `${baseUrl}/growth/coupons/${editingId}` : `${baseUrl}/growth/coupons`;
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(newCoupon)
      });
      
      if (res.ok) {
        fetchCoupons();
        setShowAddModal(false);
        setEditingId(null);
        setNewCoupon({
          code: "", type: "PERCENTAGE", value: 10, minOrderValue: 0,
          maxDiscount: 0, usageLimit: 1000, usageLimitPerUser: 1, startDate: "", endDate: "",
          autoApply: false, minQuantity: 0,
        });
      } else {
        const err = await res.json();
        alert(err.message || "Failed to save coupon. The code might already exist.");
      }
    } catch (err: any) { 
      console.error(err);
      alert("A network error occurred. Please try again.");
    }
  };

  const handleEdit = (coupon: any) => {
    setEditingId(coupon.id);
    setNewCoupon({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrderValue: coupon.minOrderValue || 0,
      maxDiscount: coupon.maxDiscount || 0,
      usageLimit: coupon.usageLimit || 1000,
      usageLimitPerUser: coupon.usageLimitPerUser || 1,
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : "",
      endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split('T')[0] : "",
      autoApply: coupon.autoApply || false,
      minQuantity: coupon.minQuantity || 0,
    });
    setShowAddModal(true);
  };

  const handleToggle = async (id: string) => {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/growth/coupons/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchCoupons();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/growth/coupons/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCoupons(prev => prev.filter((c: any) => c.id !== id));
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to delete coupon: ${errorData.message || res.statusText}`);
      }
    } catch (err: any) { 
      console.error(err); 
      alert("Error deleting coupon: " + err.message);
    }
  };

  const filtered = Array.isArray(coupons) ? coupons.filter(c => (c.code || "").toLowerCase().includes(search.toLowerCase())) : [];

  return (
    <div className="space-y-8">
      {/* Header and Tabs */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-charcoal">Discounts &amp; Offers</h2>
            <p className="text-gray-500 text-sm mt-1">Manage manual coupons and automated marketing rules.</p>
          </div>
          {activeTab === 'COUPONS' && (
            <button 
              onClick={() => {
                setEditingId(null);
                setNewCoupon({
                  code: "", type: "PERCENTAGE", value: 10, minOrderValue: 0, maxDiscount: 0,
                  usageLimit: 1000, usageLimitPerUser: 1, startDate: "", endDate: "", autoApply: false, minQuantity: 0,
                });
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 bg-wine text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-all shadow-lg shadow-wine/20"
            >
              <Plus size={16} /> Create New Coupon
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <button
            onClick={() => setActiveTab('COUPONS')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-all ${
              activeTab === 'COUPONS' ? 'text-wine border-b-2 border-wine' : 'text-gray-400 hover:text-charcoal'
            }`}
          >
            Coupon Codes
          </button>
          <button
            onClick={() => setActiveTab('OFFERS')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-all ${
              activeTab === 'OFFERS' ? 'text-wine border-b-2 border-wine' : 'text-gray-400 hover:text-charcoal'
            }`}
          >
            Automated Offers
          </button>
        </div>
      </div>

      {activeTab === 'OFFERS' ? (
        <AutomatedOffers />
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by coupon code..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-wine"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-wine" size={32} /></div>
        ) : filtered.map(coupon => (
          <div key={coupon.id} className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-wine/5 rounded-bl-[4rem] -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
            
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-wine/10 text-wine rounded-2xl">
                {coupon.type === 'PERCENTAGE' ? <Percent size={20} /> : <IndianRupee size={20} />}
              </div>
              <div className="flex gap-2 relative z-10">
                <button onClick={() => handleEdit(coupon)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleToggle(coupon.id)} className={`p-2 transition-colors ${coupon.isActive ? 'text-wine hover:text-charcoal' : 'text-gray-300 hover:text-wine'}`} title={coupon.isActive ? "Pause Coupon" : "Activate Coupon"}>
                  {coupon.isActive ? <ToggleRight size={22} className="text-wine" /> : <ToggleLeft size={22} />}
                </button>
                <button onClick={() => handleDelete(coupon.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-1 mb-6">
              <h3 className="text-xl font-bold text-charcoal tracking-tight uppercase">{coupon.code}</h3>
              <p className="text-xs font-bold text-wine uppercase tracking-widest">
                {coupon.type === 'PERCENTAGE' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                {coupon.autoApply && <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px]">AUTO APPLY</span>}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-50">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Users size={10} /> Usage
                </p>
                <p className="text-sm font-bold text-charcoal">{coupon.usedCount} / {coupon.usageLimit || '∞'}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 justify-end">
                  <Calendar size={10} /> Status
                </p>
                {(() => {
                  const isExpired = coupon.endDate && new Date(coupon.endDate) < new Date();
                  if (isExpired) {
                    return (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-gray-50 text-gray-500 border border-gray-200">
                        Expired
                      </span>
                    );
                  }
                  return (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${coupon.isActive ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                      {coupon.isActive ? 'Active' : 'Paused'}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal - Simplified */}
      {showAddModal && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl space-y-6">
            <h3 className="text-2xl font-bold text-charcoal tracking-tight">
              {editingId ? "Edit Coupon" : "Create Coupon"}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Coupon Code</label>
                <input 
                  value={newCoupon.code}
                  onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                  placeholder="E.g. WELCOME10"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-wine"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Type</label>
                <select 
                  value={newCoupon.type}
                  onChange={e => setNewCoupon({...newCoupon, type: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-wine"
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED_AMOUNT">Flat Amount</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Value</label>
                <input 
                  type="number"
                  value={newCoupon.value}
                  onChange={e => setNewCoupon({...newCoupon, value: parseFloat(e.target.value)})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-wine"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Minimum Order Value</label>
                <input 
                  type="number"
                  min="0"
                  value={newCoupon.minOrderValue}
                  onChange={e => setNewCoupon({...newCoupon, minOrderValue: parseInt(e.target.value)})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-wine"
                />
              </div>

              {newCoupon.type === "PERCENTAGE" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Max Discount Amount</label>
                  <input 
                    type="number"
                    min="0"
                    value={newCoupon.maxDiscount}
                    onChange={e => setNewCoupon({...newCoupon, maxDiscount: parseInt(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-wine"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Minimum Quantity</label>
                <input 
                  type="number"
                  min="0"
                  value={newCoupon.minQuantity}
                  onChange={e => setNewCoupon({...newCoupon, minQuantity: parseInt(e.target.value)})}
                  placeholder="e.g. 5 for Buy 5"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-wine"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Total Usage Limit</label>
                <input 
                  type="number"
                  min="1"
                  value={newCoupon.usageLimit}
                  onChange={e => setNewCoupon({...newCoupon, usageLimit: parseInt(e.target.value)})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-wine"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Usage per user</label>
                <input 
                  type="number"
                  min="1"
                  value={newCoupon.usageLimitPerUser}
                  onChange={e => setNewCoupon({...newCoupon, usageLimitPerUser: parseInt(e.target.value)})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-wine"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={newCoupon.autoApply}
                    onChange={e => setNewCoupon({...newCoupon, autoApply: e.target.checked})}
                    className="w-4 h-4 text-wine bg-white border-gray-300 rounded focus:ring-wine"
                  />
                  <span className="text-sm font-bold text-charcoal">Auto-Apply this coupon</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-6 py-3 border border-gray-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-6 py-3 bg-wine text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-charcoal transition-all shadow-lg shadow-wine/20">
                {editingId ? "Update Coupon" : "Generate Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
