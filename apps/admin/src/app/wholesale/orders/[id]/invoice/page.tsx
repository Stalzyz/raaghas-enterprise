"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Download, Mail, Loader2, AlertCircle, Send } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { SendEmailModal } from "@/components/modals/SendEmailModal";

export default function InvoiceView() {
  const { id } = useParams();
  const { token } = useAdminAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/wholesale/orders/${id}/invoice`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch invoice details");
      const data = await res.json();
      setInvoice(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/wholesale/orders/${id}/invoice`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to publish invoice");
      const data = await res.json();
      setInvoice(data);
      alert("Invoice published and recorded in ledger successfully!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSendEmail = async (data: { subject: string; body: string; signature: string }) => {
    setIsEmailing(true);
    try {
      const res = await fetch(`${API_BASE}/wholesale/orders/${id}/send-invoice`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to send email");
      alert("Invoice sent successfully!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsEmailing(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(`${API_BASE}/wholesale/orders/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Raaghas_Proforma_${id.toString().toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-wine" size={40} />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <AlertCircle size={40} className="text-red-500" />
        <p className="text-gray-500 font-medium">{error || "Invoice not found"}</p>
        <Link href="/wholesale/orders" className="text-sm text-wine underline font-bold uppercase tracking-widest">Back to Orders</Link>
      </div>
    );
  }

  const { seller, buyer, items, summary, bankDetails, invoiceNumber, date } = invoice;

  return (
    <div className="space-y-6">
      
      {/* ── Action Bar (Hidden when printing via CSS) ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { 
            width: 100% !important; 
            max-width: 100% !important; 
            margin: 0 !important; 
            padding: 20px !important; 
            border: none !important; 
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          body { background: white; margin: 0; padding: 0; }
          @page { 
            margin: 0; 
            size: A4; 
          }
          .document-wrapper {
            box-shadow: none !important;
            border: none !important;
          }
          /* Ensure colors and backgrounds are printed */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="no-print flex items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/wholesale/orders" className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-400 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-charcoal">Order Quote</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Order #{id.toString().toUpperCase()}</p>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${invoice.isPublished ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {invoice.isPublished ? 'Verified' : 'Draft'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {!invoice.isPublished && (
            <button 
              onClick={handlePublish} 
              disabled={isPublishing}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isPublishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Finalize Order & Record
            </button>
          )}
          <button onClick={() => setShowEmailModal(true)} className="flex items-center gap-2 px-6 py-3 border border-wine/20 text-wine bg-wine/5 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-wine hover:text-white transition-all shadow-sm">
            <Mail size={14} /> Send to Buyer
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-charcoal text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all shadow-sm">
            <Download size={14} /> Download PDF
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-wine text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-charcoal transition-all shadow-md active:scale-95">
            <Printer size={14} /> Print Document
          </button>
        </div>
      </div>

      <SendEmailModal 
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        recipientEmail={buyer.email}
        recipientName={buyer.name}
        subject={`Pro-forma Invoice: ${invoiceNumber} from Raaghas`}
        body={`Dear ${buyer.contact || buyer.name},\n\nPlease find attached the Pro-forma Invoice for your recent wholesale order.\n\nTotal Amount Payable: ₹${summary.grandTotal.toLocaleString('en-IN')}\n\nPlease proceed with the payment to initiate processing.`}
        attachmentName={`${invoiceNumber}.pdf`}
        onSend={handleSendEmail}
      />

      {/* ── Document Container ── */}
      <div className="mx-auto bg-white p-12 rounded-3xl border border-gray-100 shadow-xl max-w-[850px] print-full text-charcoal font-sans print:shadow-none print:border-0 print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-10 border-b border-gray-100">
          <div>
            <img src="/logo-dark.svg" alt={seller.name || "Raaghas Logo"} className="h-16 w-auto mb-4 object-contain" />
            <p className="text-[10px] text-gray-400 leading-relaxed max-w-[250px] font-medium uppercase tracking-widest">
              {seller.address}<br/>
              {seller.state}<br/>
              <span className="font-bold text-charcoal">GST Number: {seller.gst}</span><br/>
              {seller.email}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold font-sans uppercase tracking-[0.2em] text-gray-300 mb-2">Order Quote</h2>
            <table className="text-[10px] ml-auto font-bold uppercase tracking-widest text-gray-500">
              <tbody>
                <tr><td className="pr-4 py-1 text-left">Invoice No.</td><td className="text-charcoal">{invoiceNumber}</td></tr>
                <tr><td className="pr-4 py-1 text-left">Date</td><td className="text-charcoal">{new Date(date).toLocaleDateString()}</td></tr>
                <tr><td className="pr-4 py-1 text-left">Place of Supply</td><td className="text-charcoal">{seller.state}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill To */}
        <div className="py-10 grid grid-cols-2 gap-10">
          <div>
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-3">Shipping To</p>
            <h3 className="text-base font-bold text-charcoal mb-1">{buyer.name}</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
              Attn: {buyer.contact}<br/>
              {buyer.address}<br/>
              <span className="font-bold text-charcoal">GST Number: {buyer.gst}</span><br/>
              {buyer.phone}
            </p>
          </div>
          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 hidden md:block">
             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Transport / Logitics</p>
             <p className="text-[10px] text-gray-500 leading-relaxed italic">Logistics details will be updated in the final Tax Invoice upon successful dispatch from our warehouse.</p>
          </div>
        </div>

        {/* Line Items */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden mt-4">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Description</th>
                <th className="py-4 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">Tax Code</th>
                <th className="py-4 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">Qty</th>
                <th className="py-4 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Rate</th>
                <th className="py-4 px-6 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Base Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {items.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-5 px-6">
                    <p className="font-bold text-charcoal">{item.description}</p>
                    <p className="text-[9px] text-wine font-bold mt-0.5">{item.taxPercent}% GST</p>
                  </td>
                  <td className="py-5 px-4 text-center font-mono text-gray-400">{item.hsn}</td>
                  <td className="py-5 px-4 text-center font-bold">{item.quantity}</td>
                  <td className="py-5 px-4 text-right font-mono text-gray-500">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                  <td className="py-5 px-6 text-right font-bold text-charcoal font-mono">₹{item.taxableValue.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculations & Summary */}
        <div className="flex flex-col md:flex-row justify-between items-start mt-10 gap-10">
           {/* Bank Details */}
           <div className="w-full md:w-80 p-6 bg-charcoal text-ivory rounded-2xl space-y-4 shadow-xl">
             <div className="flex items-center gap-2 border-b border-ivory/10 pb-2">
                <Mail size={14} className="text-wine" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Bank Settlement</span>
             </div>
             <div className="space-y-1 text-[11px] font-mono">
                <p><span className="text-gray-400">Bank:</span> {bankDetails.bankName}</p>
                <p><span className="text-gray-400">Name:</span> {bankDetails.accountName}</p>
                <p><span className="text-gray-400">A/C:</span> {bankDetails.accountNumber}</p>
                <p><span className="text-gray-400">IFSC:</span> {bankDetails.ifscCode}</p>
             </div>
           </div>

           {/* Totals */}
           <div className="w-full md:w-72 space-y-3">
             <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest">
               <span>Total MRP Value</span>
               <span className="line-through text-gray-300">₹{summary.totalMrp.toLocaleString('en-IN')}</span>
             </div>
             <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-3">
               <span>Taxable Subtotal</span>
               <span className="text-charcoal font-mono">₹{summary.subtotal.toLocaleString('en-IN')}</span>
             </div>

             {summary.taxes.map((tax: any, i: number) => (
                <div key={i} className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>{tax.name}</span>
                  <span className="text-charcoal font-mono">₹{tax.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}

             <div className="flex justify-between text-base font-bold text-wine pt-4 border-t border-gray-100">
               <span>Net Payable</span>
               <span className="font-serif tracking-widest">₹{summary.grandTotal.toLocaleString('en-IN')}</span>
             </div>
             
             <div className="bg-wine/5 p-4 rounded-xl border border-wine/10 mt-6">
                <p className="text-[9px] font-bold text-wine uppercase tracking-[0.2em] mb-1">Required Deposit</p>
                <p className="text-xs text-charcoal font-bold font-mono">₹{(summary.grandTotal / 2).toLocaleString('en-IN')}</p>
                <p className="text-[8px] text-wine/70 mt-1 uppercase font-medium">50% deposit to start production</p>
             </div>
           </div>
        </div>

        {/* Footer info */}
        <div className="mt-20 pt-10 border-t border-gray-100 text-[10px] text-gray-400 uppercase tracking-[0.2em] text-center leading-relaxed">
           <p className="mb-2">Thank you for choosing Raaghas</p>
           <p>This is a computer generated quote and does not require a physical signature.</p>
        </div>

      </div>
    </div>
  );
}
