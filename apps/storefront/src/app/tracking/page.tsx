"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { 
  Truck, Package, CheckCircle2, Clock, MapPin, 
  ArrowLeft, Loader2, Search,
  AlertCircle, ShieldCheck, ExternalLink, Phone,
  Sparkles, Copy, Check, ChevronRight
} from "lucide-react";
import Link from "next/link";

function TrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("id") || searchParams.get("awb") || searchParams.get("order") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeId, setActiveId] = useState(initialQuery);
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [supportPhone, setSupportPhone] = useState("+919944747040");

  useEffect(() => {
    fetch(`${API_URL}/api/v1/cms/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.supportPhone) setSupportPhone(data.supportPhone);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeId) {
      fetchTracking(activeId);
    }
  }, [activeId]);

  const fetchTracking = async (idToTrack: string) => {
    if (!idToTrack.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const clean = encodeURIComponent(idToTrack.trim());
      const res = await fetch(`${API_URL}/api/v1/logistics/tracking/${clean}`);
      if (!res.ok) {
        throw new Error("Shipment not found. Please check your tracking number or order ID.");
      }
      const data = await res.json();
      setShipment(data);
    } catch (err: any) {
      setError(err.message || "Unable to locate shipment details.");
      setShipment(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setActiveId(searchQuery.trim());
    router.push(`/tracking?id=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleCopyAwb = (awb: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(awb);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const courierName = shipment?.courier || "Standard Logistics";
  const isSTCourier = courierName.toLowerCase().includes("st courier") || courierName.toLowerCase().includes("st_courier");
  const isIndiaPost = courierName.toLowerCase().includes("india post") || courierName.toLowerCase().includes("speed post");
  
  const officialTrackingUrl = shipment?.trackingUrl || (isSTCourier 
    ? `https://stcourier.com/track/shipment?awb=${encodeURIComponent(shipment?.trackingId || "")}`
    : isIndiaPost 
    ? `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`
    : null);

  const cleanSupportPhone = supportPhone.replace(/[^0-9]/g, "");

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-charcoal pb-24">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-100 py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-wine/5 border border-wine/10 text-wine text-[10px] font-bold uppercase tracking-[0.25em]">
            <Sparkles size={12} /> Raaghas Unified Logistics
          </div>
          <h1 className="text-3xl md:text-5xl font-serif text-charcoal">Track Your Order</h1>
          <p className="text-xs md:text-sm text-charcoal/60 max-w-md mx-auto leading-relaxed">
            Real-time tracking for all shipments dispatched via <span className="font-bold text-charcoal">India Post (Speed Post)</span> & <span className="font-bold text-charcoal">ST Courier Express</span>.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="pt-4 max-w-xl mx-auto">
            <div className="relative flex items-center shadow-lg shadow-charcoal/5 rounded-2xl bg-white border border-gray-200 focus-within:border-wine transition-all overflow-hidden p-1.5">
              <div className="pl-4 text-charcoal/40">
                <Search size={18} />
              </div>
              <input 
                type="text"
                placeholder="Enter Order ID (e.g. RAAG-1001) or AWB Number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent px-3 py-3 text-xs md:text-sm font-medium outline-none text-charcoal placeholder:text-charcoal/30"
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="bg-wine text-white px-6 py-3 rounded-xl text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : "Track"}
              </button>
            </div>
            
            {/* Quick Carrier Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3 text-[10px] font-bold text-charcoal/50">
              <span className="uppercase tracking-widest text-charcoal/30">Supported Carriers:</span>
              <span className="px-2.5 py-1 rounded-md bg-gray-100 text-charcoal/70">⚡ ST Courier</span>
              <span className="px-2.5 py-1 rounded-md bg-gray-100 text-charcoal/70">📮 India Post (Speed Post)</span>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto px-6 pt-10 space-y-8">
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-wine" size={36} />
            <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-charcoal/40">
              Fetching live transit milestones...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-white rounded-3xl p-8 md:p-12 border border-red-100 shadow-sm text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-serif text-charcoal">Shipment Not Found</h3>
              <p className="text-xs text-charcoal/60 mt-1.5 leading-relaxed">{error}</p>
            </div>
            <p className="text-[11px] text-charcoal/40">
              Tip: Enter your full order number from your confirmation email / WhatsApp message.
            </p>
          </div>
        )}

        {shipment && !loading && (
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-charcoal/5 border border-gray-100 space-y-10">
            
            {/* Header / Carrier Card */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-gray-100">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-md border ${
                    isSTCourier 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : isIndiaPost 
                      ? 'bg-amber-50 text-amber-800 border-amber-200' 
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>
                    {isSTCourier ? '⚡ ST Courier Express' : isIndiaPost ? '📮 India Post (Speed Post)' : courierName}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-serif text-charcoal">Shipment Status</h2>
                
                {/* AWB with Copy Button */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-charcoal/50 font-mono">AWB:</span>
                  <span className="text-xs font-bold font-mono text-charcoal bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    {shipment.trackingId}
                  </span>
                  <button
                    onClick={() => handleCopyAwb(shipment.trackingId)}
                    className="text-[10px] font-bold uppercase tracking-wider text-wine hover:text-black flex items-center gap-1 transition-colors pl-1"
                  >
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span className={copied ? "text-emerald-600 font-bold" : ""}>
                      {copied ? "Copied" : "Copy"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-3">
                <div className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm ${
                  shipment.status === 'DELIVERED' 
                    ? 'bg-emerald-600 text-white' 
                    : shipment.status === 'OUT_FOR_DELIVERY'
                    ? 'bg-blue-600 text-white'
                    : 'bg-wine text-white'
                }`}>
                  {shipment.status?.replace(/_/g, ' ')}
                </div>

                {officialTrackingUrl && (
                  <a
                    href={officialTrackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-wine hover:underline"
                  >
                    Official {isSTCourier ? 'ST Courier' : isIndiaPost ? 'India Post' : 'Courier'} Portal <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>

            {/* Visual Step Progress Bar */}
            <div className="py-2">
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Confirmed", icon: ShieldCheck, done: true },
                  { label: "Packed", icon: Package, done: ['PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(shipment.status) || shipment.shippedAt },
                  { label: "In Transit", icon: Truck, done: ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(shipment.status) },
                  { label: "Delivered", icon: CheckCircle2, done: shipment.status === 'DELIVERED' },
                ].map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="flex flex-col items-center space-y-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        step.done 
                          ? 'bg-wine text-white shadow-md shadow-wine/20' 
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${
                        step.done ? 'text-charcoal' : 'text-charcoal/30'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestones Timeline */}
            <div className="space-y-6 relative pt-4 border-t border-gray-100">
              <h3 className="text-xs uppercase font-bold tracking-widest text-charcoal/40">Transit Milestones</h3>
              <div className="space-y-8 relative">
                <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gray-100" />

                {(shipment.history && shipment.history.length > 0 ? shipment.history : [
                  { status: 'CONFIRMED', message: 'Your luxury order has been verified and confirmed at our studio.', timestamp: shipment.order?.createdAt || new Date(), location: 'Raaghas Studio' },
                  { status: 'PACKED', message: 'Carefully packaged in our signature luxury presentation box.', timestamp: shipment.shippedAt || new Date(), location: 'Fulfillment Center' },
                  { status: 'SHIPPED', message: `Handed over to ${isSTCourier ? 'ST Courier Express' : isIndiaPost ? 'India Post (Speed Post)' : courierName} for transit.`, timestamp: shipment.shippedAt || new Date(), location: 'Origin Sorting Facility' },
                ]).map((event: any, i: number) => {
                  const isLatest = i === 0 || i === (shipment.history?.length || 1) - 1;
                  return (
                    <div key={i} className="relative pl-14 group">
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
            </div>

            {/* Delivery Meta Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-gray-100">
              <div className="space-y-2 p-5 bg-gray-50/70 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-charcoal/40">
                  <Truck size={13} /> Carrier Partner
                </div>
                <div>
                  <p className="text-sm font-bold text-charcoal">
                    {isSTCourier ? 'ST Courier Express' : isIndiaPost ? 'India Post (Speed Post)' : courierName}
                  </p>
                  <p className="text-xs text-charcoal/60 mt-0.5 font-mono">AWB: {shipment.trackingId}</p>
                </div>
              </div>

              <div className="space-y-2 p-5 bg-gray-50/70 rounded-2xl border border-gray-100">
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
        )}

        {/* Raaghas Concierge Support Card */}
        <div className="bg-charcoal text-ivory rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-amber-300 text-xs font-bold uppercase tracking-widest">
              <Sparkles size={14} /> Raaghas Client Concierge
            </div>
            <h3 className="text-lg font-serif">Have questions regarding your shipment?</h3>
            <p className="text-xs text-ivory/60">Our support concierge is available 7 days a week on WhatsApp.</p>
          </div>
          
          <a 
            href={`https://wa.me/${cleanSupportPhone || '919944747040'}?text=${encodeURIComponent(`Hi Raaghas Concierge, I have a question regarding my order shipment ${shipment?.trackingId ? `(AWB: ${shipment.trackingId})` : ''}.`)}`}
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

export default function TrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-wine" size={40} />
        <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-gray-400">Loading tracking portal...</p>
      </div>
    }>
      <TrackingContent />
    </Suspense>
  );
}
