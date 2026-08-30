"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/api";
import { 
  Truck, Package, CheckCircle2, Clock, MapPin, 
  ArrowLeft, Loader2,
  AlertCircle, ShieldCheck, ExternalLink, Phone,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export default function PublicTrackingPage() {
  const { id } = useParams();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTracking();
  }, [id]);

  const fetchTracking = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/logistics/tracking/${id}`);
      if (!res.ok) throw new Error("Shipment not found");
      const data = await res.json();
      setShipment(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-wine" size={40} />
      <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-gray-400">Locating your Raaghas shipment...</p>
    </div>
  );

  if (error || !shipment) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6 max-w-md mx-auto text-center px-6">
      <div className="p-6 bg-red-50 text-red-500 rounded-full">
        <AlertCircle size={40} />
      </div>
      <div>
        <h1 className="text-2xl font-serif text-charcoal">Shipment Not Found</h1>
        <p className="text-sm text-gray-400 mt-2">We couldn't find active tracking details for that identifier. Please verify your order number or tracking ID.</p>
      </div>
      <Link href="/" className="bg-wine text-ivory px-8 py-4 rounded-xl text-[10px] uppercase font-bold tracking-widest shadow-xl">
        Back to Shopping
      </Link>
    </div>
  );

  const courierName = shipment.courier || 'Standard Logistics';
  const isSTCourier = courierName.toLowerCase().includes('st courier') || courierName.toLowerCase().includes('st_courier');
  const isIndiaPost = courierName.toLowerCase().includes('india post') || courierName.toLowerCase().includes('speed post');
  const trackingUrl = shipment.trackingUrl || (isSTCourier 
    ? `https://stcourier.com/track/shipment?awb=${encodeURIComponent(shipment.trackingId)}`
    : isIndiaPost 
    ? `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`
    : null);

  // Extract latest delivery staff info if in transit / out for delivery
  const latestEvent = shipment.history && shipment.history.length > 0 ? shipment.history[shipment.history.length - 1] : null;
  const delvStaff = latestEvent?.delvStaff || null;

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20 space-y-8">
        <Link href="/account/orders" className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-charcoal/40 hover:text-wine transition-colors">
          <ArrowLeft size={14} /> Back to My Orders
        </Link>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-charcoal/5 border border-gray-100 space-y-10">
          
          {/* Header & Carrier Badge */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-gray-100">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200/60">
                  {isSTCourier ? '⚡ ST Courier Express' : isIndiaPost ? '📮 India Post Speed Post' : courierName}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif text-charcoal">Track Shipment</h1>
              <p className="text-xs text-charcoal/50 font-mono font-medium">AWB / Tracking: <span className="font-bold text-charcoal">{shipment.trackingId}</span></p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] ${
                shipment.status === 'DELIVERED' 
                  ? 'bg-emerald-600 text-white' 
                  : shipment.status === 'OUT_FOR_DELIVERY'
                  ? 'bg-blue-600 text-white'
                  : 'bg-wine text-white'
              }`}>
                {shipment.status?.replace(/_/g, ' ')}
              </div>

              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-wine hover:underline"
                >
                  Official Portal <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>

          {/* Delivery Executive Info (if DRS / Out for Delivery) */}
          {delvStaff && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-blue-900">Delivery Executive Assigned</p>
                  <p className="text-sm font-bold text-charcoal">{delvStaff}</p>
                </div>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest bg-blue-200/60 text-blue-900 px-3 py-1 rounded-full">
                Out for Delivery Today
              </span>
            </div>
          )}

          {/* Milestone Timeline */}
          <div className="space-y-8 relative">
             <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gray-100" />

             {(shipment.history || [
               { status: 'CONFIRMED', message: 'Your luxury order has been verified and confirmed at our studio.', timestamp: shipment.order?.createdAt || new Date(), location: 'Raaghas Studio' },
               { status: 'PACKED', message: 'Carefully packaged in our signature luxury presentation box.', timestamp: shipment.shippedAt || new Date(), location: 'Fulfillment Center' },
               { status: 'SHIPPED', message: `Handed over to ${courierName} for express transit.`, timestamp: shipment.shippedAt || new Date(), location: 'Origin Sorting Facility' },
             ]).map((event: any, i: number) => {
                const isLatest = i === 0 || i === (shipment.history?.length || 1) - 1;
                return (
                  <div key={i} className="relative pl-14 group">
                     {/* Node Icon */}
                     <div className={`absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md z-10 transition-all ${
                       isLatest ? 'bg-wine text-white scale-110' : 'bg-gray-100 text-gray-400'
                     }`}>
                        {event.status === 'CONFIRMED' && <ShieldCheck size={14} />}
                        {event.status === 'PACKED' && <Package size={14} />}
                        {event.status === 'SHIPPED' && <Truck size={14} />}
                        {event.status === 'DELIVERED' && <CheckCircle2 size={14} />}
                        {!['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(event.status) && <Clock size={14} />}
                     </div>

                     <div className="space-y-1">
                        <div className="flex justify-between items-center">
                           <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isLatest ? 'text-wine' : 'text-charcoal/40'}`}>
                              {event.status?.replace(/_/g, ' ')}
                           </p>
                           <p className="text-[9px] text-charcoal/30 font-bold uppercase tracking-widest">{event.location || 'In Transit'}</p>
                        </div>
                        <p className={`text-xs leading-relaxed ${isLatest ? 'text-charcoal font-medium' : 'text-charcoal/60'}`}>{event.message}</p>
                        <p className="text-[10px] text-charcoal/40 font-mono">
                           {event.timestamp ? new Date(event.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                        </p>
                     </div>
                  </div>
                );
             })}
          </div>

          {/* Delivery Meta Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-gray-100">
             <div className="space-y-2 p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-charcoal/40">
                   <Truck size={13} /> Carrier Partner
                </div>
                <div>
                   <p className="text-sm font-bold text-charcoal">{isSTCourier ? 'ST Courier Express' : isIndiaPost ? 'India Post (Speed Post)' : courierName}</p>
                   <p className="text-xs text-charcoal/60 mt-0.5 font-mono">AWB: {shipment.trackingId}</p>
                </div>
             </div>

             <div className="space-y-2 p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-charcoal/40">
                   <MapPin size={13} /> Recipient
                </div>
                <div>
                   <p className="text-sm font-bold text-charcoal">{shipment.order?.customerName || 'Valued Client'}</p>
                   <p className="text-xs text-charcoal/60 mt-0.5">Secure Doorstep Delivery</p>
                </div>
             </div>
          </div>
        </div>

        {/* Raaghas Concierge Support Card */}
        <div className="bg-charcoal text-ivory rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
           <div className="space-y-1.5 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-amber-300 text-xs font-bold uppercase tracking-widest">
                 <Sparkles size={14} /> Raaghas Client Care
              </div>
              <h3 className="text-lg font-serif">Have questions regarding your delivery?</h3>
              <p className="text-xs text-ivory/60">Our team is available 7 days a week on WhatsApp.</p>
           </div>
           
           <a 
             href={`https://wa.me/919999999999?text=${encodeURIComponent(`Hi Raaghas Support, I have a query about my shipment (Tracking: ${shipment.trackingId}).`)}`}
             target="_blank"
             rel="noopener noreferrer"
             className="bg-wine text-white px-8 py-3.5 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-wine/90 shadow-lg whitespace-nowrap"
           >
              Chat on WhatsApp
           </a>
        </div>
      </div>
    </div>
  );
}
