"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  Truck, 
  CheckCircle, 
  XOctagon,
  CreditCard,
  User,
  ExternalLink,
  Loader2,
  Calendar,
  Tag as TagIcon,
  ShieldCheck,
  MoreVertical,
  Download,
  Package,
  AlertTriangle,
  Users,
  Plus
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Printer } from "lucide-react";
import { InvoiceModal } from "@/components/modals/InvoiceModal";
import { BulkFulfillModal } from "@/components/modals/BulkFulfillModal";
import { PackingSlipModal } from "@/components/modals/PackingSlipModal";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import { format } from "date-fns";
import Link from "next/link";

const STATUS_CONFIG: any = {
  PAYMENT_PENDING: { label: "Awaiting Payment", color: "bg-amber-50 text-amber-600 border-amber-100" },
  ABANDONED: { label: "Abandoned", color: "bg-gray-100 text-gray-500 border-gray-200" },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-50 text-blue-600 border-blue-100" },
  PROCESSING: { label: "Processing", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  SHIPPED: { label: "Shipped", color: "bg-purple-50 text-purple-600 border-purple-100" },
  DELIVERED: { label: "Delivered", color: "bg-green-50 text-green-600 border-green-100" },
  CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-100" },
  CREATED: { label: "Created", color: "bg-gray-50 text-gray-500 border-gray-100" },
  FAILED: { label: "Failed", color: "bg-red-50 text-red-400 border-red-100" },
  REFUNDED: { label: "Refunded", color: "bg-purple-50 text-purple-400 border-purple-100" },
};

function getSmartStatus(order: any) {
  if (order.status === 'PAYMENT_PENDING') {
    const ageInMinutes = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60);
    return ageInMinutes > 30 ? 'ABANDONED' : 'PAYMENT_PENDING';
  }
  if (order.status === 'CANCELLED' && order.paymentId) {
    return 'FAILED';
  }
  return order.status;
}

