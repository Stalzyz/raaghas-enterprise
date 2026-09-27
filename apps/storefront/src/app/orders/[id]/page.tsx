"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { 
  Package, 
  MapPin, 
  CreditCard, 
  Truck, 
  Calendar, 
  ChevronLeft, 
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Box,
  Gift,
  Sparkles,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { InvoiceModal } from "@/components/modals/InvoiceModal";

const statusSteps = [
  { 
    status: "PENDING", 
    label: "Luxury Selection", 
    icon: <Clock size={18} strokeWidth={1.5} />, 
    description: "Your selection has been received by our luxury concierge." 
  },
  { 
    status: "CONFIRMED", 
    label: "Artisan Preparation", 
    icon: <Sparkles size={18} strokeWidth={1.5} />, 
    description: "Our master artisans are currently preparing your ensemble with meticulous care." 
  },
  { 
    status: "SHIPPED", 
    label: "In Transit", 
    icon: <Truck size={18} strokeWidth={1.5} />, 
    description: "Your luxury parcel has commenced its journey from our atelier." 
  },
  { 
    status: "DELIVERED", 
    label: "Hand-Delivered", 
    icon: <Gift size={18} strokeWidth={1.5} />, 
    description: "The Raaghas experience has arrived. We hope you cherish every thread." 
  },
];

