"use client";

import { API_BASE } from "@/lib/api";

import React, { useState, useEffect } from 'react';
import { 
  Landmark, ArrowUpRight, ArrowDownRight, RefreshCcw, 
  Search, Filter, Download, Calendar, Eye, FileText, ChevronRight
} from 'lucide-react';
import { useAdminAuth } from '@/components/providers/AuthProvider';

export default function LedgerPage() {
  const { token, user } = useAdminAuth();
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalPurchases: 0,
    totalRefunds: 0,
    netRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const apiBase = API_BASE;

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const queryParams = new URLSearchParams(filters).toString();
      
      const [entriesRes, summaryRes] = await Promise.all([
        fetch(`${apiBase}/analytics/ledger?${queryParams}`, { headers }),
        fetch(`${apiBase}/analytics/ledger/summary?${queryParams}`, { headers })
      ]);

      if (entriesRes.ok && summaryRes.ok) {
        const entriesData = await entriesRes.json();
        const summaryData = await summaryRes.json();
        setEntries(Array.isArray(entriesData) ? entriesData : []);
        setSummary(summaryData || { totalSales: 0, totalPurchases: 0, totalRefunds: 0, netRevenue: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch ledger data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token, filters]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="text-wine w-6 h-6" />
            <h1 className="text-2xl font-serif font-bold text-charcoal">Transaction History</h1>
          </div>
          <p className="text-sm text-gray-500">
            {user?.role === 'ACCOUNTANT' 
              ? 'Viewing published financial records' 
              : 'Complete financial oversight and tax distribution'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCcw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-wine text-ivory rounded-xl font-bold text-sm shadow-lg shadow-wine/20 hover:scale-[1.02] transition-all">
            <Download size={18} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <SummaryCard 
          title="Total Sales" 
          value={summary.totalSales} 
          icon={<ArrowUpRight className="text-emerald-500" />} 
          color="emerald"
        />
        <SummaryCard 
          title="Total Purchases" 
          value={summary.totalPurchases} 
          icon={<ArrowDownRight className="text-blue-500" />} 
          color="blue"
        />
        <SummaryCard 
          title="Total Refunds" 
          value={summary.totalRefunds} 
          icon={<RefreshCcw className="text-rose-500" />} 
          color="rose"
        />
        <SummaryCard 
          title="Net Revenue" 
          value={summary.netRevenue} 
          icon={<Landmark className="text-wine" />} 
          color="wine"
          highlight
        />
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-wine/20"
              />
            </div>
            <span className="text-gray-300 font-bold">to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-wine/20"
              />
            </div>
            <select 
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="px-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-wine/20 min-w-[140px]"
            >
              <option value="">All Types</option>
              <option value="SALE">Sales</option>
              <option value="PURCHASE">Purchases</option>
              <option value="REFUND">Refunds</option>
            </select>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search reference or party..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-wine/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 text-left">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Entry Type</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Reference</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Party</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Base Amount</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">GST (Total)</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Grand Total</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-sm text-charcoal font-medium">
                      {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                      {new Date(entry.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      entry.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' :
                      entry.type === 'REFUND' ? 'bg-rose-50 text-rose-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400" />
                      <span className="text-sm font-mono text-charcoal font-bold tracking-tighter">
                        {entry.referenceId || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-charcoal font-medium">{entry.partyName || 'Global Customer'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatCurrency(Number(entry.taxableValue || entry.amount))}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm text-charcoal font-bold">{formatCurrency(Number(entry.totalTax || 0))}</div>
                    {entry.totalTax > 0 && (
                      <div className="text-[10px] text-gray-400 flex flex-col">
                        {entry.igst > 0 ? (
                          <span>IGST: {formatCurrency(Number(entry.igst))}</span>
                        ) : (
                          <>
                            <span>CGST: {formatCurrency(Number(entry.cgst))}</span>
                            <span>SGST: {formatCurrency(Number(entry.sgst))}</span>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`text-sm font-bold ${
                      entry.type === 'REFUND' ? 'text-rose-600' : 'text-charcoal'
                    }`}>
                      {entry.type === 'REFUND' ? '-' : ''}{formatCurrency(Number(entry.amount))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 text-gray-400 hover:text-wine hover:bg-wine/5 rounded-lg transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {!loading && entries.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="text-gray-300 w-8 h-8" />
              </div>
              <p className="text-gray-500 font-medium">No transactions found for this period.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, highlight = false }: any) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className={`p-6 rounded-2xl border transition-all hover:translate-y-[-4px] duration-300 ${
      highlight 
        ? 'bg-wine border-wine shadow-xl shadow-wine/20' 
        : 'bg-white border-gray-100 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-bold uppercase tracking-widest ${highlight ? 'text-wine-light/60' : 'text-gray-400'}`}>
          {title}
        </span>
        <div className={`p-2 rounded-xl ${highlight ? 'bg-white/10' : `bg-${color}-50`}`}>
          {icon}
        </div>
      </div>
      <div className={`text-2xl font-serif font-bold ${highlight ? 'text-ivory' : 'text-charcoal'}`}>
        {formatCurrency(value)}
      </div>
      <div className={`mt-2 text-[10px] font-bold uppercase tracking-tighter ${highlight ? 'text-wine-light/40' : 'text-gray-400'}`}>
        vs previous month
      </div>
    </div>
  );
}
