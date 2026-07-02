"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { 
  Search, Filter, Plus, ClipboardList, Clock, 
  CheckCircle, XCircle, ChevronRight, Loader2, ArrowUpRight
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";

interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: 'PENDING' | 'PAID' | 'RECEIVED' | 'CANCELLED';
  totalCost: number;
  notes?: string;
  createdAt: string;
  supplier: { name: string };
  _count?: { items: number };
  autoRestock?: boolean;
}

function AddPurchaseOrderModal({ onClose, onSubmit, suppliers }: { onClose: () => void; onSubmit: (form: any) => void, suppliers: any[] }) {
  const [form, setForm] = useState({ supplierId: "", totalCost: "", notes: "", autoRestock: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.supplierId) return alert("Please select a supplier");
    setIsSubmitting(true);
    await onSubmit(form);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-charcoal">New Stock Order</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-charcoal"><XCircle size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Supplier</label>
            <select 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine"
              value={form.supplierId}
              onChange={e => set("supplierId", e.target.value)}
            >
              <option value="">Select Supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Total Cost (₹)</label>
            <input 
              type="number"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine" 
              placeholder="0.00"
              value={form.totalCost}
              onChange={e => set("totalCost", e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1.5">Notes</label>
            <textarea 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine" 
              rows={3}
              placeholder="Details like fabric or expected date..."
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
             <input 
               type="checkbox" 
               id="autoRestock" 
               checked={form.autoRestock}
               onChange={e => set("autoRestock", e.target.checked)}
               className="w-4 h-4 accent-wine" 
             />
             <label htmlFor="autoRestock" className="text-xs font-bold text-charcoal cursor-pointer">Update stock automatically when received</label>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="px-5 py-2.5 bg-wine text-white text-xs font-bold uppercase tracking-widest hover:bg-charcoal rounded-lg transition-colors flex items-center gap-2">
            {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : "Create Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  PENDING:   { label: "Pending",   color: "bg-yellow-50 text-yellow-600 border-yellow-200", icon: <Clock size={12} /> },
  ORDERED:   { label: "Ordered",   color: "bg-blue-50 text-blue-600 border-blue-200",     icon: <CheckCircle size={12} /> },
  PAID:      { label: "Paid",      color: "bg-blue-50 text-blue-600 border-blue-200",     icon: <CheckCircle size={12} /> },
  RECEIVED:  { label: "Received",  color: "bg-green-50 text-green-600 border-green-200",   icon: <CheckCircle size={12} /> },
  CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200",       icon: <XCircle size={12} /> },
};

export default function StockOrdersPage() {
  const { token } = useAdminAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchSuppliers();
    }
  }, [token]);

  const fetchSuppliers = async () => {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/procurement/suppliers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSuppliers(data);
      } else {
        setSuppliers([]);
      }
    } catch (err) { console.error(err); }
  };

  const fetchOrders = async () => {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/procurement/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrder = async (form: any) => {
    if (!form.supplierId || !form.totalCost) {
      alert("Please select a supplier and enter total cost");
      return;
    }

    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/procurement/orders`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        fetchOrders();
      }
    } catch (err) { console.error(err); }
  };

  const filtered = Array.isArray(orders) ? orders.filter(o => 
    (o.supplier?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.id || "").toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        {showModal && <AddPurchaseOrderModal onClose={() => setShowModal(false)} onSubmit={handleCreateOrder} suppliers={suppliers} />}
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Stock Orders</h2>
          <p className="text-gray-500 text-sm mt-1">Track stock orders and costs.</p>
        </div>
        <button
          className="flex items-center gap-2 bg-wine text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} /> New Stock Order
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by PO ID or Supplier..."
            className="w-full pl-12 pr-4 py-3 bg-transparent text-sm focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-3 border-l border-gray-100 text-gray-400 hover:text-wine transition-colors">
          <Filter size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">Status</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-wine" size={40} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Order ID</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Supplier</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Cost</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(order => {
                const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-wine font-bold">#{order.id.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-charcoal">{order.supplier.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{order._count?.items || 0} items</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-charcoal">₹{Number(order.totalCost).toLocaleString()}</p>
                      {order.autoRestock && (
                        <p className="text-[9px] text-green-500 font-bold uppercase tracking-tighter italic">Auto-Restock Enabled</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/procurement/orders/${order.id}`}
                        className="bg-gray-100 hover:bg-wine hover:text-white transition-all p-2 rounded-lg inline-flex"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <ClipboardList size={40} className="mx-auto text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm">No purchase orders found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
