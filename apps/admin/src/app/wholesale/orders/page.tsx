"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { Plus, Search, Package, CheckCircle, FileText, Calendar, Truck, XCircle, Clock, Loader2, IndianRupee } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  DRAFT:            { label: "Draft",            icon: FileText,   color: "bg-gray-100 text-gray-600 border-gray-200" },
  QUOTE_SENT:       { label: "Quote Sent",       icon: Clock,      color: "bg-blue-50 text-blue-700 border-blue-200" },
  ADVANCE_RECEIVED: { label: "Deposit Received", icon: CheckCircle,color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  IN_PRODUCTION:    { label: "In Production",    icon: Package,    color: "bg-orange-50 text-orange-700 border-orange-200" },
  READY_TO_SHIP:    { label: "Ready to Ship",    icon: Package,    color: "bg-purple-50 text-purple-700 border-purple-200" },
  DELIVERED:        { label: "Delivered",        icon: Truck,      color: "bg-green-50 text-green-700 border-green-200" },
  CANCELLED:        { label: "Cancelled",        icon: XCircle,    color: "bg-red-50 text-red-600 border-red-200" },
};

export default function WholesaleOrders() {
  const { token } = useAdminAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchOrders = async () => {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/wholesale/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter(o => {
    const retailerName = o.retailer?.businessName || "Unknown Retailer";
    const matchSearch = !search || retailerName.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-wine" size={32} /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Wholesale Orders</h2>
          <p className="text-gray-500 text-sm mt-1">Manage retail partners, quotes, and production status.</p>
        </div>
        <Link href="/wholesale/orders/new" className="flex items-center gap-2 bg-wine text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-colors">
          <Plus size={16} /> Draft New Order
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID or retailer..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-wine"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest outline-none focus:border-wine"
        >
          <option value="ALL">All Status</option>
          {Object.keys(STATUS_CONFIG).map(k => <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order ID</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Retailer</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Order Total</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(order => {
                const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;
                const StatusIcon = statusCfg.icon;
                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-bold text-charcoal text-xs uppercase">#{order.formattedOrderNumber || order.orderNumber || order.id.slice(-6).toUpperCase()}</td>
                    <td className="p-4">
                      <p className="font-bold text-charcoal text-sm">{order.retailer?.businessName || "Direct Boutique"}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{order._count?.items || 0} pieces</p>
                    </td>
                    <td className="p-4 text-xs font-medium text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${statusCfg.color}`}>
                        <StatusIcon size={12} /> {statusCfg.label}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <p className="font-bold text-charcoal text-sm flex items-center justify-end">
                        <IndianRupee size={12} /> {order.totalAmount?.toLocaleString()}
                      </p>
                      <p className={`text-[10px] mt-0.5 font-bold ${order.advancePaid > 0 ? "text-green-600" : "text-gray-400"}`}>
                        Paid: ₹{order.advancePaid?.toLocaleString() || 0}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      <Link href={`/wholesale/orders/${order.id}`} className="text-[10px] font-bold uppercase tracking-widest text-wine border-b border-wine pb-0.5 hover:text-charcoal hover:border-charcoal transition-colors">
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-24">
            <Package size={48} className="mx-auto text-gray-100 mb-4" />
            <p className="text-sm font-bold text-charcoal">No Wholesale Orders</p>
            <p className="text-xs text-gray-400">Your B2B transactions will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