function OrderTrackingDetailPageInner() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const { getToken, isAuthenticated, loading: authLoading } = useAuth();
  
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Track pending purchase pixel if we just returned from checkout
  useEffect(() => {
    const pendingPurchase = sessionStorage.getItem("pending_purchase_pixel");
    if (!pendingPurchase) return;
    sessionStorage.removeItem("pending_purchase_pixel");
    try {
      const pd = JSON.parse(pendingPurchase);
      let attempts = 0;
      const fire = () => {
        if (typeof window !== "undefined" && (window as any).fbq) {
          import("@/components/analytics/MetaPixel").then((m) => {
            m.trackMetaEvent("Purchase", {
              value: pd.value,
              currency: pd.currency,
              content_ids: pd.content_ids,
              content_type: pd.content_type,
              num_items: pd.num_items,
              order_id: pd.order_id
            }, pd.eventId);
          });
        } else if (attempts < 20) {
          attempts++;
          setTimeout(fire, 300);
        }
      };
      fire();
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchOrderDetails();
    }
  }, [authLoading, id, email]);

  const fetchOrderDetails = async () => {
    setIsLoading(true);
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6005'}/api/v1/orders/${id}`;
      const headers: any = {};

      if (email) {
        url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6005'}/api/v1/orders/track?orderId=${id}&email=${email}`;
      } else if (isAuthenticated) {
        const token = await getToken();
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Could not find order");
      const data = await res.json();
      setOrder(data);
    } catch (err) {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToWhatsApp = async () => {
    setIsSubscribing(true);
    // Mocking API call to WhatsApp Nudge Engine
    await new Promise(r => setTimeout(r, 1500));
    setIsSubscribing(false);
    alert("Subscription Successful! You'll receive live luxury updates via WhatsApp.");
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="animate-spin text-wine" size={32} />
           <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-wine/40">Opening your luxury files...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center space-y-8 px-6 text-center overflow-hidden relative">
         <div className="absolute text-charcoal/[0.02] font-serif text-[400px] pointer-events-none select-none -rotate-12 translate-y-20">LOST</div>
         <div className="w-24 h-24 bg-wine/5 rounded-full flex items-center justify-center text-wine border border-wine/10 relative z-10">
            <AlertTriangle size={40} strokeWidth={1} />
         </div>
         <div className="space-y-2 relative z-10">
            <h1 className="text-4xl font-serif">Journey Unreachable</h1>
            <p className="text-charcoal/50 max-w-sm">We couldn't locate this specific luxury record. Please verify your credentials.</p>
         </div>
         <Link href="/orders/track" className="bg-charcoal text-white px-12 py-4 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] relative z-10 hover:bg-wine transition-colors shadow-2xl">
           Verify Credentials
         </Link>
      </div>
    );
  }

  const currentStatusIndex = statusSteps.findIndex(s => s.status === order.status);
  const displayStatus = currentStatusIndex === -1 ? 0 : currentStatusIndex;

  return (
    <div className="min-h-screen bg-ivory pb-24 selection:bg-wine/10">
      
      {/* ─── LUXURY HEADER ─── */}
      <div className="bg-white/50 backdrop-blur-md border-b border-charcoal/5 px-6 md:px-12 py-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-charcoal">
           <Link href={email ? "/orders/track" : "/account/orders"} className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-[0.3em] opacity-40 hover:opacity-100 hover:text-wine transition-all">
              <ChevronLeft size={16} /> Luxury Vault
           </Link>
           <div className="text-center">
             <h2 className="text-xs font-bold tracking-[0.4em] uppercase opacity-20">Tracking Shipment</h2>
             <p className="font-serif text-lg italic">Order {order.formattedOrderNumber || (order.orderNumber != null ? `RGS-${order.orderNumber + 1000}` : order.id.slice(-6).toUpperCase())}</p>
           </div>
           <div className="w-32 hidden md:block">
             <button onClick={() => setIsInvoiceModalOpen(true)} className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.2em] text-wine border border-wine/20 px-4 py-2 rounded-full hover:bg-wine hover:text-white transition-all shadow-sm">
               <FileText size={14} />Invoice
             </button>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-20">
        
        {/* ─── LEFT COLUMN: Sabyasachi Timeline ─── */}
        <div className="space-y-24">
          
          <div className="space-y-16">
            <div className="space-y-2">
               <span className="text-[10px] bg-wine text-white px-3 py-1 rounded-full font-bold uppercase tracking-[0.3em]">{order.status}</span>
               <h1 className="text-5xl md:text-7xl font-serif text-charcoal">The Life of Your <span className="italic">Ensemble</span></h1>
            </div>

            {/* Refund Notification Banner */}
            {Number(order.totalRefunded || 0) > 0 && (
              <div className="bg-wine/[0.03] border border-wine/15 p-6 rounded-3xl flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-wine/10 flex items-center justify-center text-wine shrink-0 mt-0.5">
                  <Sparkles size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal">
                    {order.financialStatus === 'refunded' ? 'Full Refund Processed' : 'Partial Refund Processed'}
                  </h4>
                  <p className="text-sm font-serif italic text-charcoal/70 leading-relaxed">
                    A refund of <strong className="text-wine not-italic font-bold">₹{Number(order.totalRefunded).toLocaleString()}</strong> has been credited to your {order.allRefunds?.[0]?.method === 'WALLET' ? 'Raaghas Luxe Wallet' : 'original payment method'}.
                  </p>
                </div>
              </div>
            )}

            {/* Sabyasachi Style Vertical Timeline */}
            <div className="relative pl-12 space-y-20">
               {/* Vertical Silk Path */}
               <div className="absolute left-4 top-4 bottom-4 w-[1px] bg-charcoal/5 z-0" />
               <motion.div 
                 initial={{ height: 0 }}
                 animate={{ height: `${(displayStatus / (statusSteps.length - 1)) * 100}%` }}
                 className="absolute left-4 top-4 w-[1px] bg-wine z-10 transition-all duration-[2000ms] ease-in-out origin-top"
               />

               {statusSteps.map((step, idx) => {
                 const isCompleted = idx <= displayStatus;
                 const isCurrent = idx === displayStatus;
                 
                 return (
                   <motion.div 
                     key={idx} 
                     initial={{ opacity: 0, x: 20 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     transition={{ delay: idx * 0.2 }}
                     className={`relative z-20 flex gap-8 group`}
                   >
                      <div className={`absolute -left-[32px] w-4 h-4 rounded-full border border-ivory transition-all duration-1000 ${
                        isCompleted ? "bg-wine scale-125 shadow-[0_0_15px_rgba(114,30,47,0.4)]" : "bg-white border-charcoal/10"
                      } ${isCurrent ? "ring-8 ring-wine/5" : ""}`} />
                      
                      <div className="space-y-3 flex-1 pb-4">
                         <div className="flex items-center gap-4">
                           <span className={`${isCompleted ? "text-wine" : "text-charcoal/10"}`}>{step.icon}</span>
                           <h3 className={`text-sm uppercase font-bold tracking-[0.4em] ${isCompleted ? "text-charcoal" : "text-charcoal/10"}`}>
                             {step.label}
                           </h3>
                         </div>
                         <p className={`text-base md:text-lg font-serif italic max-w-lg transition-all duration-700 ${isCompleted ? "text-charcoal/60" : "text-charcoal/5 opacity-5"}`}>
                           {step.description}
                         </p>
                         {isCurrent && isCompleted && (
                           <div className="text-[10px] text-wine font-bold uppercase tracking-widest flex items-center gap-2 mt-2">
                             <div className="w-1.5 h-1.5 bg-wine rounded-full animate-pulse" />
                             Status Update: {new Date(order.updatedAt).toLocaleDateString('en-GB')}
                           </div>
                         )}
                      </div>
                   </motion.div>
                 );
               })}
            </div>
          </div>

          {/* Artisanal Detail Grid */}
          <div className="grid md:grid-cols-2 gap-12 pt-12 border-t border-charcoal/5">
              <div className="space-y-4">
                 <h4 className="text-[10px] uppercase font-bold tracking-[0.4em] text-charcoal/20">Shipment Details</h4>
                 <div className="bg-white p-8 rounded-[32px] border border-charcoal/5 space-y-6 shadow-sm">
                    {order.trackingId ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                           <p className="text-xs font-bold text-charcoal/40 uppercase tracking-widest">Courier: {order.carrierName}</p>
                           <ExternalLink size={14} className="text-wine/40" />
                        </div>
                        <p className="text-2xl font-mono text-charcoal">{order.trackingId}</p>
                        <button className="w-full bg-charcoal text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-wine transition-all">Track Official</button>
                      </div>
                    ) : (
                      <p className="text-sm font-serif italic text-charcoal/40">Tracking credentials will manifest once the parcel leaves the atelier.</p>
                    )}
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] uppercase font-bold tracking-[0.4em] text-charcoal/20">Luxury Concierge</h4>
                 <div className="bg-wine/[0.02] p-8 rounded-[32px] border border-wine/5 space-y-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                      <Sparkles size={100} className="text-wine" />
                    </div>
                    <div className="relative z-10 space-y-4">
                      <p className="text-sm font-serif italic text-charcoal/60 leading-relaxed">
                        Stay connected with your ensemble’s journey. Subscribe to real-time luxury updates.
                      </p>
                      <button 
                         onClick={subscribeToWhatsApp}
                         disabled={isSubscribing}
                         className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-widest text-wine border-b-2 border-wine/20 pb-2 hover:border-wine transition-all disabled:opacity-50"
                      >
                         {isSubscribing ? "Securing Connection..." : "Luxe Updates via WhatsApp"}
                      </button>
                    </div>
                 </div>
              </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Order Composition ─── */}
        <div className="space-y-12">
          
          <div className="bg-white p-10 md:p-12 rounded-[40px] border border-charcoal/5 shadow-2xl space-y-12">
             <div className="space-y-2 border-b border-charcoal/5 pb-8">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-charcoal/20">The Composition</h3>
                <p className="font-serif text-xl italic text-charcoal">Order Artifacts</p>
             </div>
             
             <div className="space-y-10">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex gap-6 group">
                     <div className="w-24 aspect-[3/4] bg-ivory overflow-hidden relative shadow-md group-hover:shadow-2xl transition-all duration-700">
                        <img src={item.variant.product.images?.[0]?.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                     </div>
                     <div className="flex-1 py-1 space-y-2 flex flex-col justify-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-wine mb-1">{item.variant.product.type || "RAAGHAS LUXE"}</p>
                          <h4 className="text-sm font-bold text-charcoal tracking-widest uppercase line-clamp-2 leading-tight">{item.variant.product.title}</h4>
                          {item.status === 'RETURNED' && (
                            <span className="inline-block mt-1 px-2.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-[8px] font-bold uppercase tracking-widest">
                              Returned · Refunded
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-end border-t border-charcoal/5 pt-3 mt-1">
                          <p className="text-[10px] text-charcoal/40 font-bold tracking-widest">Qty: {item.quantity} · {item.variant.option1Name}: {item.variant.option1Value}</p>
                          <p className="font-serif italic text-charcoal">₹{Number(item.price).toLocaleString()}</p>
                        </div>
                     </div>
                  </div>
                ))}
             </div>

             <div className="pt-10 border-t border-charcoal/5 space-y-4">
                <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-charcoal/30">
                   <span>Subtotal Valued</span>
                   <span>₹{order.items.reduce((sum: number, item: any) => sum + (Number(item.price) * item.quantity), 0).toLocaleString()}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-wine underline decoration-wine/20 underline-offset-4 font-serif italic">
                     <span>Elite Privileges ({order.discountCode})</span>
                     <span>-₹{Number(order.discountAmount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-charcoal/30">
                   <span>Luxury Shipment</span>
                   {Number(order.shipping || 0) === 0 ? (
                      <span className="text-wine">Complimentary</span>
                   ) : (
                      <span className="text-wine font-serif italic text-sm">₹{Number(order.shipping).toLocaleString()}</span>
                   )}
                </div>
                {Number(order.totalRefunded || 0) > 0 && (
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-orange-600 font-serif italic">
                     <span>Refund Processed</span>
                     <span>-₹{Number(order.totalRefunded).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-6 border-t border-charcoal/5 items-baseline">
                   <span className="text-[10px] uppercase font-bold tracking-[0.5em] text-charcoal/20">
                     {Number(order.totalRefunded || 0) > 0 ? "Net Amount Paid" : "Net Artifact Value"}
                   </span>
                   <span className="text-wine text-3xl font-serif italic">
                     ₹{Number(order.netPaid != null ? order.netPaid : (Number(order.totalAmount) - Number(order.totalRefunded || 0))).toLocaleString()}
                   </span>
                </div>
             </div>
          </div>

          <div className="px-10 space-y-8">
             <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-[0.4em] text-charcoal/20">Final Destination</h4>
                <div className="font-serif text-charcoal/60 italic leading-relaxed">
                   <p className="text-charcoal font-bold not-italic mb-2">{order.customerName}</p>
                   <p>{order.shippingAddress.address}</p>
                   <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                   <p className="opacity-40">{order.shippingAddress.zipCode}</p>
                   <p className="pt-4 border-t border-charcoal/5 mt-4 text-[10px] font-sans font-bold uppercase tracking-widest not-italic">Phone: {order.customerPhone}</p>
                </div>
             </div>
          </div>

        </div>

      </div>

      <InvoiceModal 
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        order={order}
      />
    </div>
  );
}

export default function OrderTrackingDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <Loader2 className="animate-spin text-wine" size={32} />
      </div>
    }>
      <OrderTrackingDetailPageInner />
    </Suspense>
  );
}
