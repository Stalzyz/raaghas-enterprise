"use client";

import { API_BASE } from "@/lib/api";

import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Package, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard, 
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  Hash,
  ArrowRight,
  ShieldCheck,
  Download,
  Printer,
  Loader2,
  X,
  Plus,
  Edit2,
  RefreshCw
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackingSlipModal } from "@/components/modals/PackingSlipModal";
import { ReturnExchangeModal } from "@/components/modals/ReturnExchangeModal";

const CARRIERS = ["Delhivery", "BlueDart", "Pickrr", "Professional Couriers", "Express", "DHL", "FedEx"];

function getSmartStatus(order: any) {
  if (order.status === 'PAYMENT_PENDING') {
    const ageInMinutes = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60);
    return ageInMinutes > 30 ? 'ABANDONED' : 'PAYMENT_PENDING';
  }
  if (order.status === 'CANCELLED' && order.paymentId) {
    return 'FAILED';
  }
  return order.status;
}

function getDisplayStatus(status: string) {
  if (status === 'PAYMENT_PENDING') return 'Awaiting Payment';
  if (status === 'FAILED') return 'Payment Failed';
  if (status === 'ABANDONED') return 'Abandoned';
  return status;
}

export function OrderDetailView({ id, onClose }: { id: string, onClose?: () => void }) {
  const { token } = useAdminAuth();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Navigation State
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Print Modals State
  const [isPackingSlipModalOpen, setIsPackingSlipModalOpen] = useState(false);

  const handlePrintSlip = () => {
    if (!order) return;
    setIsPackingSlipModalOpen(true);
  };

  // Return Exchange Modal State
  const [isReturnExchangeModalOpen, setIsReturnExchangeModalOpen] = useState(false);
  const [selectedReturnExchangeItem, setSelectedReturnExchangeItem] = useState<any>(null);

  // Fulfillment Form State
  const [carrier, setCarrier] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [selectedItemsForFulfillment, setSelectedItemsForFulfillment] = useState<string[]>([]);
  const [noteText, setNoteText] = useState("");

  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<{variantId: string, quantity: number}[]>([]);
  const [returnReason, setReturnReason] = useState("Customer requested");
  const [returnNotes, setReturnNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [restockInventory, setRestockInventory] = useState(true);

  // Address Edit Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressType, setAddressType] = useState<"shipping" | "billing">("shipping");
  const [addressForm, setAddressForm] = useState({
    name: "", address1: "", address2: "", city: "", province: "", zip: "", country: "India", phone: ""
  });

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundFormAmount, setRefundFormAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState("Customer requested refund");
  const [refundGateway, setRefundGateway] = useState("manual");
  const [refundTxnId, setRefundTxnId] = useState("");
  const [refundNotes, setRefundNotes] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchOrder();
    const baseUrl = `${API_BASE}/api/v1`;
    fetch(`${baseUrl}/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStoreSettings(data); })
      .catch(() => {});

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem("admin_order_sequence");
        if (saved) {
          const ids = JSON.parse(saved);
          setOrderIds(ids);
          setCurrentIndex(ids.indexOf(id));
        }
      } catch (e) {}
    }
  }, [id, token]);

  const fetchOrder = async () => {
    if (!token) return;
    try {
      
      const res = await fetch(`${`${API_BASE}/api/v1`}/orders/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch order');
      }
      const data = await res.json();
      setOrder(data);
      setCarrier(data.carrierName || "");
      setTrackingId(data.trackingId || "");
    } catch (error) {
       console.error(error);
       setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    setIsUpdating(true);
    try {
      
      await fetch(`${`${API_BASE}/api/v1`}/orders/admin/${id}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      await fetchOrder();
    } catch (error) {
      alert("Something went wrong while updating the status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const verifyPayment = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${`${API_BASE}/api/v1`}/payments/admin/verify/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Payment verified successfully.");
        await fetchOrder();
      } else {
        const err = await res.json();
        alert(`Failed to verify payment: ${err.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert("Something went wrong while verifying payment.");
    } finally {
      setIsUpdating(false);
    }
  };

  const updateFinancialStatus = async (status: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${`${API_BASE}/api/v1`}/orders/admin/${id}/financial-status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update financial status');
      }
      await fetchOrder();
    } catch (error) {
      alert("Something went wrong while updating financial status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const createFulfillment = async () => {
    if (!carrier || !trackingId) return alert("Please enter the carrier and tracking number to continue.");
    if (selectedItemsForFulfillment.length === 0) return alert("Please select at least one item to fulfill.");
    
    setIsUpdating(true);
    try {
      
      const itemsToFulfill = order.items
        .filter((item: any) => selectedItemsForFulfillment.includes(item.id))
        .map((item: any) => ({ variantId: item.variantId, quantity: item.quantity }));

      const res = await fetch(`${`${API_BASE}/api/v1`}/orders/admin/${id}/fulfillments`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ carrierName: carrier, trackingId, items: itemsToFulfill })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create fulfillment');
      }
      await fetchOrder();
      setSelectedItemsForFulfillment([]);
      setCarrier("");
      setTrackingId("");
    } catch (error: any) {
      alert(error.message || "Unable to update shipping details. Please check your connection.");
    } finally {
      setIsUpdating(false);
    }
  };

  const automateShipment = async (provider: string = 'shiprocket') => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${`${API_BASE}/api/v1`}/logistics/automate/${id}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ provider })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to automate shipment with ${provider}`);
      }
      await fetchOrder();
      alert(`Successfully dispatched to ${provider}!`);
    } catch (error: any) {
      alert(error.message || "Unable to automate shipment. Please check your credentials.");
    } finally {
      setIsUpdating(false);
    }
  };

  const syncTracking = async (trackingId: string, provider: string = 'shiprocket') => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${`${API_BASE}/api/v1`}/logistics/sync-tracking/${trackingId}?provider=${provider}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to sync tracking status');
      }
      await fetchOrder();
    } catch (error: any) {
      alert(error.message || "Failed to sync tracking status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const addInternalNote = async () => {
    if (!noteText.trim()) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${`${API_BASE}/api/v1`}/orders/admin/${id}/notes`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ message: noteText })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to add note');
      }
      setNoteText("");
      await fetchOrder();
    } catch (error: any) {
      alert(error.message || "Failed to add note.");
    } finally {
      setIsUpdating(false);
    }
  };

  const createReturn = async () => {
    if (returnItems.length === 0) return alert("Please select items to return.");
    
    const totalRefunded = order?.returns ? order.returns.reduce((sum: number, r: any) => sum + (Number(r.refundAmount) || 0), 0) : 0;
    const remainingRefundable = Number(order?.totalAmount || 0) - totalRefunded;

    if (refundAmount > remainingRefundable) {
      return alert(`Cannot refund more than the remaining refundable amount: ₹${remainingRefundable}`);
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`${`${API_BASE}/api/v1`}/orders/admin/${id}/returns`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          reason: returnReason, 
          notes: returnNotes, 
          refundAmount, 
          items: returnItems, 
          restock: restockInventory 
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to process return');
      }
      setIsReturnModalOpen(false);
      setReturnItems([]);
      setRefundAmount(0);
      await fetchOrder();
    } catch (error: any) {
      alert(error.message || "Failed to process return.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openAddressModal = (type: "shipping" | "billing") => {
    const addr = type === "shipping"
      ? (order?.shippingAddr || order?.shippingAddress || {})
      : (order?.billingAddress || order?.shippingAddr || order?.shippingAddress || {});
    setAddressType(type);
    setAddressForm({
      name:     addr.name     || order?.customerName || "",
      address1: addr.address1 || addr.line1 || addr.address || "",
      address2: addr.address2 || "",
      city:     addr.city     || "",
      province: addr.province || addr.state || "",
      zip:      addr.zip      || addr.postalCode || "",
      country:  addr.country  || "India",
      phone:    addr.phone    || order?.customerPhone || "",
    });
    setIsAddressModalOpen(true);
  };

  const saveAddress = async () => {
    setIsUpdating(true);
    try {
      const payload = addressType === "shipping"
        ? { shippingAddress: addressForm }
        : { billingAddress: addressForm };
      await fetch(`${`${API_BASE}/api/v1`}/orders/admin/${id}/address`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      setIsAddressModalOpen(false);
      await fetchOrder();
    } catch {
      alert("Failed to update address.");
    } finally {
      setIsUpdating(false);
    }
  };

  const submitRefund = async () => {
    if (!refundFormAmount || refundFormAmount <= 0) return alert("Please enter a valid refund amount.");
    
    const totalRefunded = order?.returns ? order.returns.reduce((sum: number, r: any) => sum + (Number(r.refundAmount) || 0), 0) : 0;
    const remainingRefundable = Number(order?.totalAmount || 0) - totalRefunded;

    if (refundFormAmount > remainingRefundable) {
      return alert(`Cannot refund more than the remaining refundable amount: ₹${remainingRefundable}`);
    }

    setIsUpdating(true);
    try {
      await fetch(`${`${API_BASE}/api/v1`}/orders/admin/${id}/refunds`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: refundFormAmount,
          reason: refundReason,
          gateway: refundGateway,
          transactionId: refundTxnId,
          notes: refundNotes,
        })
      });
      setIsRefundModalOpen(false);
      setRefundFormAmount(0);
      setRefundTxnId("");
      setRefundNotes("");
      await fetchOrder();
    } catch {
      alert("Failed to process refund.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-wine" size={32} /></div>;
  if (!order) return <div className="p-20 text-center font-bold text-gray-500 uppercase tracking-widest">Order not found</div>;

  // Support both new relational address and legacy JSON address
  const getParsedAddress = (addr: any) => typeof addr === 'string' ? JSON.parse(addr || '{}') : (addr || {});
  const shippingAddr = order.shippingAddr || getParsedAddress(order.shippingAddress);
  const billingAddr = order.billingAddress || shippingAddr;
  const taxLines = order.taxLines || [];
  const payments = order.payments || [];
  const metadata = order.metadata || {};

  const fulfilledVariantIds = (order.fulfillments || []).flatMap((f: any) => f.items.map((i: any) => i.variantId));
  const unfulfilledItems = order.items.filter((item: any) => !fulfilledVariantIds.includes(item.variantId));

  return (
    <>
    <div className="max-w-[1200px] mx-auto space-y-10 py-10">
      
      {/* ─── NAVIGATION ─── */}
      <div className="flex justify-between items-center">
          {onClose ? (
            <button onClick={onClose} className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-500 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <Link href="/orders" className="flex items-center gap-2 text-gray-400 hover:text-charcoal transition-colors group">
                <div className="bg-white p-2 rounded-lg border border-gray-100 group-hover:border-wine/20 group-hover:shadow-sm"><ArrowLeft size={16} /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Back to Hub</span>
            </Link>
          )}
          {orderIds.length > 0 && (
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 p-1">
              <button 
                disabled={currentIndex <= 0}
                onClick={() => router.push(`/orders/${orderIds[currentIndex - 1]}`)}
                className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-charcoal hover:bg-gray-50 rounded-md transition-colors disabled:opacity-30 flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Prev
              </button>
              <div className="w-px h-4 bg-gray-100"></div>
              <button 
                disabled={currentIndex === -1 || currentIndex >= orderIds.length - 1}
                onClick={() => router.push(`/orders/${orderIds[currentIndex + 1]}`)}
                className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-charcoal hover:bg-gray-50 rounded-md transition-colors disabled:opacity-30 flex items-center gap-1"
              >
                Next <ArrowRight size={12} />
              </button>
            </div>
          )}
         <div className="flex gap-2">
            <button
              onClick={handlePrintSlip}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm"
            >
               <Package size={16} /> Print Packing Slip
            </button>
            <a 
              href={`/orders/${id}/invoice`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-charcoal text-white rounded-lg text-sm font-semibold hover:bg-wine transition-all shadow-sm"
            >
               <Printer size={16} /> Tax Invoice
            </a>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
         
         {/* ─── ORDER DETAILS (Left) ─── */}
         <div className="space-y-10">
            
            {/* Order Header */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
               <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                  <div className="space-y-1">
                     <span className="text-[10px] font-bold text-wine tracking-[0.2em] uppercase">Order Instance</span>
                     <h1 className="text-4xl font-bold tracking-tight text-charcoal">#{order.formattedOrderNumber || order.orderNumber || order.id.slice(-10).toUpperCase()}</h1>
                     <p className="text-xs text-gray-400 font-medium flex items-center gap-2"><Calendar size={12} /> Placed on {new Date(order.createdAt).toLocaleString()}</p>
                     <div className="flex flex-wrap gap-2">
                       {(() => {
                         const smartStatus = getSmartStatus(order);
                         return (
                           <div className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-l-4 ${
                             smartStatus === 'DELIVERED' ? 'bg-green-50 text-green-600 border-green-100 border-l-green-600' :
                             smartStatus === 'SHIPPED' ? 'bg-purple-50 text-purple-600 border-purple-100 border-l-purple-600' :
                             (smartStatus === 'CANCELLED' || smartStatus === 'FAILED') ? 'bg-red-50 text-red-600 border-red-100 border-l-red-600' :
                             smartStatus === 'ABANDONED' ? 'bg-gray-100 text-gray-500 border-gray-200 border-l-gray-500' :
                             smartStatus === 'RTO' ? 'bg-gray-50 text-gray-600 border-gray-100 border-l-gray-600' :
                             'bg-orange-50 text-orange-600 border-orange-100 border-l-orange-600'
                           }`}>
                              {getDisplayStatus(smartStatus)}
                           </div>
                         );
                       })()}
                       {order.financialStatus && (
                          <div className="flex items-center gap-2">
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-l-4 ${
                              order.financialStatus === 'paid' ? 'bg-green-50 text-green-600 border-green-100 border-l-green-600' :
                              order.financialStatus === 'refunded' ? 'bg-gray-50 text-gray-600 border-gray-100 border-l-gray-600' :
                              order.financialStatus === 'voided' ? 'bg-red-50 text-red-600 border-red-100 border-l-red-600' :
                              'bg-yellow-50 text-yellow-600 border-yellow-100 border-l-yellow-600'
                            }`}>
                              💳 {order.financialStatus}
                            </div>
                            {order.financialStatus === 'pending' && (
                              <button
                                onClick={() => updateFinancialStatus('paid')}
                                disabled={isUpdating}
                                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                              >
                                Mark as Paid
                              </button>
                            )}
                          </div>
                       )}
                       {order.fulfillmentStatus && (
                         <div className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-l-4 ${
                           order.fulfillmentStatus === 'fulfilled' ? 'bg-green-50 text-green-600 border-green-100 border-l-green-600' :
                           order.fulfillmentStatus === 'partially_fulfilled' ? 'bg-blue-50 text-blue-600 border-blue-100 border-l-blue-600' :
                           'bg-gray-50 text-gray-500 border-gray-100 border-l-gray-400'
                         }`}>
                           📦 {order.fulfillmentStatus}
                         </div>
                       )}
                     </div>
                  </div>
               </div>

                {/* Logistics Timeline */}
                <div className="space-y-6 pt-4">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-wine animate-pulse" />
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-charcoal">Activity Timeline</h3>
                   </div>
                   
                   <div className="space-y-8 relative">
                      {/* Vertical line */}
                      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-100" />
                      
                      {/* Activities map */}
                      {order.activities && order.activities.map((activity: any, i: number) => (
                         <div key={activity.id || i} className="relative pl-12">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border-4 border-white shadow-sm">
                               {activity.type === 'STATUS_CHANGE' ? <Clock size={14} /> : <Hash size={14} />}
                            </div>
                            <div className="space-y-1">
                               <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal">{activity.type}</p>
                               <p className="text-xs text-gray-400">{activity.message}</p>
                               <p className="text-[9px] text-gray-300 font-bold uppercase">{new Date(activity.createdAt).toLocaleString()}</p>
                            </div>
                         </div>
                      ))}

                      {/* Order Placed */}
                      <div className="relative pl-12">
                         <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center border-4 border-white shadow-sm">
                            <CheckCircle2 size={14} />
                         </div>
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal">Order Placed</p>
                            <p className="text-xs text-gray-400">Order successfully received and awaiting confirmation.</p>
                            <p className="text-[9px] text-gray-300 font-bold uppercase">{new Date(order.createdAt).toLocaleString()}</p>
                         </div>
                      </div>
                   </div>
                   
                   {/* Internal Note Input */}
                   <div className="pt-6 border-t border-gray-50 space-y-4">
                      <textarea
                        placeholder="Add an internal note visible only to staff..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-wine/20 transition-all font-medium"
                        rows={3}
                      ></textarea>
                      <div className="flex justify-end">
                        <button 
                          disabled={isUpdating || !noteText.trim()}
                          onClick={addInternalNote}
                          className="bg-charcoal text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-wine disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                          {isUpdating ? <Loader2 size={12} className="animate-spin" /> : null} Add Note
                        </button>
                      </div>
                   </div>
                </div>
            </div>

            {/* Line Items Grid */}
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
               <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Inventory Breakdown ({order.items.length})</h3>
                  <div className="flex items-center gap-3">
                    {order.discountCode && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[9px] font-bold border border-green-100 uppercase tracking-widest">
                         Code: {order.discountCode} (-₹{Number(order.discountAmount).toLocaleString()})
                      </div>
                    )}
                    <Link 
                      href={`/orders/${id}/edit`}
                      className="px-3 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-charcoal hover:text-white transition-all flex items-center gap-1"
                    >
                      <Plus size={10} /> Edit Items
                    </Link>
                  </div>
               </div>
               <div className="divide-y divide-gray-50">
                   {order.items.map((item: any, idx: number) => {
                     const productTitle = item.productName || item.variant?.product?.title || 'Product';
                     const productImage = item.variant?.product?.images?.[0]?.url
                       || item.imageUrl
                       || 'https://images.unsplash.com/photo-1610030469668-93530c176cce?w=200&fit=crop';
                     return (
                     <div key={idx} className="p-8 flex items-center gap-6 group">
                        <div className="w-20 h-28 bg-beige rounded-2xl overflow-hidden border border-gray-100 shrink-0">
                           <img 
                             src={productImage}
                             alt={productTitle}
                             className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                             onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1610030469668-93530c176cce?w=200&fit=crop'; }}
                           />
                        </div>
                        <div className="flex-1 space-y-1">
                           <h4 className="text-lg font-bold text-charcoal">{productTitle}</h4>
                           <div className="flex gap-4 text-xs text-gray-400 font-medium">
                              <span>SKU: {item.sku || item.variant?.sku || '—'}</span>
                              <span>•</span>
                              <span>Size: {item.variant?.option1Value || '—'}</span>
                              {item.fulfillmentStatus && <span>• {item.fulfillmentStatus}</span>}
                           </div>
                        </div>
                        <div className="text-right space-y-2">
                           <p className="text-xs font-bold text-charcoal uppercase tracking-widest">Qty: {item.quantity}</p>
                           <p className="text-sm font-bold text-wine">₹{Number(item.price).toLocaleString()}</p>
                           {item.discount > 0 && <p className="text-[10px] text-green-600 font-bold">-₹{Number(item.discount).toLocaleString()} off</p>}
                           
                           {item.status && item.status !== 'FULFILLED' ? (
                              <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase tracking-widest">
                                {item.status}
                              </span>
                            ) : order.status === 'CANCELLED' || order.status === 'FAILED' ? (
                              <span className="inline-block mt-2 px-2 py-1 bg-red-50 text-red-400 rounded text-[9px] font-bold uppercase tracking-widest">
                                Order {order.status.toLowerCase()}
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedReturnExchangeItem(item);
                                  setIsReturnExchangeModalOpen(true);
                                }}
                                className="mt-2 text-[10px] font-bold uppercase tracking-widest text-wine border border-wine/20 px-3 py-1 rounded-lg hover:bg-wine hover:text-white transition-colors block"
                              >
                                Manage Return / Exchange
                              </button>
                            )}
                        </div>
                     </div>
                   );
                   })}
                </div>
               <div className="bg-gray-50/50 p-8 flex justify-end">
                  <div className="w-72 space-y-3">
                     <div className="flex justify-between text-xs font-medium text-gray-500">
                        <span>Subtotal</span>
                        <span>₹{Number(order.subtotal ? order.subtotal : order.items.reduce((sum: number, item: any) => sum + (Number(item.price) * item.quantity), 0)).toLocaleString()}</span>
                     </div>
                     {(order.shipping > 0) && (
                       <div className="flex justify-between text-xs font-medium text-gray-500">
                          <span>Shipping</span>
                          <span>₹{Number(order.shipping).toLocaleString()}</span>
                       </div>
                     )}
                     {taxLines.length > 0 && taxLines.map((t: any, i: number) => (
                       <div key={i} className="flex justify-between text-xs font-medium text-gray-500">
                          <span>{t.taxName}</span>
                          <span>₹{Number(t.taxValue).toLocaleString()}</span>
                       </div>
                     ))}
                     {order.taxes > 0 && taxLines.length === 0 && (
                       <div className="flex justify-between text-xs font-medium text-gray-500">
                          <span>Taxes</span>
                          <span>₹{Number(order.taxes).toLocaleString()}</span>
                       </div>
                     )}
                     {order.discountAmount > 0 && (
                       <div className="flex justify-between text-xs font-medium text-green-600">
                          <span>Discount ({order.discountCode})</span>
                          <span>-₹{Number(order.discountAmount).toLocaleString()}</span>
                       </div>
                     )}
                     {order.walletCreditUsed > 0 && (
                       <div className="flex justify-between text-xs font-medium text-purple-600">
                          <span>Wallet Credits Used</span>
                          <span>-₹{Number(order.walletCreditUsed).toLocaleString()}</span>
                       </div>
                     )}
                     <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-charcoal uppercase tracking-widest">Total</span>
                        <span className="text-xl font-bold text-charcoal">₹{Number(order.totalAmount).toLocaleString()}</span>
                     </div>
                     {order.returns && order.returns.reduce((sum: number, r: any) => sum + (Number(r.refundAmount) || 0), 0) > 0 && (
                       <div className="flex justify-between text-xs font-bold text-orange-600 border-t border-gray-100 pt-2">
                          <span>TOTAL REFUNDED</span>
                          <span>-₹{Number(order.returns.reduce((sum: number, r: any) => sum + (Number(r.refundAmount) || 0), 0)).toLocaleString()}</span>
                       </div>
                     )}
                     <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Currency</span><span>{order.currency || 'INR'}</span>
                     </div>
                  </div>
               </div>
            </div>

         </div>

         {/* ─── COMMAND CENTER (Right) ─── */}
         <div className="space-y-10 lg:sticky lg:top-10 h-fit">
            
            {/* Fulfillment Command */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-wine animate-pulse" />
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-charcoal">Fulfillment Manager</h3>
                  </div>
               </div>

               {order.fulfillments && order.fulfillments.length > 0 && (
                 <div className="space-y-4 mb-6">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Existing Shipments</h4>
                    {order.fulfillments.map((f: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-widest">Shipment #{idx + 1}</span>
                          <div className="flex items-center gap-2">
                            {f.shipments[0]?.trackingId && (
                              <button 
                                onClick={() => syncTracking(f.shipments[0]?.trackingId)} 
                                disabled={isUpdating} 
                                title="Sync Tracking Status"
                                className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                              >
                                <RefreshCw size={12} className={isUpdating ? "animate-spin" : ""} />
                              </button>
                            )}
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase tracking-widest">{f.status}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">Tracking ID: <span className="font-mono text-charcoal">{f.shipments[0]?.trackingId || 'N/A'}</span></p>
                        <p className="text-xs text-gray-500">Items: {f.items.length}</p>
                      </div>
                    ))}
                 </div>
               )}
               
               {unfulfilledItems.length > 0 ? (
                 <div className="space-y-4 border-t border-gray-50 pt-6">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Create New Shipment</h4>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                       {unfulfilledItems.map((item: any) => (
                          <label key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:border-wine/20 transition-all">
                             <input 
                               type="checkbox" 
                               className="accent-wine"
                               checked={selectedItemsForFulfillment.includes(item.id)}
                               onChange={(e) => {
                                 if (e.target.checked) setSelectedItemsForFulfillment(prev => [...prev, item.id]);
                                 else setSelectedItemsForFulfillment(prev => prev.filter(id => id !== item.id));
                               }}
                             />
                             <div className="flex-1">
                                <p className="text-xs font-bold text-charcoal truncate">{item.productName || item.variant?.product?.title || 'Product'}</p>
                                <p className="text-[10px] text-gray-400 font-medium">Qty: {item.quantity}</p>
                             </div>
                          </label>
                       ))}
                    </div>

                    <div className="space-y-2 pt-2">
                       <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1"><Truck size={10} /> Logistics Carrier</label>
                       <select 
                         value={carrier}
                         onChange={(e) => setCarrier(e.target.value)}
                         className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-wine/20 transition-all font-bold"
                       >
                          <option value="">Select Carrier</option>
                          {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1"><Hash size={10} /> Tracking Identification</label>
                       <input 
                         type="text" 
                         placeholder="Enter tracking ID..."
                         value={trackingId}
                         onChange={(e) => setTrackingId(e.target.value)}
                         className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-wine/20 transition-all font-medium font-mono"
                       />
                    </div>
                    <button 
                      disabled={isUpdating || !carrier || !trackingId || selectedItemsForFulfillment.length === 0}
                      onClick={createFulfillment}
                      className="w-full bg-charcoal text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-wine transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                       {isUpdating ? <Loader2 size={14} className="animate-spin" /> : "Fulfill Selected Items"}
                    </button>

                    <div className="pt-4 flex items-center gap-2">
                      <div className="flex-1 border-t border-gray-100"></div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">OR</span>
                      <div className="flex-1 border-t border-gray-100"></div>
                    </div>

                    <button
                      disabled={isUpdating}
                      onClick={() => automateShipment()}
                      className="w-full bg-wine text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-wine/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                    >
                       {isUpdating ? <Loader2 size={14} className="animate-spin" /> : "Auto-Fulfill with Shiprocket"}
                    </button>
                 </div>
               ) : (
                 <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 text-center space-y-2">
                    <CheckCircle2 size={24} className="mx-auto" />
                    <p className="text-xs font-bold uppercase tracking-widest">All Items Fulfilled</p>
                 </div>
               )}

                <div className="pt-6 border-t border-gray-50">
                   {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && order.status !== 'RTO' && (
                     <button 
                       onClick={() => {
                         if (confirm("Are you sure you want to cancel this order?")) {
                           updateStatus('CANCELLED');
                         }
                       }}
                       className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
                     >
                        Cancel Order
                     </button>
                   )}
                </div>
            </div>
         </div>

         {/* ─── ORDER DETAILS (Right Side) ─── */}
         <div className="space-y-10">
            {/* Returns Manager */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-charcoal">Returns & Refunds</h3>
                  </div>
               </div>

               {order.returns && order.returns.length > 0 && (
                 <div className="space-y-4 mb-6">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Processed Returns</h4>
                    {order.returns.map((r: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-widest">Return #{idx + 1}</span>
                          <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-[9px] font-bold uppercase tracking-widest">{r.status}</span>
                        </div>
                        <p className="text-xs text-gray-500">Reason: <span className="font-medium text-charcoal">{r.reason}</span></p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Refund: ₹{r.refundAmount}</p>
                      </div>
                    ))}
                 </div>
               )}

               <div className="flex gap-3">
                 {!(order.status === 'CANCELLED' || order.status === 'FAILED') && (
                    <button 
                       onClick={() => setIsReturnModalOpen(true)}
                       className="flex-1 bg-white text-gray-700 border border-gray-200 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm"
                    >
                       Return Items
                    </button>
                 )}
                  {!(order.status === 'CANCELLED' || order.status === 'FAILED') && (
                     <button 
                        disabled={(order.financialStatus !== 'paid' && order.financialStatus !== 'partially_refunded')}
                        onClick={() => { setRefundFormAmount(Number(order.totalAmount)); setIsRefundModalOpen(true); }}
                        className="flex-1 bg-white text-gray-700 border border-gray-200 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={(order.financialStatus !== 'paid' && order.financialStatus !== 'partially_refunded') ? 'Order has not been paid' : ''}
                     >
                        <RefreshCw size={14} /> Refund
                     </button>
                  )}
               </div>
            </div>

            {/* Customer Dossier */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-8">
               <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Customer Profile</h3>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-beige rounded-2xl flex items-center justify-center text-wine text-xl font-bold font-serif">
                        {order.customerName.charAt(0)}
                     </div>
                     <div>
                        <h4 className="font-bold text-charcoal">{order.customerName}</h4>
                        <p className="text-xs text-gray-400 font-medium tracking-tight">VIP / Verified Buyer</p>
                     </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-gray-50">
                     <div className="flex items-center gap-3 text-gray-500 hover:text-wine transition-colors cursor-pointer">
                        <Phone size={14} />
                        <span className="text-xs font-medium font-sans">{order.customerPhone}</span>
                     </div>
                     <div className="flex items-center gap-3 text-gray-500 hover:text-wine transition-colors cursor-pointer">
                        <Mail size={14} />
                        <span className="text-xs font-medium font-sans truncate">{order.customerEmail}</span>
                     </div>
                     <div className="flex items-center gap-3 text-gray-500">
                        <CreditCard size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{order.paymentMethod} • Settled</span>
                     </div>
                  </div>
               </div>

               <div className="space-y-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2"><MapPin size={10} /> Shipping Address</h3>
                    <button onClick={() => openAddressModal("shipping")} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-wine transition-colors px-2 py-1 rounded-lg hover:bg-wine/5">
                      <Edit2 size={10} /> Edit
                    </button>
                  </div>
                  <div className="bg-gray-50/50 p-4 rounded-2xl space-y-1">
                     <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-gray-900">{shippingAddr.name || order.customerName}</div>
                        <div>{String(shippingAddr.address1 || shippingAddr.line1 || shippingAddr.address || '').replace(/<br\s*\/?>/gi, ', ')}</div>
                        {shippingAddr.address2 && <div>{String(shippingAddr.address2).replace(/<br\s*\/?>/gi, ', ')}</div>}
                        <div>{shippingAddr.city}, {shippingAddr.province || shippingAddr.state} {shippingAddr.zip || shippingAddr.postalCode || shippingAddr.pincode}</div>
                        <div>{shippingAddr.zip || shippingAddr.postalCode || shippingAddr.pincode} — <span className="font-bold">{shippingAddr.country || 'India'}</span></div>
                     </div>
                     </div>
                     {shippingAddr.phone && <p className="text-[10px] text-gray-400 font-bold">{shippingAddr.phone}</p>}
                  </div>
               </div>

               {billingAddr && billingAddr !== shippingAddr && (
                 <div className="space-y-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2"><CreditCard size={10} /> Billing Address</h3>
                      <button onClick={() => openAddressModal("billing")} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-wine transition-colors px-2 py-1 rounded-lg hover:bg-wine/5">
                        <Edit2 size={10} /> Edit
                      </button>
                    </div>
                    <div className="bg-gray-50/50 p-4 rounded-2xl space-y-1">
                       <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-gray-900">{billingAddr.name || order.customerName}</div>
                        <div>{String(billingAddr.address1 || '').replace(/<br\s*\/?>/gi, ', ')}</div>
                        {billingAddr.address2 && <div>{String(billingAddr.address2).replace(/<br\s*\/?>/gi, ', ')}</div>}
                        <div>{billingAddr.city}, {billingAddr.province || billingAddr.state} {billingAddr.zip || billingAddr.postalCode || billingAddr.pincode}</div>
                       </div>
                    </div>
                    </div>
                 </div>
               )}

               {payments.length > 0 && (
                 <div className="space-y-4 pt-4 border-t border-gray-50">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Payment History</h3>
                    {payments.map((p: any, i: number) => (
                      <div key={i} className="bg-gray-50/50 p-4 rounded-2xl space-y-1">
                         <div className="flex justify-between">
                           <span className="text-[10px] font-bold text-charcoal uppercase tracking-widest">{p.gateway || order.paymentMethod}</span>
                           <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                             p.status === 'successful' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                           }`}>{p.status}</span>
                         </div>
                         <p className="text-xs text-gray-400 font-sans">₹{Number(p.amount).toLocaleString()} • {new Date(p.createdAt).toLocaleDateString()}</p>
                         <p className="text-[9px] text-gray-300 font-mono">{p.paymentId}</p>
                      </div>
                    ))}
                 </div>
               )}

               {(metadata.notes || metadata.employee || metadata.location) && (
                 <div className="space-y-4 pt-4 border-t border-gray-50">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Order Notes</h3>
                    <div className="bg-gray-50/50 p-4 rounded-2xl space-y-2">
                      {metadata.notes && <p className="text-xs text-charcoal/70 font-sans leading-relaxed">{metadata.notes}</p>}
                      {metadata.employee && <p className="text-[10px] text-gray-400 font-bold">Staff: {metadata.employee}</p>}
                      {metadata.location && <p className="text-[10px] text-gray-400 font-bold">Location: {metadata.location}</p>}
                    </div>
                 </div>
               )}
            </div>

         </div>
      </div>
    </div>

      {/* Return Modal Overlay */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/20 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-8 space-y-6 shadow-xl border border-gray-100">
             <div className="flex justify-between items-center">
               <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal">Process Return</h3>
               <button onClick={() => setIsReturnModalOpen(false)} className="text-gray-400 hover:text-charcoal"><X size={20} /></button>
             </div>
             
             <div className="space-y-4">
                <div>
                   <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Select Items to Return</label>
                   <div className="space-y-2 max-h-[150px] overflow-y-auto">
                     {order.items.map((item: any) => {
                       const existingQty = returnItems.find(ri => ri.variantId === item.variantId)?.quantity || 0;
                       return (
                         <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                           <input 
                             type="checkbox" 
                             className="accent-wine"
                             checked={existingQty > 0}
                             onChange={(e) => {
                               if (e.target.checked) setReturnItems(prev => [...prev, { variantId: item.variantId, quantity: item.quantity }]);
                               else setReturnItems(prev => prev.filter(ri => ri.variantId !== item.variantId));
                             }}
                           />
                           <div className="flex-1">
                              <p className="text-xs font-bold text-charcoal truncate">{item.productName || item.variant?.product?.title || 'Product'}</p>
                           </div>
                           {existingQty > 0 && (
                             <input 
                               type="number" 
                               min="1" 
                               max={item.quantity}
                               value={existingQty}
                               onChange={(e) => {
                                 const q = parseInt(e.target.value) || 1;
                                 setReturnItems(prev => prev.map(ri => ri.variantId === item.variantId ? { ...ri, quantity: q } : ri));
                               }}
                               className="w-16 bg-white border border-gray-200 rounded text-center text-xs py-1 outline-none"
                             />
                           )}
                         </div>
                       )
                     })}
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">Return Reason</label>
                   <select 
                     value={returnReason}
                     onChange={e => setReturnReason(e.target.value)}
                     className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none"
                   >
                     <option>Customer requested</option>
                     <option>Defective / Damaged</option>
                     <option>Wrong item sent</option>
                     <option>Size issue</option>
                   </select>
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between mb-1">
                     <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Refund Amount (₹)</label>
                     <span className="text-[9px] font-bold text-gray-500">
                       Max: ₹{
                         order ? (Number(order.totalAmount) - (order.returns ? order.returns.reduce((sum: number, r: any) => sum + (Number(r.refundAmount) || 0), 0) : 0)) : 0
                       }
                     </span>
                   </div>
                   <input 
                     type="number" 
                     value={refundAmount}
                     onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)}
                     className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none font-mono"
                   />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-2">
                   <input 
                     type="checkbox" 
                     checked={restockInventory}
                     onChange={e => setRestockInventory(e.target.checked)}
                     className="accent-wine"
                   />
                   <span className="text-xs font-bold text-charcoal">Restock items to inventory</span>
                </label>
             </div>

             <div className="flex gap-3 pt-4 border-t border-gray-50">
               <button 
                 onClick={() => setIsReturnModalOpen(false)}
                 className="flex-1 py-3 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100"
               >
                 Cancel
               </button>
               <button 
                 disabled={isUpdating || returnItems.length === 0}
                 onClick={createReturn}
                 className="flex-1 py-3 bg-wine text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#5a1528] disabled:opacity-50 flex justify-center items-center gap-2"
               >
                 {isUpdating ? <Loader2 size={12} className="animate-spin" /> : null} Submit Return
               </button>
             </div>
          </div>
        </div>
      )}

      {/* ─── Address Edit Modal ─── */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/20 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-8 space-y-6 shadow-xl border border-gray-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal">
                Edit {addressType === "shipping" ? "Shipping" : "Billing"} Address
              </h3>
              <button onClick={() => setIsAddressModalOpen(false)} className="text-gray-400 hover:text-charcoal"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([
                { key: "name",     label: "Full Name",    span: true  },
                { key: "address1", label: "Address Line 1", span: true },
                { key: "address2", label: "Address Line 2", span: true },
                { key: "city",     label: "City",          span: false },
                { key: "province", label: "State",         span: false },
                { key: "zip",      label: "PIN Code",      span: false },
                { key: "country",  label: "Country",       span: false },
                { key: "phone",    label: "Phone",         span: true  },
              ] as { key: keyof typeof addressForm; label: string; span: boolean }[]).map(field => (
                <div key={field.key} className={field.span ? "col-span-2" : ""}>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-1">{field.label}</label>
                  <input
                    type="text"
                    value={addressForm[field.key]}
                    onChange={e => setAddressForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-wine/30 transition-all font-medium"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-50">
              <button onClick={() => setIsAddressModalOpen(false)} className="flex-1 py-3 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100">Cancel</button>
              <button
                disabled={isUpdating}
                onClick={saveAddress}
                className="flex-1 py-3 bg-charcoal text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-wine disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isUpdating ? <Loader2 size={12} className="animate-spin" /> : null} Save Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Refund Modal ─── */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/20 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-md p-8 space-y-6 shadow-xl border border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal">Issue Refund</h3>
                <p className="text-[10px] text-gray-400 mt-1">Order total: ₹{Number(order.totalAmount).toLocaleString()}</p>
              </div>
              <button onClick={() => setIsRefundModalOpen(false)} className="text-gray-400 hover:text-charcoal"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Refund Amount (₹)</label>
                  <span className="text-[9px] font-bold text-gray-500">
                    Max: ₹{
                      order ? (Number(order.totalAmount) - (order.returns ? order.returns.reduce((sum: number, r: any) => sum + (Number(r.refundAmount) || 0), 0) : 0)) : 0
                    }
                  </span>
                </div>
                <input
                  type="number"
                  value={refundFormAmount}
                  onChange={e => setRefundFormAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-mono font-bold outline-none focus:border-wine/30 transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Reason</label>
                <select
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none"
                >
                  <option>Customer requested refund</option>
                  <option>Defective / Damaged product</option>
                  <option>Wrong item sent</option>
                  <option>Order cancelled</option>
                  <option>Duplicate payment</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Gateway</label>
                  <select
                    value={refundGateway}
                    onChange={e => setRefundGateway(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none"
                  >
                    <option value="manual">Manual / Bank Transfer</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="phonepe">PhonePe</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Txn / Ref ID</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={refundTxnId}
                    onChange={e => setRefundTxnId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-wine/30 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={refundNotes}
                  onChange={e => setRefundNotes(e.target.value)}
                  placeholder="Optional notes for your records..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-wine/30 transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-50">
              <button onClick={() => setIsRefundModalOpen(false)} className="flex-1 py-3 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100">Cancel</button>
              <button
                disabled={isUpdating || !refundFormAmount}
                onClick={submitRefund}
                className="flex-1 py-3 bg-wine text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#5a1528] disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}

      <PackingSlipModal 
        isOpen={isPackingSlipModalOpen}
        onClose={() => setIsPackingSlipModalOpen(false)}
        orders={[order]}
        storeSettings={storeSettings}
      />

      {isReturnExchangeModalOpen && selectedReturnExchangeItem && (
        <ReturnExchangeModal
          isOpen={isReturnExchangeModalOpen}
          onClose={() => {
            setIsReturnExchangeModalOpen(false);
            setSelectedReturnExchangeItem(null);
          }}
          item={selectedReturnExchangeItem}
          orderId={order.id}
          onSuccess={fetchOrder}
        />
      )}
    </>
  );
}
