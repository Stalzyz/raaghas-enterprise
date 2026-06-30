"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Download, FileText, Search, Filter, Loader2, IndianRupee } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function GSTReportsPage() {
  const { token } = useAdminAuth();
  const [taxData, setTaxData] = useState<any>({
    summary: {
      totalRevenue: 0,
      totalTaxableValue: 0,
      totalTaxCollected: 0,
      cgstSplit: 0,
      sgstSplit: 0
    },
    reports: []
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get current month's start and end dates as default
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (token) {
      loadTaxData();
    }
  }, [token, startDate, endDate]);

  async function loadTaxData() {
    try {
      setLoading(true);
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in')).replace(/\/api\/v1\/?$/, '') + '/api/v1';
      const params = new URLSearchParams();
      if (startDate) params.append('from', startDate);
      if (endDate) params.append('to', endDate);
      
      const res = await fetch(`${apiBase}/analytics/tax-reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setTaxData(data);
      } else {
        console.error("API returned status:", res.status);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const exportCSV = () => {
    if (!taxData.reports || taxData.reports.length === 0) return;
    
    const headers = ["Invoice Number", "Order Number", "Customer Name", "Customer Email", "Date", "Taxable Value (INR)", "CGST (INR)", "SGST (INR)", "Total GST (INR)", "Total Amount (INR)", "Payment Method"];
    const rows = taxData.reports.map((r: any) => [
      r.invoiceNumber || r.orderId.slice(-8).toUpperCase(),
      r.formattedOrderNumber || r.orderId.slice(-8).toUpperCase(),
      r.customerName,
      r.customerEmail,
      new Date(r.date).toLocaleDateString(),
      r.taxableValue.toFixed(2),
      r.cgst.toFixed(2),
      r.sgst.toFixed(2),
      r.totalTax.toFixed(2),
      r.totalAmount.toFixed(2),
      r.paymentMethod
    ]);

    const csvString = [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `GST_Tax_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredReports = taxData.reports?.filter((r: any) => 
    r.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.orderId?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-wine" size={32} />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-serif text-charcoal flex items-center gap-3">
            <ClipboardList className="text-wine" />
            GST Tax Audit & Reports
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-sans">Compliant intra-state tax transaction logs with CGST and SGST splits.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs shadow-sm">
            <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">From</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="outline-none text-charcoal font-medium bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs shadow-sm">
            <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">To</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="outline-none text-charcoal font-medium bg-transparent"
            />
          </div>
          <button 
            onClick={loadTaxData}
            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
          >
            Refresh
          </button>
          <button 
            onClick={exportCSV}
            disabled={filteredReports.length === 0}
            className="bg-wine text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
          >
            <Download size={14} /> Export GST Ledger
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Total Sales (Revenue)</p>
          <h3 className="text-2xl font-bold text-charcoal">₹{taxData.summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-[9px] text-gray-400 font-bold uppercase">All settled orders</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Total Taxable Value</p>
          <h3 className="text-2xl font-bold text-charcoal">₹{taxData.summary.totalTaxableValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-[9px] text-gray-400 font-bold uppercase">Base values before tax</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">CGST Collected (6%)</p>
          <h3 className="text-2xl font-bold text-wine">₹{taxData.summary.cgstSplit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-[9px] text-wine font-bold uppercase">Central tax share</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">SGST Collected (6%)</p>
          <h3 className="text-2xl font-bold text-wine">₹{taxData.summary.sgstSplit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-[9px] text-wine font-bold uppercase">State tax share</p>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/20">
          <h3 className="font-bold text-charcoal text-sm uppercase tracking-widest">GST Transactions Ledger ({filteredReports.length})</h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by Order ID or Name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-wine/20 transition-all font-medium outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase font-bold tracking-widest text-gray-400 border-b border-gray-50">
                <th className="px-8 py-5">Invoice No.</th>
                <th className="px-8 py-5">Order No.</th>
                <th className="px-8 py-5">Customer</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5 text-right">Taxable Value</th>
                <th className="px-8 py-5 text-right">CGST (6%)</th>
                <th className="px-8 py-5 text-right">SGST (6%)</th>
                <th className="px-8 py-5 text-right">Total GST</th>
                <th className="px-8 py-5 text-right">Total Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-300 gap-3">
                      <FileText size={40} />
                      <p className="text-xs font-bold uppercase tracking-wider">No taxable sales found in this period</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((r: any) => (
                  <tr key={r.orderId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5 font-mono text-xs font-bold text-wine">
                      {r.invoiceNumber || r.orderId.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-8 py-5 font-mono text-xs font-bold text-charcoal">
                      #{r.formattedOrderNumber || r.orderId.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-charcoal">{r.customerName}</p>
                      <p className="text-[10px] text-gray-400 font-sans mt-0.5">{r.customerEmail}</p>
                    </td>
                    <td className="px-8 py-5 text-xs text-gray-500 font-sans">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 text-xs font-medium text-charcoal text-right">
                      ₹{r.taxableValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-5 text-xs font-medium text-gray-500 text-right">
                      ₹{r.cgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-5 text-xs font-medium text-gray-500 text-right">
                      ₹{r.sgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-wine text-right">
                      ₹{r.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-charcoal text-right">
                      ₹{r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
