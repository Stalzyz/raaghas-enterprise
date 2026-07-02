"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { 
  Truck, Search, Filter, ChevronRight, ExternalLink, 
  MapPin, Clock, CheckCircle2, Loader2, MoreHorizontal,
  Navigation
} from "lucide-react";
import { motion } from "framer-motion";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function ShipmentTrackingPage() {
  const { token } = useAdminAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (token) fetchShipments();
  }, [token]);

  const fetchShipments = async () => {
    try {
      const baseUrl = `${API_BASE}/api/v1`;
      const res = await fetch(`${baseUrl}/logistics/shipments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setShipments(data);
      } else {
        setShipments([]);
      }
    } catch (err) {
      console.error("Failed to fetch shipments", err);
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SHIPPED': return 'text-blue-500 bg-blue-50';
      case 'IN_TRANSIT': return 'text-amber-500 bg-amber-50';
      case 'DELIVERED': return 'text-green-500 bg-green-50';
      case 'FAILED': return 'text-red-500 bg-red-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  if (loading) return (
    <div className="p-12 flex justify-center">
      <Loader2 className="animate-spin text-wine" size={32} />
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-charcoal">Shipment Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor all active and historical shipments across providers.</p>
        </div>
        <div className="flex gap-4">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                placeholder="Tracking ID or Order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-wine/20 w-80 shadow-sm"
              />
           </div>
           <button className="p-3 bg-white border border-gray-100 text-gray-400 rounded-xl hover:text-wine transition-all shadow-sm">
              <Filter size={20} />
           </button>
        </div>
      </div>

      <div className="grid gap-4">
        {(() => {
          const filteredShipments = shipments.filter(s => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (s.trackingId?.toLowerCase() || '').includes(query) || 
                   (s.fulfillment?.orderId?.toLowerCase() || '').includes(query) ||
                   (s.courier?.name?.toLowerCase() || '').includes(query);
          });
          
          if (filteredShipments.length === 0) {
            return (
              <div className="bg-white p-20 rounded-[3rem] border border-gray-100 text-center space-y-4">
                <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                   <Navigation size={40} />
                </div>
                <div>
                  <p className="text-lg font-bold text-charcoal">No shipments found</p>
                  <p className="text-sm text-gray-400">Try adjusting your search query.</p>
                </div>
              </div>
            );
          }
          
          return filteredShipments.map((shipment) => (
            <motion.div 
              key={shipment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-100 rounded-3xl p-6 flex items-center gap-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`p-4 rounded-2xl ${getStatusColor(shipment.status)}`}>
                <Truck size={24} />
              </div>

              <div className="flex-1 grid grid-cols-4 gap-8">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Tracking ID</p>
                  <div className="flex items-center gap-2 mt-1">
                    {shipment.trackingId ? (
                      <a href={`https://raaghas.in/track/${shipment.trackingId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-wine transition-colors group cursor-pointer">
                        <p className="text-sm font-bold text-charcoal group-hover:text-wine transition-colors">{shipment.trackingId}</p>
                        <ExternalLink size={12} className="text-gray-300 group-hover:text-wine transition-colors" />
                      </a>
                    ) : (
                      <p className="text-sm font-bold text-charcoal">PENDING</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Courier</p>
                  <p className="text-sm font-bold text-charcoal mt-1">{shipment.courier?.name || 'Manual'}</p>
                </div>

                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Order Reference</p>
                  <p className="text-sm font-bold text-charcoal mt-1">#{shipment.fulfillment?.orderId?.slice(-8).toUpperCase()}</p>
                </div>

                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(shipment.status).split(' ')[0].replace('text', 'bg')}`} />
                    <p className="text-xs font-bold uppercase tracking-wider text-charcoal">{shipment.status}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Last Update</p>
                  <p className="text-xs font-medium text-charcoal mt-1">2 hours ago</p>
                </div>
                <button className="p-2 text-gray-300 hover:text-wine transition-colors">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </motion.div>
          ));
        })()}
      </div>
    </div>
  );
}
