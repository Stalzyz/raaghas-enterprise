"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, Filter, Plus, CheckCircle, XCircle, Clock,
  Building2, Phone, Mail, MapPin, Star, MoreHorizontal,
  ChevronRight, Users, TrendingUp, Package, Loader2
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tier   = "SILVER" | "GOLD" | "PLATINUM" | "CUSTOM";
type Status = "PENDING" | "ACTIVE" | "SUSPENDED";

interface Retailer {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  tier: Tier;
  status: Status;
  priceList?: { name: string; discountPercent: number };
  _count?: { orders: number };
  createdAt: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_RETAILERS: Retailer[] = [
  {
    id: "r1", businessName: "Saree Shoppe Pvt. Ltd.", contactName: "Ramesh Gupta",
    email: "ramesh@sareeshoppe.in", phone: "+91 98765 43210",
    city: "Hyderabad", state: "Telangana", tier: "PLATINUM", status: "ACTIVE",
    priceList: { name: "Platinum Elite", discountPercent: 40 },
    _count: { orders: 24 }, createdAt: "2024-01-15",
  },
  {
    id: "r2", businessName: "Ethnic Threads Co.", contactName: "Priya Nair",
    email: "priya@ethnicthreads.com", phone: "+91 87654 32109",
    city: "Kochi", state: "Kerala", tier: "GOLD", status: "ACTIVE",
    priceList: { name: "Gold Standard", discountPercent: 30 },
    _count: { orders: 12 }, createdAt: "2024-03-22",
  },
  {
    id: "r3", businessName: "Chennai Boutique Hub", contactName: "Anand Krishnan",
    email: "anand@cbbhub.in", phone: "+91 76543 21098",
    city: "Chennai", state: "Tamil Nadu", tier: "SILVER", status: "PENDING",
    _count: { orders: 0 }, createdAt: "2024-09-05",
  },
  {
    id: "r4", businessName: "Mumbai Ethnic World", contactName: "Sonal Shah",
    email: "sonal@mumbaiethnic.com", phone: "+91 65432 10987",
    city: "Mumbai", state: "Maharashtra", tier: "GOLD", status: "SUSPENDED",
    priceList: { name: "Gold Standard", discountPercent: 30 },
    _count: { orders: 7 }, createdAt: "2024-05-10",
  },
];

// ─── Tier & Status Config ─────────────────────────────────────────────────────

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string }> = {
  PLATINUM: { label: "Platinum",  color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  GOLD:     { label: "Gold",      color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  SILVER:   { label: "Silver",    color: "text-gray-600",   bg: "bg-gray-50 border-gray-200"    },
  CUSTOM:   { label: "Custom",    color: "text-blue-700",   bg: "bg-blue-50 border-blue-200"    },
};

const STATUS_CONFIG: Record<Status, { label: string; icon: React.ReactNode; color: string }> = {
  ACTIVE:    { label: "Active",    icon: <CheckCircle size={12} />, color: "text-green-600 bg-green-50"   },
  PENDING:   { label: "Pending",   icon: <Clock       size={12} />, color: "text-yellow-600 bg-yellow-50" },
  SUSPENDED: { label: "Suspended", icon: <XCircle     size={12} />, color: "text-red-600 bg-red-50"       },
};

// ─── Add-Retailer Modal ───────────────────────────────────────────────────────

function AddRetailerModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (form: any) => void }) {
  const [form, setForm] = useState({ businessName: "", contactName: "", email: "", phone: "", city: "", state: "", gstNumber: "", tier: "SILVER" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSubmit(form);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-charcoal">Add New Retailer</h3>
            <p className="text-xs text-gray-400 mt-0.5">New accounts start as PENDING until approved.</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-charcoal"><XCircle size={20} /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {[
            { label: "Business Name", key: "businessName", placeholder: "Saree Shoppe Pvt. Ltd.", full: true },
            { label: "Contact Name",  key: "contactName",  placeholder: "Ramesh Gupta" },
            { label: "Email",         key: "email",        placeholder: "email@business.com" },
            { label: "Phone",         key: "phone",        placeholder: "+91 98765 43210" },
            { label: "City",          key: "city",         placeholder: "Hyderabad" },
            { label: "State",         key: "state",        placeholder: "Telangana" },
            { label: "GST Number",    key: "gstNumber",    placeholder: "29ABCDE1234F1Z5" },
          ].map(({ label, key, placeholder, full }) => (
            <div key={key} className={full ? "col-span-2" : ""}>
              <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">{label}</label>
              <input
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine"
                placeholder={placeholder}
                value={(form as any)[key]}
                onChange={e => set(key, e.target.value)}
              />
            </div>
          ))}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Tier</label>
            <select
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine"
              value={form.tier}
              onChange={e => set("tier", e.target.value)}
            >
              {Object.keys(TIER_CONFIG).map(t => <option key={t} value={t}>{TIER_CONFIG[t as Tier].label}</option>)}
            </select>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-wine text-white text-xs font-bold uppercase tracking-widest hover:bg-charcoal rounded-lg transition-colors flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RetailerDirectory() {
  const { token } = useAdminAuth();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tierFilter, setTierFilter]     = useState<string>("ALL");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchRetailers();
  }, [statusFilter, tierFilter, search]);

  const fetchRetailers = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (tierFilter !== "ALL") params.append("tier", tierFilter);
      if (search) params.append("search", search);

      if (search) params.append("search", search);
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/wholesale/retailers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch retailers");
      const data = await res.json();
      setRetailers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRetailer = async (form: any) => {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/wholesale/retailers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        fetchRetailers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = retailers; // Already filtered by backend

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = [
    { label: "Total Retailers",  value: retailers.length,                                  icon: <Users size={20} />,     color: "text-blue-600 bg-blue-50"   },
    { label: "Active Accounts",  value: retailers.filter(r => r.status === "ACTIVE").length,  icon: <CheckCircle size={20} />, color: "text-green-600 bg-green-50"  },
    { label: "Pending Approval", value: retailers.filter(r => r.status === "PENDING").length, icon: <Clock size={20} />,      color: "text-yellow-600 bg-yellow-50" },
    { label: "Total B2B Orders", value: retailers.reduce((s, r) => s + (r._count?.orders || 0), 0), icon: <Package size={20} />, color: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="space-y-8">
      {showModal && <AddRetailerModal onClose={() => setShowModal(false)} onSubmit={handleCreateRetailer} />}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Retailer Directory</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your wholesale accounts, tiers, and approval status.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-wine text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-colors"
        >
          <Plus size={16} /> Add Retailer
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-wine" size={40} />
        </div>
      ) : (
        <>
          {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
            <div className={`p-3 rounded-xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-charcoal">{s.value}</p>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by business name or city..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-wine"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest outline-none focus:border-wine"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value)}
            className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest outline-none focus:border-wine"
          >
            <option value="ALL">All Tiers</option>
            <option value="PLATINUM">Platinum</option>
            <option value="GOLD">Gold</option>
            <option value="SILVER">Silver</option>
          </select>
        </div>
      </div>

          {/* Retailer Cards */}
          <div className="space-y-3">
            {filtered.map(retailer => {
              const tier   = TIER_CONFIG[retailer.tier];
              const status = STATUS_CONFIG[retailer.status];
              return (
                <div key={retailer.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-wine/20 hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row md:items-center gap-5">
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-wine/10 to-beige rounded-xl flex items-center justify-center text-wine font-bold text-lg flex-shrink-0">
                        {retailer.businessName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-charcoal">{retailer.businessName}</h3>
                        <p className="text-xs text-gray-400">{retailer.contactName}</p>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="hidden md:flex flex-col gap-1 flex-1">
                      <p className="text-xs flex items-center gap-2 text-gray-500"><Mail size={12} /> {retailer.email}</p>
                      <p className="text-xs flex items-center gap-2 text-gray-500"><Phone size={12} /> {retailer.phone}</p>
                    </div>

                    {/* Location */}
                    <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 flex-1">
                      <MapPin size={12} className="text-gray-300" />
                      {retailer.city}, {retailer.state}
                    </div>

                    {/* Tier Badge */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${tier.bg} ${tier.color}`}>
                      <Star size={10} />
                      {tier.label}
                    </div>

                    {/* Status Badge */}
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${status.color}`}>
                      {status.icon} {status.label}
                    </div>

                    {/* Orders count */}
                    <div className="text-center hidden md:block">
                      <p className="text-lg font-bold text-charcoal">{retailer._count?.orders || 0}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Orders</p>
                    </div>

                    {/* Action */}
                    <Link
                      href={`/wholesale/retailers/${retailer.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-charcoal text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-wine transition-colors"
                    >
                      View <ChevronRight size={14} />
                    </Link>
                  </div>

                  {/* Price List Tag */}
                  {retailer.priceList && (
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                      <TrendingUp size={12} className="text-wine" />
                      <span className="text-[10px] text-gray-400">Price List:</span>
                      <span className="text-[10px] font-bold text-charcoal">{retailer.priceList.name}</span>
                      <span className="text-[10px] text-wine font-bold">({retailer.priceList.discountPercent}% off MRP)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-24 bg-gray-50 rounded-2xl">
              <Building2 size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-charcoal font-bold">No retailers found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