export default function OrdersPage() {
  const { token } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeTab = searchParams.get("tab") || "CONFIRMED";
  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters State
  const [filters, setFilters] = useState({
    search: "",
    source: "",
    riskLevel: "",
    dateFrom: "",
    dateTo: "",
    financialStatus: "",
    fulfillmentStatus: ""
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isBulkFulfillModalOpen, setIsBulkFulfillModalOpen] = useState(false);
  const [packingSlipOrders, setPackingSlipOrders] = useState<any[]>([]);
  const [isPackingSlipOpen, setIsPackingSlipOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    const fetchSettings = async () => {
      try {
        const apiBase = `${API_BASE}/api/v1`;
        const res = await fetch(`${apiBase}/settings`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setStoreSettings(await res.json());
      } catch (err) {}
    };
    fetchSettings();
    
    const timer = setTimeout(() => {
      fetchOrders();
    }, 500);
    return () => clearTimeout(timer);
  }, [token, activeTab, filters]);


  const fetchOrders = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (activeTab === "ACTIVE") queryParams.append("excludeStatus", "CANCELLED");
      else if (activeTab !== "ALL") queryParams.append("status", activeTab);
      if (filters.search) queryParams.append("search", filters.search);
      if (filters.source) queryParams.append("source", filters.source);
      if (filters.riskLevel) queryParams.append("riskLevel", filters.riskLevel);
      if (filters.dateFrom) queryParams.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) queryParams.append("dateTo", filters.dateTo);
      if (filters.financialStatus) queryParams.append("financialStatus", filters.financialStatus);
      if (filters.fulfillmentStatus) queryParams.append("fulfillmentStatus", filters.fulfillmentStatus);

      const apiBase = `${API_BASE}/api/v1`;
      const res = await fetch(`${apiBase}/orders/admin/all?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const newOrders = Array.isArray(data) ? data : [];
      setOrders(newOrders);
      if (typeof window !== 'undefined') {
        localStorage.setItem("admin_order_sequence", JSON.stringify(newOrders.map((o: any) => o.id)));
      }
    } catch (error) {
       console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkAction = async (action: 'fulfill' | 'tag' | 'assign') => {
    if (selectedIds.length === 0) return;
    
    let endpoint = "";
    let body: any = { ids: selectedIds };

    if (action === 'fulfill') {
      setIsBulkFulfillModalOpen(true);
      return;
    } else if (action === 'tag') {
      const tag = window.prompt("Enter tag to add:");
      if (!tag) return;
      endpoint = "/orders/admin/bulk/tags";
      body.tag = tag;
    } else if (action === 'assign') {
      const staffId = window.prompt("Enter Staff ID to assign:");
      if (!staffId) return;
      endpoint = "/orders/admin/bulk/assign";
      body.staffId = staffId;
    }

    try {
      const apiBase = `${API_BASE}/api/v1`;
      const res = await fetch(`${apiBase}${endpoint.replace('/api/v1', '')}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        alert("Action successful");
        setSelectedIds([]);
        fetchOrders();
      } else {
        alert("Failed to perform action");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred");
    }
  };

  const handleExportCSV = () => {
    const ordersToExport = selectedIds.length > 0 
      ? orders.filter(o => selectedIds.includes(o.id))
      : orders;

    if (ordersToExport.length === 0) return;

    const headers = [
      "Order Number", "Order Date", "Customer Name", "Customer Phone Number",
      "Payment Status", "Payment Reference ID", "Product Name", "Quantity",
      "Unit Price", "Order Value", "Shipping Charges", "Tax value"
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows: string[][] = [];

    ordersToExport.forEach(o => {
      const orderName = `#${o.formattedOrderNumber || (o.orderNumber != null ? String(o.orderNumber + 1000) : o.id.slice(-8).toUpperCase())}`;
      const email = o.customerEmail || "";
      const phone = o.customerPhone || "";
      const createdAt = format(new Date(o.createdAt), "yyyy-MM-dd HH:mm:ss");
      const financialStatus = o.financialStatus || "pending";
      const fulfillmentStatus = o.fulfillmentStatus || "unfulfilled";
      const paidAt = o.paidAt ? format(new Date(o.paidAt), "yyyy-MM-dd HH:mm:ss") : (financialStatus === 'paid' ? createdAt : "");
      const fulfilledAt = o.fulfillmentDate ? format(new Date(o.fulfillmentDate), "yyyy-MM-dd HH:mm:ss") : (fulfillmentStatus === 'fulfilled' ? createdAt : "");
      
      const bAddress = (typeof o.billingAddress === 'string' ? JSON.parse(o.billingAddress) : o.billingAddress) || {};
      const sAddress = (typeof o.shippingAddress === 'string' ? JSON.parse(o.shippingAddress) : o.shippingAddress) || {};
      
      const bName = bAddress.name || o.customerName || "";
      const sName = sAddress.name || o.customerName || "";

      const items = (o.items && o.items.length > 0) ? o.items : [{}];

      items.forEach((item: any, index: number) => {
        const isFirst = index === 0;

        const row = [
          orderName,                                                            // Order Number
          createdAt,                                                            // Order Date
          isFirst ? o.customerName || "" : "",                                  // Customer Name
          isFirst ? phone : "",                                                 // Customer Phone Number
          isFirst ? financialStatus : "",                                       // Payment Status
          isFirst ? o.paymentId || "" : "",                                     // Payment Reference ID
          item.variant?.product?.title || item.title || "Custom Item",          // Product Name
          item.quantity || "1",                                                 // Quantity
          item.price || "0",                                                    // Unit Price
          isFirst ? o.totalAmount : "",                                         // Order Value
          isFirst ? o.shippingAmount || "0" : "",                               // Shipping Charges
          isFirst ? o.taxAmount || "0" : ""                                     // Tax value
        ];

        rows.push(row.map(escapeCSV));
      });
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const stats = useMemo(() => ({
    total: orders.length,
    revenue: orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
    unfulfilled: orders.filter(o => o.fulfillmentStatus !== 'fulfilled').length,
    highRisk: orders.filter(o => o.riskLevel === 'high').length
  }), [orders]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F9FAFB]">
      
      {/* ─── HEADER ─── */}
      <header className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Orders Control Center</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and fulfill your luxury collections</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${showFilters ? 'bg-wine text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              <Filter size={16} />
              Advanced Filters
            </button>
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all"
            >
              <Download size={16} />
              Export
            </button>
            <Link 
              href="/orders/new"
              className="flex items-center gap-2 px-4 py-2 bg-charcoal text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-wine transition-all shadow-sm"
            >
              <Plus size={16} />
              Draft Order
            </Link>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-4 gap-6 mt-8">
          {[
            { label: "Total Orders", value: stats.total, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Revenue", value: `₹${stats.revenue.toLocaleString()}`, icon: CreditCard, color: "text-green-600", bg: "bg-green-50" },
            { label: "Awaiting Fulfillment", value: stats.unfulfilled, icon: Package, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "High Risk Alerts", value: stats.highRisk, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className={`${stat.bg} ${stat.color} p-2.5 rounded-lg`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Table Area */}
        <main className={`flex-1 overflow-auto p-8 relative transition-all duration-300 w-full`}>
          
          {/* Tabs & Search */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex bg-gray-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar">
                {[
                  { key: "CONFIRMED", label: "Confirmed" },
                  { key: "PAYMENT_PENDING", label: "Pending" },
                  { key: "PROCESSING", label: "Processing" },
                  { key: "SHIPPED", label: "Shipped" },
                  { key: "DELIVERED", label: "Delivered" },
                  { key: "CANCELLED", label: "Cancelled" },
                  { key: "ACTIVE", label: "Active Orders" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-4 py-2 whitespace-nowrap rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === key ? 'bg-white text-wine shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="ID, Customer, Email..."
                  className="w-full bg-gray-50 border-none rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-wine/10 transition-all outline-none"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-wine focus:ring-wine"
                        checked={selectedIds.length === orders.length && orders.length > 0}
                        onChange={() => setSelectedIds(selectedIds.length === orders.length ? [] : orders.map(o => o.id))}
                      />
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Order</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Customer</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Items</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Images</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Payment</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Payment Ref</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Staff</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Risk</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="animate-spin text-wine" size={32} />
                          <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Sychronizing Global Orders...</p>
                        </div>
                      </td>
                    </tr>
                  ) : orders.map((order) => (
                    <tr 
                      key={order.id} 
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className={`group hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedIds.includes(order.id) ? 'bg-wine/[0.02]' : ''}`}
                    >
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-wine focus:ring-wine"
                          checked={selectedIds.includes(order.id)}
                          onChange={() => setSelectedIds(prev => prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id])}
                        />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          {order.status === 'CANCELLED' ? (
                            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase line-through">{order.id.slice(-8).toUpperCase()}</span>
                          ) : (
                            <span className="text-xs font-bold text-gray-900 tracking-widest uppercase">#{order.formattedOrderNumber || (order.orderNumber != null ? String(order.orderNumber + 1000) : order.id.slice(-8).toUpperCase())}</span>
                          )}
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">{order.source}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-medium text-gray-600">{format(new Date(order.createdAt), "MMM dd, p")}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900">{order.customerName}</span>
                          <span className="text-[10px] text-gray-400">{order.customerEmail}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex flex-col" title={`${item.quantity}x ${item.variant?.product?.title || 'Unknown'} (${item.variant?.sku || ''})`}>
                              <span className="text-xs font-bold text-gray-700 truncate">
                                {item.quantity}x {item.variant?.product?.title || 'Unknown Product'}
                              </span>
                              {item.variant?.sku && (
                                <span className="text-[9px] text-gray-400 uppercase tracking-widest truncate">
                                  {item.variant.sku}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 flex-wrap max-w-[120px]">
                          {order.items?.map((item: any, idx: number) => {
                            const rawUrl = item.variant?.product?.images?.[0]?.url
                              || item.imageUrl
                              || item.variant?.imageUrl;
                            const apiBase = (API_BASE).replace('/api/v1', '');
                            const imageUrl = rawUrl
                              ? (rawUrl.startsWith('http') ? rawUrl : `${apiBase}${rawUrl}`)
                              : null;
                            return (
                              <div key={idx} className="relative w-8 h-8 rounded-md bg-gray-100 overflow-hidden border border-gray-200" title={item.variant?.product?.title || item.productName}>
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt="Product" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-100'); e.currentTarget.parentElement?.insertAdjacentHTML('beforeend', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'); }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package size={14} className="text-gray-300" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {(() => {
                          const smartStatus = getSmartStatus(order);
                          return (
                            <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${STATUS_CONFIG[smartStatus]?.color || 'bg-gray-50 text-gray-500'}`}>
                              {STATUS_CONFIG[smartStatus]?.label || smartStatus}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest w-fit border ${order.financialStatus === 'paid' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {order.financialStatus}
                          </span>
                          <span className="text-[9px] text-gray-400">{order.paymentMethod}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-mono text-gray-500">{order.paymentId || order.paymentIntentId || "—"}</span>
                      </td>
                      <td className="px-6 py-5 text-xs font-bold text-gray-900">
                        ₹{Number(order.totalAmount).toLocaleString()}
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-2">
                           <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-400">
                             {order.assignedStaff?.name?.charAt(0) || <Users size={12} />}
                           </div>
                           <span className="text-[10px] font-medium text-gray-600">{order.assignedStaff?.name || 'Unassigned'}</span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck size={14} className={order.riskLevel === 'high' ? 'text-red-500' : order.riskLevel === 'medium' ? 'text-amber-500' : 'text-green-500'} />
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${order.riskLevel === 'high' ? 'text-red-600' : order.riskLevel === 'medium' ? 'text-amber-600' : 'text-green-600'}`}>
                            {order.riskLevel}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          {order.status !== 'CANCELLED' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); setPackingSlipOrders([order]); setIsPackingSlipOpen(true); }}
                                className="p-2 hover:bg-white hover:shadow-md rounded-lg text-gray-400 hover:text-charcoal transition-all"
                                title="Print Packing Slip"
                              >
                                <Printer size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedOrderForInvoice(order); setIsInvoiceModalOpen(true); }}
                                className="p-2 hover:bg-white hover:shadow-md rounded-lg text-gray-400 hover:text-wine transition-all"
                                title="Generate Invoice"
                              >
                                <FileText size={16} />
                              </button>
                            </>
                          )}
                          <Link
                            href={`/orders/${order.id}`}
                            className="p-2 hover:bg-white hover:shadow-md rounded-lg text-gray-400 hover:text-charcoal transition-all"
                          >
                            <ExternalLink size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Floating Bulk Action Bar */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-8"
              >
                <div className="flex flex-col border-r border-white/10 pr-8">
                  <span className="text-xl font-bold">{selectedIds.length}</span>
                  <span className="text-[9px] uppercase tracking-widest font-bold text-white/40">Orders Selected</span>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => handleBulkAction('fulfill')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest transition-all">
                    <Truck size={14} /> Fulfill
                  </button>
                  <button onClick={() => handleBulkAction('tag')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest transition-all">
                    <TagIcon size={14} /> Tag
                  </button>
                  <button onClick={() => handleBulkAction('assign')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest transition-all">
                    <Users size={14} /> Assign
                  </button>
                  <button
                    onClick={() => {
                      const selected = orders.filter(o => selectedIds.includes(o.id));
                      setPackingSlipOrders(selected);
                      setIsPackingSlipOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    <Printer size={14} /> Packing Slips
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="ml-4 text-[10px] uppercase font-bold text-white/40 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* ─── FILTERS SIDEBAR ─── */}
        <AnimatePresence>
          {showFilters && (
            <motion.aside 
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="w-96 bg-white border-l border-gray-200 p-8 overflow-auto flex-shrink-0"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-lg font-bold text-gray-900">Advanced Filters</h3>
                <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                  <XOctagon size={20} />
                </button>
              </div>

              <div className="space-y-8">
                {/* Search */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium"
                      placeholder="ID, Customer, Email..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                  </div>
                </div>

                {/* Source Filter */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order Source</label>
                  <select 
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-xs font-medium appearance-none cursor-pointer"
                    value={filters.source}
                    onChange={(e) => setFilters({...filters, source: e.target.value})}
                  >
                    <option value="">All Sources</option>
                    <option value="web">Online Store</option>
                    <option value="admin">Manual Admin</option>
                    <option value="pos">Point of Sale</option>
                  </select>
                </div>

                {/* Financial Status */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Financial Status</label>
                  <select 
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-xs font-medium appearance-none cursor-pointer"
                    value={filters.financialStatus}
                    onChange={(e) => setFilters({...filters, financialStatus: e.target.value})}
                  >
                    <option value="">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="refunded">Refunded</option>
                    <option value="partially_refunded">Partially Refunded</option>
                  </select>
                </div>

                {/* Fulfillment Status */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fulfillment Status</label>
                  <select 
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-xs font-medium appearance-none cursor-pointer"
                    value={filters.fulfillmentStatus}
                    onChange={(e) => setFilters({...filters, fulfillmentStatus: e.target.value})}
                  >
                    <option value="">All Statuses</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="unfulfilled">Unfulfilled</option>
                    <option value="partially_fulfilled">Partially Fulfilled</option>
                  </select>
                </div>

                {/* Risk Level */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Risk Analysis</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["low", "medium", "high"].map(level => (
                      <button 
                        key={level}
                        onClick={() => setFilters({...filters, riskLevel: filters.riskLevel === level ? '' : level})}
                        className={`py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${filters.riskLevel === level ? 'bg-charcoal text-white border-charcoal' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Range</label>
                  <div className="space-y-2">
                    <input 
                      type="date" 
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-xs font-medium"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    />
                    <input 
                      type="date" 
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-xs font-medium"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <button 
                    onClick={() => setFilters({ search: "", source: "", riskLevel: "", dateFrom: "", dateTo: "", financialStatus: "", fulfillmentStatus: "" })}
                    className="w-full py-3 rounded-xl border border-gray-200 text-gray-400 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

      </div>

      <InvoiceModal 
        isOpen={isInvoiceModalOpen} 
        onClose={() => setIsInvoiceModalOpen(false)} 
        order={selectedOrderForInvoice} 
      />

      <BulkFulfillModal
        isOpen={isBulkFulfillModalOpen}
        onClose={() => setIsBulkFulfillModalOpen(false)}
        selectedOrderIds={selectedIds}
        onComplete={() => {
          setSelectedIds([]);
          fetchOrders();
        }}
      />

      <PackingSlipModal
        isOpen={isPackingSlipOpen}
        onClose={() => setIsPackingSlipOpen(false)}
        orders={packingSlipOrders}
        storeSettings={storeSettings}
      />
    </div>
  );
}
