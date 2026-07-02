"use client";

import { API_BASE } from "@/lib/api";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import {
  ArrowLeft, Edit3, CheckCircle, XCircle, AlertTriangle,
  Mail, Phone, MapPin, Building2, Star, CreditCard,
  MessageSquare, Package, Calendar, Save, Send, Loader2
} from "lucide-react";

// ─── Constants & Utils ───────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  PLATINUM: "text-purple-700 bg-purple-50 border-purple-200",
  GOLD:     "text-yellow-700 bg-yellow-50 border-yellow-200",
  SILVER:   "text-gray-600   bg-gray-50   border-gray-200",
  CUSTOM:   "text-blue-700   bg-blue-50   border-blue-200",
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  DRAFT:            "bg-gray-100 text-gray-600",
  QUOTE_SENT:       "bg-blue-50 text-blue-700",
  ADVANCE_RECEIVED: "bg-yellow-50 text-yellow-700",
  IN_PRODUCTION:    "bg-orange-50 text-orange-700",
  READY_TO_SHIP:    "bg-purple-50 text-purple-700",
  DELIVERED:        "bg-green-50 text-green-700",
  CANCELLED:        "bg-red-50 text-red-600",
};

export default function RetailerProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { token } = useAdminAuth();
  const [retailer, setRetailer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  
  const [form, setForm] = useState<any>({});
  const [priceLists, setPriceLists] = useState<any[]>([]);

  const fetchRetailer = async () => {
    try {
      
      const res = await fetch(`${API_BASE}/wholesale/retailers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load retailer profile.");
      const data = await res.json();
      setRetailer(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceLists = async () => {
    try {
      
      const res = await fetch(`${API_BASE}/wholesale/price-lists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setPriceLists(await res.json());
    } catch (err) {}
  };

  useEffect(() => { 
    fetchRetailer(); 
    fetchPriceLists(); 
  }, [id]);

  useEffect(() => {
    if (retailer) {
      setForm({
        tier: retailer.tier,
        priceListId: retailer.priceListId,
        creditLimit: retailer.creditLimit,
        creditTermDays: retailer.creditTermDays,
        notes: retailer.notes || ""
      });
    }
  }, [retailer]);

  const updateStatus = async (status: 'approve' | 'suspend') => {
    setSaving(true);
    try {
      
      const res = await fetch(`${API_BASE}/wholesale/retailers/${id}/${status}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Failed to ${status} retailer.`);
      await fetchRetailer();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (updates: any) => {
    setSaving(true);
    try {
      
      const res = await fetch(`${API_BASE}/wholesale/retailers/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error("Failed to update profile.");
      await fetchRetailer();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onSave = () => handleUpdate(form);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-wine" size={32} /></div>;
  if (error || !retailer) return <div className="p-10 text-center text-red-500 bg-red-50 rounded-2xl">{error || "Retailer not found"}</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/wholesale/retailers" className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-400">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-14 h-14 bg-gradient-to-br from-wine/10 to-beige rounded-2xl flex items-center justify-center text-wine font-bold text-xl uppercase">
            {retailer.businessName?.charAt(0) || "R"}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-charcoal">{retailer.businessName}</h2>
            <p className="text-gray-400 text-sm italic">{retailer.status}</p>
          </div>
          <div className={`ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${TIER_COLOR[retailer.tier] || "text-gray-600 bg-gray-50 border-gray-200"}`}>
            <Star size={10} /> {retailer.tier}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {retailer.status === "PENDING" && (
            <button 
              disabled={saving}
              onClick={() => updateStatus('approve')}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />} Approve Partner
            </button>
          )}
          {retailer.status === "ACTIVE" && (
            <button 
              disabled={saving}
              onClick={() => updateStatus('suspend')}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <XCircle size={14} /> Suspend Access
            </button>
          )}
          <button 
            disabled={saving}
            onClick={onSave}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors ${saving ? "bg-green-500 text-white" : "bg-wine text-white hover:bg-charcoal"}`}>
            {saving ? <><Loader2 className="animate-spin" size={14} /> Saving</> : <><Save size={14} /> Update Partner</>}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left — Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Contact Details</h3>
            <div className="grid grid-cols-2 gap-5">
              {[
                { icon: <Building2 flex-shrink-0 size={16} />, label: "Business Name", value: retailer.businessName },
                { icon: <Star       flex-shrink-0 size={16} />, label: "Contact Name",  value: retailer.contactName  },
                { icon: <Mail       flex-shrink-0 size={16} />, label: "Email",         value: retailer.email        },
                { icon: <Phone      flex-shrink-0 size={16} />, label: "Phone",         value: retailer.phone        },
                { icon: <MapPin     flex-shrink-0 size={16} />, label: "City / State",  value: `${retailer.city || ""}, ${retailer.state || ""}` },
                { icon: <CreditCard flex-shrink-0 size={16} />, label: "GST Number",    value: retailer.gstNumber    },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-400 flex-shrink-0">{icon}</div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-300 tracking-widest">{label}</p>
                    <p className="text-sm font-bold text-charcoal mt-0.5">{value || "N/A"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Wholesale Orders ({retailer._count?.orders || 0})</h3>
              <Link href={`/wholesale/orders/new?retailerId=${retailer.id}`} className="text-xs font-bold text-wine uppercase tracking-widest border-b border-wine pb-0.5 hover:text-charcoal hover:border-charcoal transition-colors">
                + New Order
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {retailer.orders?.map((order: any) => (
                <div key={order.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Package size={16} className="text-gray-300" />
                    <div>
                      <p className="text-sm font-bold text-charcoal uppercase text-[10px]">#{order.id?.slice(-6) || "N/A"}</p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1"><Calendar size={10} /> {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}</p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${ORDER_STATUS_COLOR[order.status] || "bg-gray-100 text-gray-600"}`}>
                    {order.status?.replace(/_/g, " ") || "UNKNOWN"}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-charcoal">₹{order.totalAmount?.toLocaleString() || 0}</p>
                  </div>
                </div>
              ))}
              {(!retailer.orders || retailer.orders.length === 0) && <p className="py-10 text-center text-xs text-gray-400 italic">No orders yet</p>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Internal Notes</h3>
            <textarea 
              rows={4}
              value={form.notes || ""}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Add a note, call log, or update..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine resize-none"
            />
          </div>
        </div>

        {/* Right — Sidebar Details */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Account Settings</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Account Tier</label>
              <select
                value={form.tier || "SILVER"}
                onChange={e => setForm({ ...form, tier: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine"
              >
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Assigned Price List</label>
              <select 
                value={form.priceListId || ""}
                onChange={e => setForm({ ...form, priceListId: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine"
              >
                <option value="">No Special Price List</option>
                {priceLists.map(pl => (
                  <option key={pl.id} value={pl.id}>{pl.name} ({pl.discountPercent}% off)</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Credit Limit (₹)</label>
                <input 
                  type="number" 
                  value={form.creditLimit || 0}
                  onChange={e => setForm({ ...form, creditLimit: parseFloat(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Credit Terms</label>
                <select 
                  value={form.creditTermDays || 0}
                  onChange={e => setForm({ ...form, creditTermDays: parseInt(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine"
                >
                  <option value={0}>No Credit</option>
                  <option value={15}>Net-15</option>
                  <option value={30}>Net-30</option>
                  <option value={60}>Net-60</option>
                </select>
              </div>
            </div>

            <button 
              onClick={onSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-charcoal text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-wine transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Settings
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4 text-center">
             <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
               <MessageSquare size={20} />
             </div>
             <div>
               <h4 className="text-sm font-bold text-charcoal">Handshake Portal</h4>
               <p className="text-xs text-gray-400 mt-1">Direct communication with boutique owner via WhatsApp.</p>
             </div>
             <button className="w-full py-3 bg-green-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-green-600 transition-colors">
               Launch WhatsApp Chat
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
