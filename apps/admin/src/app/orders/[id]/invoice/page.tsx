"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Download, Loader2, AlertCircle } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";

export default function OrderInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const { token } = useAdminAuth();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && id) {
      fetchOrder();
    }
  }, [id, token]);

  const fetchOrder = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005/api/v1' : 'https://api.raaghas.in/api/v1');
      const res = await fetch(`${apiBase}/orders/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch order details");
      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-wine" size={32} /></div>;
  if (error || !order) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <AlertCircle className="text-red-500" size={48} />
      <p className="text-gray-500 font-bold uppercase tracking-widest">{error || "Order not found"}</p>
      <Link href="/orders" className="text-wine text-xs font-bold uppercase underline">Back to Orders</Link>
    </div>
  );
  if (order.status === 'CANCELLED') return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <AlertCircle className="text-amber-500" size={48} />
      <p className="text-gray-700 font-bold uppercase tracking-widest">Invoice Not Available</p>
      <p className="text-gray-400 text-sm">Invoices are not generated for cancelled orders.</p>
      <Link href={`/orders/${id}`} className="text-wine text-xs font-bold uppercase underline">Back to Order</Link>
    </div>
  );

  const getParsedAddress = (addr: any) => {
    if (!addr) return {};
    if (typeof addr === 'string') {
      try { return JSON.parse(addr); } catch { return {}; }
    }
    return addr;
  };

  const shippingAddr = order.shippingAddr || getParsedAddress(order.shippingAddress);
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .print-container { 
            box-shadow: none !important; 
            border: none !important; 
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 40px !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* ── ACTION BAR ── */}
      <div className="no-print sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 mb-10">
        <div className="max-w-[800px] mx-auto flex justify-between items-center">
          <Link href={`/orders/${id}`} className="flex items-center gap-2 text-gray-400 hover:text-charcoal transition-colors">
            <ArrowLeft size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Back to Order</span>
          </Link>
          <div className="flex gap-3">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-3 bg-wine text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-charcoal transition-all shadow-md"
            >
              <Printer size={14} /> Print Invoice
            </button>
          </div>
        </div>
      </div>

      {/* ── INVOICE DOCUMENT ── */}
      <div className="print-container max-w-[800px] mx-auto bg-white p-16 rounded-[40px] border border-gray-100 shadow-2xl shadow-wine/5 font-sans text-charcoal">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-12">
          <div>
            <img src="/logo-dark.svg" alt="Raaghas Logo" className="h-16 w-auto mb-4 object-contain" />
            <p className="text-[10px] text-gray-400 leading-relaxed font-bold uppercase tracking-widest">
              Luxury Women's Ethnic Wear<br/>
              Raaghas Pvt Ltd<br/>
              Salem, India
            </p>
          </div>
          <div className="text-right space-y-4">
            <h2 className="text-2xl font-bold uppercase tracking-[0.3em] text-gray-200">Tax Invoice</h2>
            <div className="text-[10px] font-bold uppercase tracking-widest space-y-1">
              <p className="text-gray-400">Invoice No: <span className="text-charcoal">#{order.formattedOrderNumber || order.orderNumber || order.id.slice(-6).toUpperCase()}</span></p>
              <p className="text-gray-400">Date: <span className="text-charcoal">{date}</span></p>
              <p className="text-gray-400">Order ID: <span className="text-charcoal">#{order.formattedOrderNumber || order.orderNumber || order.id.slice(-10).toUpperCase()}</span></p>
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-2 gap-12 py-12 border-b border-gray-100">
          <div>
            <h3 className="text-[10px] font-bold text-wine uppercase tracking-[0.2em] mb-4">Billing To</h3>
            <div className="space-y-1">
              <p className="text-sm font-bold text-charcoal">{order.customerName}</p>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                {order.customerEmail}<br/>
                {order.customerPhone}
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-wine uppercase tracking-[0.2em] mb-4">Shipping To</h3>
            <div className="space-y-1">
              <p className="text-sm font-bold text-charcoal">{shippingAddr.name || order.customerName}</p>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                {shippingAddr.address1 || shippingAddr.line1 || shippingAddr.address || ''}<br/>
                {shippingAddr.city}, {shippingAddr.province || shippingAddr.state || ''}<br/>
                {shippingAddr.zip || shippingAddr.postalCode || shippingAddr.pincode || ''}, {shippingAddr.country || 'India'}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-12">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Product Description</th>
                <th className="pb-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-center">Qty</th>
                <th className="pb-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-right">Unit Price</th>
                <th className="pb-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.items.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="py-8">
                    <p className="font-bold text-charcoal">{item.productName || item.variant?.product?.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                      SKU: {item.sku || '—'} | Size: {item.variant?.option1Value || 'Standard'}
                    </p>
                  </td>
                  <td className="py-8 text-center font-bold text-charcoal">{item.quantity}</td>
                  <td className="py-8 text-right font-medium text-gray-500">₹{Number(item.price).toLocaleString('en-IN')}</td>
                  <td className="py-8 text-right font-bold text-charcoal">₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end pt-8 border-t border-gray-100">
          <div className="w-72 space-y-4">
            <div className="flex justify-between text-xs font-medium text-gray-400">
              <span>Subtotal</span>
              <span className="text-charcoal">₹{Number(order.totalAmount - (order.taxes || 0) + (order.discountAmount || 0)).toLocaleString('en-IN')}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-xs font-medium text-green-600">
                <span>Discount ({order.discountCode || 'OFFER'})</span>
                <span>-₹{Number(order.discountAmount).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-medium text-gray-400">
              <span>GST (Included)</span>
              <span className="text-charcoal">₹{Number(order.taxes || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-gray-400">
              <span>Shipping</span>
              <span className="text-charcoal">₹{Number(order.shipping || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="pt-4 border-t border-wine/10 flex justify-between items-baseline">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-wine">Total Payable</span>
              <span className="text-3xl font-bold text-charcoal">₹{Number(order.totalAmount).toLocaleString('en-IN')}</span>
            </div>
            <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest text-right">
              Paid via {order.paymentMethod || 'Razorpay'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-24 pt-12 border-t border-gray-100 text-center space-y-4">
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">Thank you for choosing Raaghas</p>
          <div className="flex justify-center gap-8 text-[9px] font-bold text-wine/40 uppercase tracking-widest">
            <span>Instagram: @raaghas.official</span>
            <span>Web: www.raaghas.in</span>
            <span>Support: love@raaghas.in</span>
          </div>
        </div>

      </div>
    </div>
  );
}
