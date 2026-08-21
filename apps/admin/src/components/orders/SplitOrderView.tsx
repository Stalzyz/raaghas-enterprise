"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Package, ShoppingBag, Truck, ExternalLink, ShieldCheck, User, Calendar, CreditCard, ChevronRight } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";

interface SplitOrderViewProps {
  orders: any[];
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  isLoading: boolean;
}

const STATUS_CONFIG: any = {
  PAYMENT_PENDING: { label: "Awaiting Payment", color: "bg-amber-50 text-amber-600 border-amber-100" },
  ABANDONED: { label: "Abandoned", color: "bg-gray-100 text-gray-500 border-gray-200" },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-50 text-blue-600 border-blue-100" },
  PROCESSING: { label: "Processing", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  SHIPPED: { label: "Shipped", color: "bg-purple-50 text-purple-600 border-purple-100" },
  DELIVERED: { label: "Delivered", color: "bg-green-50 text-green-600 border-green-100" },
  CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-100" },
};

export function SplitOrderView({ orders, selectedOrderId, onSelectOrder, isLoading }: SplitOrderViewProps) {
  const { token } = useAdminAuth();
  const [activeOrderDetail, setActiveOrderDetail] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      onSelectOrder(orders[0].id);
    }
  }, [orders, selectedOrderId, onSelectOrder]);

  useEffect(() => {
    if (!selectedOrderId || !token) return;

    const fetchDetail = async () => {
      setIsDetailLoading(true);
      try {
        const res = await fetch(`${API_BASE}/orders/admin/${selectedOrderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setActiveOrderDetail(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch split view order detail:", err);
      } finally {
        setIsDetailLoading(false);
      }
    };

    fetchDetail();
  }, [selectedOrderId, token]);

  return (
    <div className="flex h-[calc(100vh-14rem)] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Master Left List Pane */}
      <div className="w-80 md:w-96 border-r border-gray-200 flex flex-col flex-shrink-0 bg-white">
        <div className="p-3.5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Order Queue ({orders.length})</span>
          <span className="text-[10px] font-bold text-wine">Split View Active</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin text-wine mx-auto mb-2" size={24} />
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Loading queue...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
              No orders found
            </div>
          ) : (
            orders.map((order) => {
              const isSelected = order.id === selectedOrderId;
              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order.id)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected ? "bg-wine/5 border-l-4 border-wine" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-xs font-bold text-gray-900 tracking-wider">
                        #{order.formattedOrderNumber || (order.orderNumber != null ? String(order.orderNumber + 1000) : order.id.slice(-8).toUpperCase())}
                      </span>
                      <p className="text-xs font-semibold text-gray-700 mt-0.5 truncate">{order.customerName}</p>
                    </div>
                    <span className="text-xs font-bold text-wine whitespace-nowrap">
                      ₹{Number(order.totalAmount).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2.5">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${STATUS_CONFIG[order.status]?.color || 'bg-gray-50 text-gray-500'}`}>
                      {STATUS_CONFIG[order.status]?.label || order.status}
                    </span>
                    <span className="text-[9px] text-gray-400 font-medium">
                      {format(new Date(order.createdAt), "MMM dd, p")}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Right Pane */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 custom-scrollbar">
        {isDetailLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="animate-spin text-wine mb-2" size={32} />
          </div>
        ) : activeOrderDetail ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header Toolbar */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900">
                    #{activeOrderDetail.formattedOrderNumber || activeOrderDetail.id.slice(-8).toUpperCase()}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${STATUS_CONFIG[activeOrderDetail.status]?.color || 'bg-gray-50 text-gray-500'}`}>
                    {STATUS_CONFIG[activeOrderDetail.status]?.label || activeOrderDetail.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  Placed on {format(new Date(activeOrderDetail.createdAt), "PPP 'at' p")}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/orders/${activeOrderDetail.id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-wine text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-wine-dark transition-all"
                >
                  Full View <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            {/* Customer & Shipping summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <User size={14} /> Customer Profile
                </h4>
                <div>
                  <p className="text-sm font-bold text-gray-900">{activeOrderDetail.customerName}</p>
                  <p className="text-xs text-gray-500">{activeOrderDetail.customerEmail}</p>
                  <p className="text-xs text-gray-500">{activeOrderDetail.customerPhone}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Truck size={14} /> Shipping Information
                </h4>
                <div>
                  <p className="text-xs text-gray-700 font-medium">
                    {typeof activeOrderDetail.shippingAddress === 'string' 
                      ? activeOrderDetail.shippingAddress 
                      : [activeOrderDetail.shippingAddress?.addressLine1, activeOrderDetail.shippingAddress?.city, activeOrderDetail.shippingAddress?.state, activeOrderDetail.shippingAddress?.pincode].filter(Boolean).join(", ")}
                  </p>
                  {activeOrderDetail.trackingId && (
                    <p className="text-xs font-mono font-bold text-wine mt-2">Tracking: {activeOrderDetail.trackingId}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Ordered Items list */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ordered Items ({activeOrderDetail.items?.length || 0})</h4>
              <div className="divide-y divide-gray-100">
                {activeOrderDetail.items?.map((item: any, idx: number) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                        {item.variant?.product?.images?.[0]?.url || item.imageUrl ? (
                          <img 
                            src={item.variant?.product?.images?.[0]?.url || item.imageUrl} 
                            alt="Product"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={16} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{item.productName || item.variant?.product?.title || 'Item'}</p>
                        <p className="text-[10px] text-gray-400 font-mono">SKU: {item.sku || item.variant?.sku || 'N/A'}</p>
                        <p className="text-[10px] font-bold text-wine mt-0.5">{item.quantity}x @ ₹{Number(item.price).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-900">₹{(item.quantity * Number(item.price)).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Order Value</span>
                <span className="text-lg font-bold text-wine">₹{Number(activeOrderDetail.totalAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold uppercase tracking-widest">
            Select an order from the left queue to view details
          </div>
        )}
      </div>
    </div>
  );
}
