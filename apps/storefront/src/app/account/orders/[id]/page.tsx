"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { 
  ArrowLeft, 
  Package, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Truck, 
  ShoppingBag, 
  ExternalLink, 
  Printer, 
  Loader2, 
  ChevronRight 
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { getToken, isAuthenticated, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  function getSmartStatus(order: any) {
    if (order.status === 'PAYMENT_PENDING') {
      const ageInMinutes = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60);
      return ageInMinutes > 30 ? 'ABANDONED' : 'PAYMENT_PENDING';
    }
    if (order.status === 'CANCELLED' && order.paymentId) {
      return 'FAILED'; // Usually a gateway failure
    }
    return order.status;
  }

  function getDisplayStatus(status: string) {
    if (status === 'PAYMENT_PENDING') return 'Awaiting Payment';
    if (status === 'FAILED') return 'Payment Failed';
    if (status === 'ABANDONED') return 'Abandoned';
    return status;
  }

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        fetchOrder();
      } else {
        window.location.href = "/sign-in";
      }
    }
  }, [id, authLoading, isAuthenticated]);

  const fetchOrder = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6005'}/api/v1/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setOrder(data);
    } catch (error) {
       console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) return (
    <div className="h-screen flex items-center justify-center bg-ivory">
       <Loader2 className="animate-spin text-wine" size={32} />
    </div>
  );

  if (!order) return <div className="p-20 text-center font-bold text-gray-500 uppercase tracking-widest bg-ivory min-h-screen">Order not discovered.</div>;

  const address = order.shippingAddress;

  return (
    <div className="min-h-screen bg-ivory pt-32 pb-32">
       <div className="max-w-5xl mx-auto px-6">
          
          {/* Navigation */}
          <Link href="/account" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-charcoal/40 hover:text-wine transition-colors mb-12 group">
             <div className="p-2 bg-white rounded-lg border border-charcoal/5 group-hover:border-wine/20 transition-all"><ArrowLeft size={16} /></div>
             Back to Wardrobe
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12">
             
             {/* Main Journey (Left) */}
             <div className="space-y-12">
                
                {/* Order Status Card */}
                <div className="bg-white p-10 rounded-[40px] border border-charcoal/5 shadow-xl space-y-10">
                   <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                      <div className="space-y-1">
                         <span className="text-[10px] font-bold text-wine tracking-widest uppercase">Raaghas Pursuit</span>
                         <h1 className="text-4xl font-bold tracking-tight text-charcoal">
                            {order.formattedOrderNumber || (order.orderNumber != null ? `RGS-${order.orderNumber + 1000}` : order.id.slice(-10).toUpperCase())}
                         </h1>
                         <p className="text-xs text-charcoal/40 font-medium">Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}</p>
                      </div>
                      {(() => {
                        const smartStatus = getSmartStatus(order);
                        return (
                          <div className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                            smartStatus === 'DELIVERED' ? 'bg-green-50 text-green-600 border-green-100' :
                            smartStatus === 'SHIPPED' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                            (smartStatus === 'CANCELLED' || smartStatus === 'FAILED') ? 'bg-red-50 text-red-600 border-red-100' :
                            smartStatus === 'ABANDONED' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                            'bg-orange-50 text-orange-600 border-orange-100'
                          }`}>
                            {getDisplayStatus(smartStatus)}
                          </div>
                        );
                      })()}
                   </div>

                   {/* Journey Timeline */}
                   <div className="relative py-8">
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-50 -translate-y-1/2" />
                      <div className="absolute top-1/2 left-0 h-0.5 bg-wine -translate-y-1/2 transition-all duration-1000" style={{ 
                        width: order.status === 'PENDING' ? '12.5%' :
                               order.status === 'CONFIRMED' ? '37.5%' :
                               order.status === 'SHIPPED' ? '62.5%' :
                               order.status === 'DELIVERED' ? '100.5%' : '0%'
                      }} />
                      
                      <div className="flex justify-between relative">
                         {[
                            { label: "Ordered", desc: "Received", step: 'PENDING', icon: <ShoppingBag size={14} /> },
                            { label: "Approved", desc: "Crafting", step: 'CONFIRMED', icon: <CheckCircle2 size={14} /> },
                            { label: "Dispatched", desc: "In Transit", step: 'SHIPPED', icon: <Truck size={14} /> },
                            { label: "Arrived", desc: "Home", step: 'DELIVERED', icon: <MapPin size={14} /> }
                         ].map((step, idx) => {
                            const active = order.status === step.step || order.status === 'PAYMENT_PENDING' || (idx === 0 && order.status !== 'PENDING' && order.status !== 'PAYMENT_PENDING' && order.status !== 'ABANDONED') || (idx === 1 && (order.status === 'SHIPPED' || order.status === 'DELIVERED')) || (idx === 2 && order.status === 'DELIVERED');
                            return (
                               <div key={idx} className="flex flex-col items-center text-center gap-3">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${active ? 'bg-wine text-white shadow-xl' : 'bg-white border text-gray-200'}`}>
                                     {step.icon}
                                  </div>
                                  <div className="space-y-0.5">
                                     <p className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-charcoal' : 'text-gray-300'}`}>{step.label}</p>
                                     <p className={`text-[8px] uppercase font-bold tracking-[0.2em] font-sans ${active ? 'text-wine' : 'text-gray-200'}`}>{step.desc}</p>
                                  </div>
                               </div>
                            )
                         })}
                      </div>
                   </div>

                   {/* Quick Actions (In-Card) */}
                   <div className="pt-10 border-t border-charcoal/5 flex flex-wrap gap-4">
                      {order.trackingId && (
                         <a 
                           href={`https://www.google.com/search?q=${order.carrierName}+tracking+${order.trackingId}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="flex items-center gap-2 px-6 py-3 bg-charcoal text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-wine transition-all"
                         >
                            <ExternalLink size={14} /> Track via {order.carrierName}
                         </a>
                      )}
                      <button className="flex items-center gap-2 px-6 py-3 bg-white border border-charcoal/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-charcoal transition-all">
                         <Printer size={14} /> Print Invoice
                      </button>
                   </div>
                </div>

                {/* Live Tracking Activities */}
                {order.fulfillments?.[0]?.shipments?.[0]?.trackingHistory && (
                  <div className="bg-white p-10 rounded-[40px] border border-charcoal/5 shadow-xl space-y-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                       <Truck size={140} className="text-wine rotate-12" />
                    </div>
                    
                    <div className="flex items-center justify-between relative z-10">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40 flex items-center gap-2">
                        <Clock size={14} className="text-wine" /> Journey Milestones
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-wine uppercase tracking-[0.2em]">Real-time Sync</span>
                      </div>
                    </div>
                    
                    <div className="space-y-10 relative z-10">
                      {/* Vertical Line */}
                      <div className="absolute left-[19px] top-4 bottom-4 w-px bg-charcoal/5" />
                      
                      {(order.fulfillments[0].shipments[0].trackingHistory as any[]).slice().reverse().map((event, idx) => (
                        <div key={idx} className="flex gap-8 relative">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 z-10 transition-all ${idx === 0 ? 'bg-wine text-white shadow-lg' : 'bg-white border border-charcoal/5 text-charcoal/20'}`}>
                            {idx === 0 ? <CheckCircle2 size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                          </div>
                          <div className="space-y-2 pt-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className={`text-sm font-bold tracking-tight ${idx === 0 ? 'text-charcoal' : 'text-charcoal/50'}`}>{event.message || event.status}</p>
                              {event.location && (
                                <span className="text-[9px] font-bold text-wine uppercase tracking-widest bg-wine/5 px-2 py-0.5 rounded-md border border-wine/10">
                                  {event.location}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-[10px] text-charcoal/30 font-bold uppercase tracking-widest">{new Date(event.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                              <div className="w-1 h-1 rounded-full bg-charcoal/10" />
                              <p className="text-[10px] text-charcoal/30 font-bold uppercase tracking-widest">{new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items Breakdown */}
                <div className="bg-white rounded-[40px] border border-charcoal/5 shadow-sm overflow-hidden">
                   <div className="p-10 border-b border-charcoal/5 flex justify-between items-center">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">Inventory Summary</h3>
                      <span className="text-[10px] font-bold text-wine uppercase tracking-[0.2em]">{order.items.length} Elements</span>
                   </div>
                   <div className="divide-y divide-charcoal/5">
                      {order.items.map((item: any, idx: number) => (
                        <div key={idx} className="p-8 flex items-center gap-8 group">
                           <div className="w-20 h-28 bg-beige rounded-2xl overflow-hidden border border-charcoal/5 shrink-0 shadow-sm transition-transform group-hover:scale-105 duration-500">
                              <img src={item.variant?.product?.images?.[0]?.url} alt="" className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1 space-y-1">
                              <h4 className="text-lg font-serif text-charcoal group-hover:text-wine transition-colors">{item.variant?.product?.title || "Product Unavailable"}</h4>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">SKU: {item.variant?.sku || "N/A"} · Size: {item.variant?.option1Value || "N/A"}</p>
                           </div>
                           <div className="text-right space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/30">Qty: {item.quantity}</p>
                              <p className="text-sm font-bold text-charcoal font-sans">₹{Number(item.price).toLocaleString()}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                   <div className="bg-gray-50/50 p-10 flex justify-end">
                      <div className="w-64 space-y-4">
                         <div className="flex justify-between text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span>₹{Number(order.totalAmount).toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">
                            <span>Shipping</span>
                            <span className="text-green-600">Complimentary</span>
                         </div>
                         <div className="pt-4 border-t border-charcoal/10 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-charcoal uppercase tracking-widest">Total Settle</span>
                            <span className="text-2xl font-bold text-charcoal font-sans">₹{Number(order.totalAmount).toLocaleString()}</span>
                         </div>
                      </div>
                   </div>
                </div>

             </div>

             {/* Sidebar Info (Right) */}
             <div className="space-y-10">
                
                {/* Consignee Card */}
                <div className="bg-white p-8 rounded-[40px] border border-charcoal/5 shadow-sm space-y-6">
                   <div className="space-y-2">
                      <div className="w-10 h-10 bg-beige rounded-2xl flex items-center justify-center text-wine"><MapPin size={20} /></div>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">Consignee Destination</h3>
                   </div>
                   <div className="space-y-1">
                      <p className="font-bold text-charcoal">{order.customerName}</p>
                      <p className="text-xs text-charcoal/50 leading-relaxed font-sans">
                         {address.line1}<br />
                         {address.line2 && <>{address.line2}<br /></>}
                         {address.city}, {address.state}<br />
                         {address.postalCode}
                      </p>
                   </div>
                   <div className="pt-6 border-t border-charcoal/5 space-y-3">
                      <div className="flex items-center gap-3 text-charcoal/60 hover:text-wine transition-colors cursor-pointer text-xs font-sans">
                         <Phone size={14} /> {order.customerPhone}
                      </div>
                      <div className="flex items-center gap-3 text-charcoal/60 hover:text-wine transition-colors cursor-pointer text-xs font-sans truncate">
                         <Mail size={14} /> {order.customerEmail}
                      </div>
                   </div>
                </div>

                {/* Settle Status Card */}
                <div className="bg-charcoal text-white p-8 rounded-[40px] shadow-xl space-y-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-wine/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                   <div className="space-y-2">
                      <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-wine"><CreditCard size={20} /></div>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Settle Status</h3>
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                         <span className="text-xs font-medium text-white/60">Method</span>
                         <span className="text-[9px] font-bold uppercase tracking-widest">{order.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-xs font-medium text-white/60">Status</span>
                         <span className="text-[9px] font-bold uppercase tracking-widest text-wine flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-wine rounded-full" /> Authorized
                         </span>
                      </div>
                   </div>
                </div>

                {/* Support Card */}
                <div className="p-8 border border-charcoal/10 border-dashed rounded-[40px] text-center space-y-4">
                   <p className="text-[9px] font-bold text-charcoal/40 uppercase tracking-widest">Need Concierge Assist?</p>
                   <Link href="/support" className="inline-flex items-center gap-2 text-xs font-bold text-wine uppercase tracking-[0.2em] hover:opacity-70 transition-opacity">
                      Contact Stylist <ChevronRight size={14} />
                   </Link>
                </div>

             </div>

          </div>

       </div>
    </div>
  );
}
