"use client";

import { API_BASE } from "@/lib/api";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, Undo2, AlertCircle, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export function ReturnExchangeModal({ 
  isOpen, 
  onClose, 
  item, 
  orderId, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  item: any; 
  orderId: string;
  onSuccess: () => void;
}) {
  const { token } = useAdminAuth();
  const [type, setType] = useState<"RETURN" | "EXCHANGE">("RETURN");
  const [restocked, setRestocked] = useState(true);
  const [refundMethod, setRefundMethod] = useState<"WALLET" | "SOURCE">("WALLET");
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [newVariantId, setNewVariantId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setRefundAmount(Number(item.price));
      if (item.variant?.productId) {
        fetchVariants(item.variant.productId);
      }
    }
  }, [isOpen, item]);

  const fetchVariants = async (productId: string) => {
    if (!token) return;
    setIsLoadingVariants(true);
    try {
      const res = await fetch(`${`${API_BASE}/api/v1`}/products/admin/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVariants(data.variants || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingVariants(false);
    }
  };

  const handleSubmit = async () => {
    if (type === "EXCHANGE" && !newVariantId) {
      return alert("Please select a new variant for exchange.");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${`${API_BASE}/api/v1`}/orders/admin/${orderId}/exchange-or-return`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          orderItemId: item.id,
          type,
          restocked,
          refundMethod: type === "RETURN" ? refundMethod : undefined,
          refundAmount: type === "RETURN" ? refundAmount : undefined,
          newVariantId: type === "EXCHANGE" ? newVariantId : undefined,
          notes
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Operation failed");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message || "Failed to process return/exchange.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h2 className="text-lg font-bold text-charcoal flex items-center gap-2">
                <RefreshCw size={18} className="text-wine" />
                Manage Item: {item.productName || item.variant?.product?.title}
              </h2>
              <p className="text-xs text-gray-500 mt-1">Order #{orderId.slice(-8).toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-8 overflow-y-auto space-y-8">
            {/* Action Type Toggle */}
            <div className="flex gap-4">
              <button
                onClick={() => setType("RETURN")}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${type === "RETURN" ? "border-wine bg-wine/5 text-wine" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}
              >
                <Undo2 size={24} />
                <span className="text-xs font-bold uppercase tracking-widest">Process Return</span>
              </button>
              <button
                onClick={() => setType("EXCHANGE")}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${type === "EXCHANGE" ? "border-wine bg-wine/5 text-wine" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}
              >
                <RefreshCw size={24} />
                <span className="text-xs font-bold uppercase tracking-widest">Process Exchange</span>
              </button>
            </div>

            {/* Restock Toggle (Applies to both) */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-charcoal">Restock Original Item</h4>
                <p className="text-xs text-gray-500 mt-1">Add the {item.variant?.option1Value} size back to inventory.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={restocked} onChange={e => setRestocked(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-wine"></div>
              </label>
            </div>
            
            {/* Conditional Forms */}
            <div className="space-y-6">
              {type === "RETURN" ? (
                <>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Refund Destination</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm font-medium text-charcoal cursor-pointer">
                        <input type="radio" name="refundMethod" value="WALLET" checked={refundMethod === "WALLET"} onChange={() => setRefundMethod("WALLET")} className="accent-wine w-4 h-4" />
                        Customer Wallet
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium text-charcoal cursor-pointer">
                        <input type="radio" name="refundMethod" value="SOURCE" checked={refundMethod === "SOURCE"} onChange={() => setRefundMethod("SOURCE")} className="accent-wine w-4 h-4" />
                        Original Source (Gateway)
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Refund Amount (₹)</label>
                    <input 
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine/40 font-bold"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Select New Variant</label>
                  {isLoadingVariants ? (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 size={16} className="animate-spin" /> Fetching variants...
                    </div>
                  ) : (
                    <select
                      value={newVariantId}
                      onChange={(e) => setNewVariantId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine/40 font-bold"
                    >
                      <option value="">-- Choose Size/Variant --</option>
                      {variants.map(v => (
                        <option key={v.id} value={v.id} disabled={v.inventory <= 0}>
                          {v.option1Value || v.sku} {v.inventory <= 0 ? '(Out of Stock)' : `(Stock: ${v.inventory})`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Internal Notes</label>
                <textarea 
                  placeholder="Reason for return/exchange..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-wine/40"
                  rows={3}
                ></textarea>
              </div>
            </div>

            {type === "RETURN" && refundMethod === "SOURCE" && (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl flex gap-3 items-start border border-yellow-200">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p className="text-xs font-medium">Refund to Source requires manual initiation from the Razorpay dashboard. Marking this here will just record it in the ledger.</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors uppercase tracking-widest">
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-charcoal hover:bg-wine transition-all uppercase tracking-widest shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : "Confirm Action"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
