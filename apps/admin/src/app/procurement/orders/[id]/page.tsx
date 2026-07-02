"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ArrowLeft, ClipboardList, Clock, CheckCircle, 
  XCircle, Truck, Package, Loader2, Save, 
  IndianRupee, Building2, ExternalLink
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

const STATUS_CONFIG = {
  PENDING:   { label: "Pending",   color: "bg-yellow-50 text-yellow-600 border-yellow-200", icon: <Clock size={16} /> },
  ORDERED:   { label: "Ordered",   color: "bg-blue-50 text-blue-600 border-blue-200",     icon: <Truck size={16} /> },
  RECEIVED:  { label: "Received",  color: "bg-green-50 text-green-600 border-green-200",   icon: <CheckCircle size={16} /> },
  CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200",       icon: <XCircle size={16} /> },
};

export default function PurchaseOrderDetails() {
  const { id } = useParams();
  const { token } = useAdminAuth();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchPO = async () => {
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/procurement/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPo(data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPO(); }, [id]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/procurement/orders/${id}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchPO();
    } catch (err) { console.error(err); }
    finally { setUpdating(false); }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-wine" size={40} /></div>;
  if (!po) return <div className="p-20 text-center text-gray-500 font-bold uppercase tracking-widest">Order not found.</div>;

  const displayId = id ? (Array.isArray(id) ? id[0] : id).toString().slice(-8) : "N/A";
  const statusInfo = (STATUS_CONFIG as any)[po.status] || STATUS_CONFIG.PENDING;

  return (
    <div className="space-y-8">
      {/* Print-only Header */}
      <div className="hidden print:flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
        <img src="/logo-dark.svg" alt="Raaghas Logo" className="h-16 w-auto object-contain" />
        <div className="text-right">
          <h2 className="text-2xl font-bold uppercase text-charcoal">Purchase Order</h2>
          <p className="text-gray-500 font-bold">#{displayId}</p>
          <p className="text-gray-400 text-xs mt-1">Created: {po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "N/A"}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/procurement/orders" className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-400">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-charcoal uppercase">PO #{displayId}</h2>
            <p className="text-gray-500 text-sm mt-1">{po.supplier?.name} • Created {po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "N/A"}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
             onClick={() => window.print()}
             className="flex items-center gap-2 px-6 py-2.5 border border-gray-200 text-charcoal text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-gray-50"
          >
            <Package size={14} /> Print Manifest
          </button>
          <div className="h-10 w-px bg-gray-100 mx-2" />
          {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
            <button 
              onClick={() => updateStatus('CANCELLED')}
              disabled={updating}
              className="flex items-center gap-2 px-6 py-2.5 border border-red-100 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all"
            >
              Cancel Order
            </button>
          )}
          {po.status === 'PENDING' && (
            <button 
              onClick={() => updateStatus('ORDERED')}
              disabled={updating}
              className="flex items-center gap-2 bg-charcoal text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg"
            >
              {updating ? <Loader2 size={14} className="animate-spin" /> : "Mark as Ordered"}
            </button>
          )}
          {po.status === 'ORDERED' && (
            <button 
              onClick={() => updateStatus('RECEIVED')}
              disabled={updating}
              className="flex items-center gap-2 bg-wine text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-charcoal transition-all shadow-lg"
            >
              {updating ? <Loader2 size={14} className="animate-spin" /> : "Confirm Receipt & Restock"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Banner */}
          <div className={`p-6 rounded-[2rem] border flex items-center justify-between ${statusInfo.color}`}>
             <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm">
                   {statusInfo.icon}
                </div>
                <div>
                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Current Phase</p>
                   <h3 className="text-lg font-bold uppercase tracking-tight">{statusInfo.label}</h3>
                </div>
             </div>
             {po.status === 'RECEIVED' && (
                <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-xl border border-green-200">
                   <CheckCircle size={14} className="text-green-600" />
                   <span className="text-[9px] font-bold uppercase tracking-widest text-green-700">Stock Updated</span>
                </div>
             )}
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
               <h3 className="text-sm font-bold text-charcoal">Procurement Breakdown</h3>
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{po.items?.length || 0} Line Items</span>
            </div>
            <table className="w-full text-left">
              <thead className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50/20">
                <tr>
                  <th className="px-6 py-4">Fabric / Material</th>
                  <th className="px-6 py-4 text-center">HSN</th>
                  <th className="px-6 py-4 text-center">In-Hand</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-right">Cost Price</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {po.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-charcoal">{item.variant?.product?.title}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.variant?.sku}</p>
                    </td>
                    <td className="px-6 py-5 text-center font-mono text-[10px] text-gray-400">{item.hsnCode || "-"}</td>
                    <td className="px-6 py-5 text-center font-bold text-sm text-gray-400">{item.variant?.inventory || 0}</td>
                    <td className="px-6 py-5 text-center font-bold text-sm text-wine">+{item.quantity}</td>
                    <td className="px-6 py-5 text-right font-mono text-xs text-gray-500">₹{Number(item.costPrice).toLocaleString()}</td>
                    <td className="px-6 py-5 text-right font-bold text-charcoal">₹{(item.quantity * Number(item.costPrice)).toLocaleString()}</td>
                  </tr>
                ))}
                {(!po.items || po.items.length === 0) && (
                   <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic text-sm">
                         No item breakdown available. Total cost recorded as bulk purchase.
                      </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
             <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Internal Procurement Notes</h3>
             <p className="text-sm text-gray-600 leading-relaxed italic">{po.notes || "No additional notes for this order."}</p>
          </div>
        </div>

        {/* Right Content */}
        <div className="space-y-6">
          <div className="bg-wine text-white rounded-[2rem] p-8 shadow-2xl space-y-6">
             <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 border-b border-white/10 pb-4">Financial Overview</h3>
             <div className="space-y-6">
                <div className="flex justify-between items-end">
                   <span className="text-xs opacity-60">Total Cost (incl. GST)</span>
                   <span className="text-3xl font-bold">₹{Number(po.totalCost).toLocaleString()}</span>
                </div>
                <div className="space-y-3 pt-4 border-t border-white/10">
                   <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-60">
                      <span>Restock Mode</span>
                      <span className={po.autoRestock ? "text-green-300" : "text-ivory"}>
                        {po.autoRestock ? "AUTOMATED" : "MANUAL"}
                      </span>
                   </div>
                   <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-60">
                      <span>Payment Status</span>
                      <span className="text-ivory">{po.paymentStatus || 'PENDING'}</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-5">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-beige text-wine rounded-xl flex items-center justify-center">
                   <Building2 size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Supplier</p>
                   <h4 className="font-bold text-charcoal">{po.supplier?.name}</h4>
                </div>
             </div>
             <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                   <span className="w-1.5 h-1.5 rounded-full bg-wine" />
                   {po.supplier?.email || "No email"}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                   <span className="w-1.5 h-1.5 rounded-full bg-wine" />
                   {po.supplier?.phone || "No phone"}
                </div>
             </div>
             <Link 
                href={`/procurement/suppliers/${po.supplierId}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-wine hover:bg-wine/5 transition-all"
             >
                Supplier Profile <ExternalLink size={12} />
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
