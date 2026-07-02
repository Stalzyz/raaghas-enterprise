"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { 
  Plus, Search, Filter, Truck, Mail, Phone, MapPin, 
  ExternalLink, MoreHorizontal, Loader2, Building2,
  XCircle, Trash2
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  address?: string;
  category?: string;
  _count?: {
    purchaseOrders: number;
  };
}

function AddSupplierModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (form: any) => void }) {
  const [form, setForm] = useState({ name: "", contactPerson: "", email: "", phone: "", address: "", category: "Raw Materials", gstNumber: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name) return alert("Company name is required");
    setIsSubmitting(true);
    await onSubmit(form);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-charcoal">Add New Supplier</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-charcoal"><XCircle size={20} /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Company Name</label>
            <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine" placeholder="e.g. Luxury Weaves Ltd." value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Contact Person</label>
            <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine" placeholder="John Doe" value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Category</label>
            <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine" placeholder="e.g. Raw Materials" value={form.category} onChange={e => set("category", e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Email</label>
            <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Phone</label>
            <input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine" value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Full Address</label>
            <textarea className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine" rows={2} value={form.address} onChange={e => set("address", e.target.value)} />
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="px-5 py-2.5 bg-wine text-white text-xs font-bold uppercase tracking-widest hover:bg-charcoal rounded-lg transition-colors flex items-center gap-2">
            {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : "Register Supplier"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuppliersDirectory() {
  const { token } = useAdminAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (token) fetchSuppliers();
  }, [token]);

  const fetchSuppliers = async () => {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/procurement/suppliers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSupplier = async (form: any) => {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/procurement/suppliers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        fetchSuppliers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSupplier = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/procurement/suppliers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSuppliers();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to delete supplier");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting the supplier");
    }
  };

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.category?.toLowerCase() || "").includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        {showModal && <AddSupplierModal onClose={() => setShowModal(false)} onSubmit={handleAddSupplier} />}
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Supplier Directory</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your vendors, fabric sources, and tailoring partners.</p>
        </div>
        <button
          className="flex items-center gap-2 bg-wine text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search suppliers by name or category..."
            className="w-full pl-12 pr-4 py-3 bg-transparent text-sm focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-3 border-l border-gray-100 text-gray-400 hover:text-wine transition-colors">
          <Filter size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">Filter</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-wine" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(supplier => (
            <div key={supplier.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-wine/20 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-beige rounded-xl flex items-center justify-center text-wine">
                  <Truck size={24} />
                </div>
                <button 
                  onClick={(e) => handleDeleteSupplier(supplier.id, e)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  title="Delete Supplier"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="font-bold text-charcoal text-lg group-hover:text-wine transition-colors">{supplier.name}</h3>
                <span className="inline-block px-2 py-0.5 bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400 rounded">
                  {supplier.category || "General Vendor"}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                {supplier.email && (
                  <p className="flex items-center gap-3 text-xs text-gray-500">
                    <Mail size={14} className="text-gray-300" /> {supplier.email}
                  </p>
                )}
                {supplier.phone && (
                  <p className="flex items-center gap-3 text-xs text-gray-500">
                    <Phone size={14} className="text-gray-300" /> {supplier.phone}
                  </p>
                )}
                <p className="flex items-center gap-3 text-xs text-gray-500">
                  <MapPin size={14} className="text-gray-300" /> {supplier.address || "No address provided"}
                </p>
              </div>

              <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-charcoal">{supplier._count?.purchaseOrders || 0}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Orders</p>
                </div>
                <Link
                  href={`/procurement/suppliers/${supplier.id}`}
                  className="flex items-center gap-2 text-wine text-xs font-bold uppercase tracking-widest hover:underline"
                >
                  View Details <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
              <Building2 size={40} className="mx-auto text-gray-200 mb-4" />
              <p className="text-charcoal font-bold">No suppliers found</p>
              <button 
                onClick={() => setShowModal(true)}
                className="text-wine text-xs font-bold uppercase tracking-widest mt-2 hover:underline"
              >
                Add your first supplier
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
