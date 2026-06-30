"use client";

import { useState, useEffect } from "react";
import { 
  Package, Truck, CheckCircle2, ChevronRight, Search, 
  Filter, ExternalLink, Printer, MoreHorizontal, Loader2,
  Clock, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { PackingSlipModal } from "@/components/modals/PackingSlipModal";

export default function FulfillmentDesk() {
  const { token } = useAdminAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [packedItems, setPackedItems] = useState<string[]>([]);
  const [useSimplifiedSlip, setUseSimplifiedSlip] = useState(false);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [isPackingSlipOpen, setIsPackingSlipOpen] = useState(false);
  const [packingSlipOrders, setPackingSlipOrders] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchStoreSettings();
    }
  }, [token]);

  const fetchStoreSettings = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005/api/v1' : 'https://api.raaghas.in/api/v1');
      const res = await fetch(`${baseUrl}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStoreSettings(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005/api/v1' : 'https://api.raaghas.in/api/v1');
      const res = await fetch(`${baseUrl}/orders/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Failed to fetch orders", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PROCESSING');
  
  const stats = {
    pending: orders.filter(o => o.status === 'CONFIRMED').length,
    packed: orders.filter(o => o.status === 'PROCESSING').length,
    shippedToday: orders.filter(o => o.status === 'SHIPPED' && new Date(o.updatedAt).toDateString() === new Date().toDateString()).length,
    returns: orders.filter(o => o.status === 'RETURN_REQUESTED' || o.status === 'RETURNED').length
  };

  const handleBulkShip = async () => {
    if (!confirm(`Are you sure you want to mark ${selectedIds.length} orders as SHIPPED?`)) return;
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in');
      await Promise.all(selectedIds.map(id => 
        fetch(`${baseUrl}/orders/admin/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'SHIPPED' })
        })
      ));
      alert("Orders successfully marked as SHIPPED!");
      setSelectedIds([]);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to update some orders.");
    } finally {
      setLoading(false);
    }
  };

  const parseAddress = (addr: any) => {
    if (!addr) return {};
    if (typeof addr === 'string') {
      try { return JSON.parse(addr); } catch { return { address1: addr }; }
    }
    return addr;
  };

  const formatAddress = (addr: any) => {
    const a = parseAddress(addr);
    return [
      a.address1 || a.line1 || a.street || '',
      a.address2 || a.line2 || '',
      a.city || '',
      (a.state || a.province || '') + (a.pincode || a.zip || a.postalCode ? ' ' + (a.pincode || a.zip || a.postalCode) : ''),
      a.country || 'India'
    ].filter(Boolean).join(', ');
  };

  const handlePrintSlips = (idsToPrint?: any) => {
    const actualIds = Array.isArray(idsToPrint) ? idsToPrint : selectedIds;
    const selectedOrdersData = orders.filter(o => actualIds.includes(o.id));

    if (selectedOrdersData.length === 0) {
      return alert("No orders selected to print.");
    }

    setPackingSlipOrders(selectedOrdersData);
    setIsPackingSlipOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'PROCESSING': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'SHIPPED': return 'bg-green-50 text-green-600 border-green-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  if (loading) return (
    <div className="p-12 flex justify-center">
      <Loader2 className="animate-spin text-wine" size={32} />
    </div>
  );

  return (
    <div className="p-8 space-y-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-serif text-charcoal">Shipping Center</h1>
          <p className="text-sm text-gray-500 mt-1">Manage order processing, packing, and courier handovers.</p>
        </div>
        <div className="flex gap-3">
          {selectedIds.length > 0 && (
             <span className="flex items-center text-xs font-bold text-gray-500">
               {selectedIds.length} selected
             </span>
          )}
          <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer">
            <input 
              type="checkbox" 
              checked={useSimplifiedSlip} 
              onChange={e => setUseSimplifiedSlip(e.target.checked)} 
              className="rounded border-gray-300 text-wine focus:ring-wine"
            />
            Simplified Slip
          </label>
          <button 
            onClick={handlePrintSlips}
            disabled={selectedIds.length === 0}
            className={`bg-white border border-gray-200 text-charcoal px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${selectedIds.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
            <Printer size={16} /> Print Packing Slips
          </button>
          <button 
            onClick={handleBulkShip}
            disabled={selectedIds.length === 0}
            className={`bg-wine text-ivory px-6 py-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all shadow-lg ${selectedIds.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-charcoal'}`}>
            Bulk Ship
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 shrink-0">
        {[
          { label: "Pending", count: stats.pending, icon: Clock, color: "text-blue-500" },
          { label: "Packed", count: stats.packed, icon: Package, color: "text-amber-500" },
          { label: "Shipped Today", count: stats.shippedToday, icon: Truck, color: "text-green-500" },
          { label: "Returns", count: stats.returns, icon: AlertCircle, color: "text-red-500" }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-4 rounded-2xl bg-gray-50 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{stat.label}</p>
              <p className="text-2xl font-bold text-charcoal">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-[1fr_400px] gap-8 min-h-0">
        {/* Order List */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                placeholder="Search by Order ID or Customer Name..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-wine/20"
              />
            </div>
            <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-wine transition-colors">
              <Filter size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <table className="w-full border-separate border-spacing-y-2">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                  <th className="px-6 py-4 w-12 text-center">
                    <input 
                      type="checkbox"
                      className="rounded border-gray-300 text-wine focus:ring-wine"
                      checked={selectedIds.length === pendingOrders.length && pendingOrders.length > 0}
                      onChange={() => setSelectedIds(selectedIds.length === pendingOrders.length ? [] : pendingOrders.map((o: any) => o.id))}
                    />
                  </th>
                  <th className="px-6 py-4 text-left">Order</th>
                  <th className="px-6 py-4 text-left">Customer</th>
                  <th className="px-6 py-4 text-left">Items</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((order: any) => (
                  <tr 
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      setPackedItems([]);
                    }}
                    className={`group cursor-pointer transition-all ${selectedOrder?.id === order.id ? 'bg-wine/5' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 rounded-l-2xl text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        className="rounded border-gray-300 text-wine focus:ring-wine"
                        checked={selectedIds.includes(order.id)}
                        onChange={() => setSelectedIds(prev => prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id])}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-charcoal">#{order.formattedOrderNumber || order.orderNumber || order.id.slice(-8).toUpperCase()}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-charcoal">{order.customerName}</p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{order.customerEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex -space-x-2">
                        {[1, 2].map((_, j) => (
                          <div key={j} className="w-8 h-8 rounded-full border-2 border-white bg-beige flex items-center justify-center text-[10px] font-bold">
                            P
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                        {order.status === 'PROCESSING' ? 'PACKED' : order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right rounded-r-2xl">
                      <button className="p-2 text-gray-400 hover:text-wine">
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fulfillment Panel */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div 
                key={selectedOrder.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex flex-col p-8 space-y-8"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-serif text-charcoal">Order Details</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">#{selectedOrder.id.slice(-12).toUpperCase()}</p>
                  </div>
                  <button className="text-gray-400 hover:text-wine"><MoreHorizontal size={20} /></button>
                </div>

                <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                   <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Shipping To</p>
                      <p className="text-sm font-medium text-charcoal">{selectedOrder.customerName}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {typeof selectedOrder.shippingAddress === 'string' ? selectedOrder.shippingAddress : JSON.stringify(selectedOrder.shippingAddress)}
                      </p>
                   </div>

                   <div className="space-y-4">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Items to Pack</p>
                      {(selectedOrder.items || []).map((item: any, i: number) => {
                        const itemKey = `${item.id || i}`;
                        return (
                        <div key={i} className="flex gap-4 items-center">
                           <div className="w-12 h-16 bg-beige rounded-lg shrink-0 border border-gray-100 overflow-hidden">
                             {item.variant?.product?.images?.[0]?.url && (
                                <img src={item.variant.product.images[0].url} alt="" className="w-full h-full object-cover" />
                             )}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-charcoal truncate">{item.variant?.product?.title || 'Product'}</p>
                              <p className="text-[10px] text-gray-400 uppercase font-bold">Qty: {item.quantity}</p>
                           </div>
                           <input 
                             type="checkbox" 
                             className="w-5 h-5 rounded border-gray-200 text-wine focus:ring-wine"
                             checked={packedItems.includes(itemKey)}
                             onChange={(e) => {
                               if (e.target.checked) setPackedItems([...packedItems, itemKey]);
                               else setPackedItems(packedItems.filter(id => id !== itemKey));
                             }}
                           />
                        </div>
                        );
                      })}
                   </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-gray-50">
                   <button 
                    disabled={packedItems.length !== (selectedOrder.items?.length || 0)}
                    onClick={async () => {
                      if (!selectedOrder) return;
                      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in');
                      const res = await fetch(`${baseUrl}/orders/admin/${selectedOrder.id}/status`, {
                        method: 'PATCH',
                        headers: { 
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}` 
                        },
                        body: JSON.stringify({ status: 'PROCESSING' })
                      });
                      if (res.ok) {
                        alert("Order marked as PACKED!");
                        fetchOrders();
                        setSelectedOrder(null);
                        setPackedItems([]);
                      }
                    }}
                    className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${packedItems.length === (selectedOrder.items?.length || 0) ? 'bg-charcoal text-ivory hover:bg-wine' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                   >
                      <Package size={18} /> Mark as Packed
                   </button>
                   <button 
                    onClick={() => {
                      // Temporary shipping label generator
                      setSelectedIds([selectedOrder.id]);
                      handlePrintSlips([selectedOrder.id]);
                    }}
                    className="w-full bg-wine text-ivory py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-all flex items-center justify-center gap-3"
                   >
                      <Truck size={18} /> Print Packing Slip
                   </button>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 text-gray-300">
                <div className="p-6 bg-gray-50 rounded-full">
                  <Package size={48} />
                </div>
                <p className="text-sm font-medium">Select an order from the list to start shipping</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <PackingSlipModal 
        isOpen={isPackingSlipOpen} 
        onClose={() => setIsPackingSlipOpen(false)} 
        orders={packingSlipOrders} 
        storeSettings={storeSettings} 
      />
    </div>
  );
}
