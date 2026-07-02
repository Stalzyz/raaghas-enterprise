import { API_BASE } from "@/lib/api";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Truck, Loader2 } from "lucide-react";
import { useAdminAuth } from "../providers/AuthProvider";

export function BulkFulfillModal({ isOpen, onClose, selectedOrderIds, onComplete }: any) {
  const { token } = useAdminAuth();
  const [carrier, setCarrier] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!carrier || !trackingId) return alert("Carrier and Tracking ID are required for bulk fulfillment");
    
    setIsSubmitting(true);
    try {
      const fulfillments = selectedOrderIds.map((id: string) => ({
        orderId: id,
        carrierName: carrier,
        trackingId: trackingId // Using same tracking ID for simplicity in basic bulk, or can be improved later
      }));

      const apiBase = `${API_BASE}/api/v1`;
      const res = await fetch(`${apiBase}/orders/admin/bulk-fulfillments`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ fulfillments })
      });
      
      if (res.ok) {
        alert("Bulk fulfillment successful");
        onComplete();
        onClose();
      } else {
        alert("Failed to perform bulk fulfillment");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred during bulk fulfillment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        >
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Truck size={20} className="text-wine" />
              Bulk Fulfill Orders
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4">
              You are about to fulfill <strong>{selectedOrderIds.length}</strong> orders.
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Carrier Name</label>
              <input 
                type="text" 
                required
                value={carrier}
                onChange={e => setCarrier(e.target.value)}
                placeholder="e.g. Delhivery, BlueDart"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Master Tracking ID</label>
              <input 
                type="text" 
                required
                value={trackingId}
                onChange={e => setTrackingId(e.target.value)}
                placeholder="Tracking number"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine"
              />
              <p className="text-[10px] text-gray-500 mt-2">Note: This assigns the same tracking number to all selected orders. For unique tracking IDs, process individually or via CSV.</p>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-charcoal text-white text-sm font-bold hover:bg-wine transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Truck size={16} />}
                Confirm Fulfillment
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
