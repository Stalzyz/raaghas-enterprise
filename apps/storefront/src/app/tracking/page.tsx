"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { 
  Truck, Package, CheckCircle2, Clock, MapPin, 
  Loader2, Search, AlertCircle, ShieldCheck, 
  ExternalLink, Copy, Check, User
} from "lucide-react";

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

  const courierName = shipment?.courier || shipment?.order?.carrierName || "Standard Logistics";
  const cLower = courierName.toLowerCase();
  const isSTCourier = cLower.includes("st courier") || cLower.includes("st_courier");
  const isIndiaPost = cLower.includes("india post") || cLower.includes("speed post");
  const isProfessional = cLower.includes("professional") || cLower.includes("tpc");
  
  const officialTrackingUrl = shipment?.trackingUrl || (isSTCourier 
    ? `https://stcourier.com/track/shipment?awb=${encodeURIComponent(shipment?.trackingId || "")}`
    : isIndiaPost 
    ? `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`
    : isProfessional
    ? `https://www.tpcindia.com/tracking.aspx?strAwb=${encodeURIComponent(shipment?.trackingId || "")}`
    : null);

  const cleanSupportPhone = supportPhone.replace(/[^0-9]/g, "");

  // Status mapping logic to determine completed steps correctly
  const rawStatus = (shipment?.status || "CONFIRMED").toUpperCase();
  let currentStepIndex = 0; // 0: CONFIRMED, 1: PACKED, 2: IN_TRANSIT, 3: DELIVERED
  if (['PACKED'].includes(rawStatus)) currentStepIndex = 1;
  if (['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(rawStatus)) currentStepIndex = 2;
  if (['DELIVERED'].includes(rawStatus)) currentStepIndex = 3;

  const steps = [
    { label: "Confirmed", icon: ShieldCheck },
    { label: "Packed", icon: Package },
    { label: "In Transit", icon: Truck },
    { label: "Delivered", icon: CheckCircle2 },
  ];

  // Helper to format exact event timestamps cleanly
  const formatTimestamp = (ts: any) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-charcoal pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-wine/10 border border-wine/20 text-wine text-[10px] font-bold uppercase tracking-[0.2em]">
            <Truck size={14} /> Raaghas Logistics Tracking
          </div>
          <h1 className="text-3xl md:text-5xl font-serif text-charcoal">Track Your Order</h1>
          <p className="text-xs md:text-sm text-charcoal/60 max-w-md mx-auto leading-relaxed">
            Real-time status updates for shipments sent via <span className="font-bold text-charcoal">India Post</span>, <span className="font-bold text-charcoal">ST Courier</span> & <span className="font-bold text-charcoal">Professional Courier</span>.
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
            
            {/* Carrier List */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4 text-[10px] font-bold text-charcoal/60">
              <span className="uppercase tracking-widest text-charcoal/40">Carriers:</span>
              <span className="px-2.5 py-1 rounded-md bg-gray-100 text-charcoal">ST Courier</span>
              <span className="px-2.5 py-1 rounded-md bg-gray-100 text-charcoal">India Post</span>
              <span className="px-2.5 py-1 rounded-md bg-gray-100 text-charcoal">Professional Courier</span>
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
              Fetching transit details...
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
              Please enter your full order ID from your confirmation message.
            </p>
          </div>
        )}

        {shipment && !loading && (
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-charcoal/5 border border-gray-100 space-y-10">
            
            {/* Status Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-gray-100">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-md bg-gray-100 text-charcoal border border-gray-200">
                    {isSTCourier ? 'ST Courier Express' : isIndiaPost ? 'India Post (Speed Post)' : isProfessional ? 'The Professional Couriers' : courierName}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-serif text-charcoal">Shipment Status</h2>
                
                {/* AWB with Copy Button */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-charcoal/50 font-mono">AWB:</span>
                  <span className="text-xs font-bold font-mono text-charcoal bg-gray-50 px-2 py-1 rounded border border-gray-200">
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
                    Official Portal Tracking <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>

            {/* Visual Progress Steps - Fixed All Active Completed Steps */}
            <div className="py-4">
              <div className="grid grid-cols-4 gap-2 text-center relative">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  const isCompleted = idx <= currentStepIndex;

                  return (
                    <div key={idx} className="flex flex-col items-center space-y-2.5 z-10">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                        isCompleted 
                          ? 'bg-wine text-white shadow-md shadow-wine/20 ring-4 ring-wine/10' 
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${
                        isCompleted ? 'text-charcoal font-bold' : 'text-charcoal/30'
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
                <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gray-200" />

                {(shipment.history && shipment.history.length > 0 ? shipment.history : [
                  { status: 'CONFIRMED', message: 'Order verified and confirmed.', timestamp: shipment.order?.createdAt, location: 'Raaghas Fulfillment Center' },
                  { status: 'PACKED', message: 'Order packaged and ready for dispatch.', timestamp: shipment.shippedAt || shipment.order?.createdAt, location: 'Fulfillment Center' },
                  { status: 'SHIPPED', message: `Handed over to ${isSTCourier ? 'ST Courier Express' : isIndiaPost ? 'India Post (Speed Post)' : isProfessional ? 'The Professional Couriers' : courierName} for transit.`, timestamp: shipment.shippedAt || shipment.order?.createdAt, location: 'Sorting Facility' },
                ]).map((event: any, i: number) => {
                  const eventTime = formatTimestamp(event.timestamp);

                  return (
                    <div key={i} className="relative pl-14 group">
                      <div className="absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md z-10 transition-all bg-wine text-white">
                        {event.status === 'CONFIRMED' && <ShieldCheck size={14} />}
                        {event.status === 'PACKED' && <Package size={14} />}
                        {event.status === 'SHIPPED' && <Truck size={14} />}
                        {event.status === 'DELIVERED' && <CheckCircle2 size={14} />}
                        {!['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(event.status) && <Clock size={14} />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-wine">
                            {event.status?.replace(/_/g, ' ')}
                          </p>
                          <p className="text-[9px] text-charcoal/40 font-bold uppercase tracking-widest">{event.location || 'In Transit'}</p>
                        </div>
                        <p className="text-xs leading-relaxed text-charcoal font-medium">{event.message}</p>
                        {eventTime && (
                          <p className="text-[10px] text-charcoal/50 font-mono">
                            {eventTime}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* High Contrast Dark Theme Cards for Carrier Partner & Recipient */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-gray-100">
              <div className="bg-[#18181b] rounded-2xl p-6 border border-gray-800 shadow-xl space-y-3">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-amber-400">
                  <Truck size={14} /> Carrier Partner
                </div>
                <div>
                  <p className="text-base font-bold text-white">
                    {isSTCourier ? 'ST Courier Express' : isIndiaPost ? 'India Post (Speed Post)' : isProfessional ? 'The Professional Couriers' : courierName}
                  </p>
                  <p className="text-xs text-gray-300 font-mono mt-1">
                    AWB: <span className="bg-gray-900 border border-gray-700 px-2 py-0.5 rounded text-white font-bold">{shipment.trackingId}</span>
                  </p>
                </div>
              </div>

              <div className="bg-[#18181b] rounded-2xl p-6 border border-gray-800 shadow-xl space-y-3">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-amber-400">
                  <User size={14} /> Recipient
                </div>
                <div>
                  <p className="text-base font-bold text-white">{shipment.order?.customerName || 'Customer'}</p>
                  <p className="text-xs text-gray-300 mt-1">Secure Doorstep Delivery</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Support Section */}
        <div className="bg-charcoal text-ivory rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1.5 text-center md:text-left">
            <h3 className="text-lg font-serif">Need help with your order?</h3>
            <p className="text-xs text-ivory/60">Our customer support team is available on WhatsApp.</p>
          </div>
          
          <a 
            href={`https://wa.me/${cleanSupportPhone || '919944747040'}?text=${encodeURIComponent(`Hi Raaghas Support, I have a question regarding my shipment ${shipment?.trackingId ? `(AWB: ${shipment.trackingId})` : ''}.`)}`}
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
