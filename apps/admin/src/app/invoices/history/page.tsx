"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { FileText, Search, Plus, MoreHorizontal, Download, Loader2, ArrowUpRight, Send } from "lucide-react";
import Link from "next/link";
import { SendEmailModal } from "@/components/modals/SendEmailModal";

export default function InvoiceHistory() {
  const { token } = useAdminAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = invoices.filter(i => 
    i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || 
    (i.customerName || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenEmailModal = (inv: any) => {
    setSelectedInvoice(inv);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async (data: { subject: string; body: string; signature: string }) => {
    if (!selectedInvoice) return;
    
    const res = await fetch(`${API_BASE}/invoices/${selectedInvoice.id}/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      throw new Error("Failed to send email");
    }
  };

  const handleDownload = async (inv: any) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/${inv.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Failed to download PDF");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Invoice-${inv.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download the invoice PDF.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Invoice History</h2>
          <p className="text-gray-500 text-sm mt-1">Manage and track generated wholesale invoices and supplier receipts.</p>
        </div>
        <Link
          href="/invoices/builder"
          className="flex items-center gap-2 bg-wine text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-colors shadow-lg shadow-wine/20"
        >
          <Plus size={16} /> New Receipt
        </Link>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by invoice number or customer..."
            className="w-full pl-12 pr-4 py-3 bg-transparent text-sm focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
         <div className="flex justify-center p-20"><Loader2 className="animate-spin text-wine" size={32} /></div>
      ) : (
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                     <th className="py-4 px-6">Invoice No</th>
                     <th className="py-4 px-6">Date</th>
                     <th className="py-4 px-6">Billed To</th>
                     <th className="py-4 px-6">Amount</th>
                     <th className="py-4 px-6">Status</th>
                     <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {filtered.map(inv => (
                     <tr key={inv.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-4 px-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-red-50 text-wine flex items-center justify-center">
                                 <FileText size={14} />
                              </div>
                              <span className="font-bold text-sm text-charcoal">{inv.invoiceNumber}</span>
                           </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-500">{new Date(inv.date).toLocaleDateString()}</td>
                        <td className="py-4 px-6">
                           <p className="text-sm font-bold text-charcoal">{inv.customerName || 'N/A'}</p>
                           {inv.referenceType && <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">{inv.referenceType}</p>}
                        </td>
                        <td className="py-4 px-6 font-medium text-sm text-charcoal">₹{Number(inv.totalAmount).toLocaleString()}</td>
                        <td className="py-4 px-6">
                           <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded ${
                              inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                              inv.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                              'bg-orange-100 text-orange-700'
                           }`}>
                              {inv.status}
                           </span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                           <button 
                              onClick={() => handleOpenEmailModal(inv)}
                              className="p-2 text-wine hover:bg-red-50 rounded-lg transition" 
                              title="Send Email"
                           >
                              <Send size={16} />
                           </button>
                           <button 
                               onClick={() => handleDownload(inv)}
                               className="p-2 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition" 
                               title="Download PDF"
                           >
                              <Download size={16} />
                           </button>
                           <Link href={`/invoices/builder?id=${inv.id}`} className="inline-flex p-2 text-gray-400 hover:text-wine hover:bg-gray-50 rounded-lg transition">
                              <ArrowUpRight size={16} />
                           </Link>
                        </td>
                     </tr>
                  ))}
                  {filtered.length === 0 && (
                     <tr>
                        <td colSpan={6} className="py-16 text-center">
                           <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">No invoices generated yet</p>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      )}

      {selectedInvoice && (
        <SendEmailModal 
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          recipientEmail={selectedInvoice.customerEmail}
          recipientName={selectedInvoice.customerName}
          subject={`Invoice ${selectedInvoice.invoiceNumber} from Raaghas`}
          body={`Dear ${selectedInvoice.customerName},\n\nPlease find your tax invoice ${selectedInvoice.invoiceNumber} attached for your records.`}
          attachmentName={`Invoice-${selectedInvoice.invoiceNumber}.pdf`}
          onSend={handleSendEmail}
        />
      )}
    </div>
  );
}
