"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, FileText, IndianRupee, Clock, 
  Package, Truck, CheckCircle, XCircle, 
  Loader2, Mail, Send, Printer, ExternalLink, ShoppingBag
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

const STATUS_STEPS = [
  { id: "DRAFT", label: "Draft", icon: FileText },
  { id: "QUOTE_SENT", label: "Quote Sent", icon: Mail },
  { id: "ADVANCE_RECEIVED", label: "Advance Received", icon: IndianRupee },
  { id: "IN_PRODUCTION", label: "In Production", icon: Package },
  { id: "READY_TO_SHIP", label: "Ready to Ship", icon: Truck },
  { id: "DELIVERED", label: "Delivered", icon: CheckCircle },
];

export default function OrderDetails() {
  const { id } = useParams();
  const { token } = useAdminAuth();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");

  const fetchOrder = async () => {
    try {
      const res = await fetch(`${API_BASE}/wholesale/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setAdvanceAmount(data.advancePaid?.toString() || "");
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/wholesale/orders/${id}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus, advancePaid: parseFloat(advanceAmount) || 0 })
      });
      if (res.ok) fetchOrder();
    } catch (err) { console.error(err); }
    finally { setUpdating(false); }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-wine" size={40} /></div>;
  if (!order) return <div className="p-20 text-center">Order not found.</div>;

  const currentStatusIdx = STATUS_STEPS.findIndex(s => s.id === order.status);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/wholesale/orders" className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-400">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-charcoal uppercase">Order #{id.toString().slice(-8)}</h2>
            <p className="text-gray-500 text-sm mt-1">{order.retailer?.businessName} • {new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link 
            href={`/wholesale/orders/${id}/invoice`}
            className="flex items-center gap-2 px-6 py-2.5 border border-wine/20 text-wine text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-wine/5"
          >
            <Printer size={14} /> View Quote
          </Link>
          <button 
             onClick={() => updateStatus(order.status)}
             disabled={updating}
             className="flex items-center gap-2 bg-charcoal text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors"
          >
            {updating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Save Progress
          </button>
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8">Order Progress</h3>
        <div className="relative flex justify-between">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 -z-0" />
          {STATUS_STEPS.map((step, idx) => {
            const isActive = idx <= currentStatusIdx;
            const isCurrent = idx === currentStatusIdx;
            const Icon = step.icon;
            
            return (
              <button
                key={step.id}
                onClick={() => updateStatus(step.id)}
                className={`relative z-10 flex flex-col items-center gap-3 transition-all ${idx > currentStatusIdx + 1 ? 'opacity-30' : 'opacity-100'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCurrent ? 'bg-wine border-wine text-white scale-125 shadow-lg shadow-wine/20' : 
                  isActive ? 'bg-white border-wine text-wine' : 'bg-white border-gray-100 text-gray-300'
                }`}>
                  <Icon size={18} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-charcoal' : 'text-gray-300'}`}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Order Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 bg-gray-50/50 border-b border-gray-100">
              <h3 className="text-sm font-bold text-charcoal flex items-center gap-2">
                <ShoppingBag size={16} className="text-wine" /> Order Items
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="text-[10px] font-bold uppercase text-gray-400 bg-gray-50/30">
                <tr>
                  <th className="px-6 py-4">Item Details</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-right">Unit Price</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-charcoal">{item.variant?.product?.title || "Product"}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">{item.variant?.sku || "SKU-N/A"}</p>
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-sm">{item.quantity}</td>
                    <td className="px-6 py-5 text-right font-mono text-xs text-gray-500">₹{Number(item.unitWholesalePrice).toLocaleString()}</td>
                    <td className="px-6 py-5 text-right font-bold text-charcoal">₹{Number(item.totalPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Notes</h3>
            <p className="text-sm text-gray-600 italic leading-relaxed">
              {order.notes || "No special instructions provided for this order."}
            </p>
          </div>
        </div>

        {/* Right: Financials */}
        <div className="space-y-6">
          <div className="bg-charcoal text-ivory rounded-[2rem] p-8 shadow-2xl space-y-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-ivory/40 border-b border-ivory/10 pb-4">Payment</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs text-ivory/60">Total Order Value</span>
                <span className="text-2xl font-bold">₹{Number(order.totalAmount).toLocaleString()}</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ivory/40 block">Deposit Received</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-wine font-bold text-sm">₹</span>
                  <input 
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm font-bold outline-none focus:border-wine transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between text-sm">
                  <span className="text-ivory/60">Balance Due</span>
                  <span className="font-bold text-wine">₹{(Number(order.totalAmount) - (parseFloat(advanceAmount) || 0)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Customer Contact</h3>
            <div className="space-y-1">
              <p className="text-sm font-bold text-charcoal">{order.retailer?.businessName}</p>
              <p className="text-xs text-gray-500">{order.retailer?.contactName}</p>
              <p className="text-xs text-wine hover:underline cursor-pointer">{order.retailer?.email}</p>
            </div>
            <Link 
              href={`/wholesale/retailers/${order.retailerId}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-wine hover:bg-wine/5 transition-all"
            >
              View Full Profile <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
