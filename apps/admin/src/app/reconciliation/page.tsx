"use client";

import { useState, useCallback } from "react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  ShieldCheck, FileText, Info, Download, ChevronDown, Search,
  AlertOctagon, Zap, Eye
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────────
interface GatewayTxn {
  payment_id: string;
  order_id?: string;
  amount: number;
  status: string;
  created_at: string;
  email?: string;
  method?: string;
}

interface ReconciliationResult {
  status: "matched" | "ghost" | "orphan" | "mismatch";
  order_id?: string;
  payment_id?: string;
  db_amount?: number;
  gw_amount?: number;
  customer?: string;
  date?: string;
  email?: string;
  notes: string;
}

type TabType = "all" | "matched" | "ghost" | "orphan" | "mismatch";

const STATUS_CONFIG = {
  matched:  { color: "bg-green-50 text-green-700 border-green-200",  icon: <CheckCircle size={14} />,   label: "Matched" },
  ghost:    { color: "bg-red-50 text-red-700 border-red-200",        icon: <XCircle size={14} />,       label: "Ghost Order" },
  orphan:   { color: "bg-amber-50 text-amber-700 border-amber-200",  icon: <AlertTriangle size={14} />, label: "Orphan Payment" },
  mismatch: { color: "bg-orange-50 text-orange-700 border-orange-200", icon: <AlertOctagon size={14} />, label: "Amount Mismatch" },
};

// ─── Robust RFC-4180 CSV row parser ─────────────────────────────────────────
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field — consume until closing unescaped quote
      i++;
      let val = "";
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { val += line[i++]; }
      }
      result.push(val.trim());
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { result.push(line.slice(i).trim()); break; }
      result.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return result;
}

// ─── Razorpay CSV Parser ─────────────────────────────────────────────────────
function parseRazorpayCSV(text: string): GatewayTxn[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase());

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVRow(line);
    const row: any = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });

    const amountRaw = parseFloat(row["amount"] || "0");
    // Razorpay exports may be in paise (large int) or in rupees (small decimal)
    const amount = amountRaw > 10000 ? amountRaw / 100 : amountRaw;

    return {
      payment_id: row["payment id"] || row["payment_id"] || row["id"] || "",
      order_id:   row["order id"]   || row["order_id"]   || "",
      amount,
      status:     row["status"] || "",
      created_at: row["created at"] || row["created_at"] || "",
      email:      row["email"] || "",
      method:     row["method"] || "",
    };
  }).filter(t => t.payment_id);
}

// ─── PhonePe CSV Parser ──────────────────────────────────────────────────────
function parsePhonePeCSV(text: string): GatewayTxn[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase());

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVRow(line);
    const row: any = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });

    return {
      payment_id: row["transaction id"] || row["transactionid"] || row["merchant transaction id"] || "",
      order_id:   row["merchant transaction id"] || row["merchanttransactionid"] || "",
      amount:     parseFloat(row["amount"] || "0"),
      status:     row["status"] || row["transaction status"] || "",
      created_at: row["date"] || row["transaction date"] || "",
      email:      row["customer email"] || row["email"] || "",
      method:     "upi",
    };
  }).filter(t => t.payment_id);
}

// ─── Reconcile Engine ────────────────────────────────────────────────────────
function reconcile(orders: any[], gwTxns: GatewayTxn[]): ReconciliationResult[] {
  const results: ReconciliationResult[] = [];
  const gwMap = new Map<string, GatewayTxn>();

  gwTxns.forEach(t => {
    if (t.payment_id) gwMap.set(t.payment_id.toLowerCase(), t);
    if (t.order_id)   gwMap.set(t.order_id.toLowerCase(), t);
  });

  const matchedGwIds = new Set<string>();

  // Step 1: For each confirmed order, find matching GW txn
  for (const order of orders) {
    if (!["CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"].includes(order.status)) continue;
    if (order.paymentMethod === "COD") continue; // skip cash on delivery

    const paymentId = (order.paymentId || "").toLowerCase();
    const gwTxn = paymentId ? gwMap.get(paymentId) : undefined;

    if (!gwTxn) {
      results.push({
        status: "ghost",
        order_id: order.id,
        payment_id: order.paymentId || "—",
        db_amount: Number(order.totalAmount),
        customer: order.customerName,
        email: order.customerEmail,
        date: order.createdAt,
        notes: "Order is CONFIRMED in DB but no matching payment found in gateway CSV.",
      });
    } else {
      matchedGwIds.add(gwTxn.payment_id.toLowerCase());
      if (gwTxn.order_id) matchedGwIds.add(gwTxn.order_id.toLowerCase());

      const dbAmount = Number(order.totalAmount);
      const gwAmount = gwTxn.amount;
      const diff = Math.abs(dbAmount - gwAmount);

      if (diff > 1) {
        results.push({
          status: "mismatch",
          order_id: order.id,
          payment_id: gwTxn.payment_id,
          db_amount: dbAmount,
          gw_amount: gwAmount,
          customer: order.customerName,
          email: order.customerEmail,
          date: order.createdAt,
          notes: `Amount mismatch: DB has ₹${dbAmount}, Gateway has ₹${gwAmount} (diff ₹${diff.toFixed(2)}).`,
        });
      } else {
        results.push({
          status: "matched",
          order_id: order.id,
          payment_id: gwTxn.payment_id,
          db_amount: dbAmount,
          gw_amount: gwAmount,
          customer: order.customerName,
          email: order.customerEmail,
          date: order.createdAt,
          notes: "Order and gateway payment are in perfect sync.",
        });
      }
    }
  }

  // Step 2: Gateway txns with no matching order (orphaned payments)
  gwTxns.forEach(t => {
    const isPaid = ["captured", "success", "settlement", "paid"].includes(t.status.toLowerCase());
    if (!isPaid) return;
    if (matchedGwIds.has(t.payment_id.toLowerCase())) return;
    if (t.order_id && matchedGwIds.has(t.order_id.toLowerCase())) return;

    results.push({
      status: "orphan",
      payment_id: t.payment_id,
      gw_amount: t.amount,
      email: t.email,
      date: t.created_at,
      notes: "Payment captured in gateway but no matching confirmed order found in Raaghas.",
    });
  });

  return results;
}

// ─── Page Component ──────────────────────────────────────────────────────────
export default function ReconciliationPage() {
  const { token } = useAdminAuth();
  const [gateway, setGateway] = useState<"razorpay" | "phonepe">("razorpay");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ReconciliationResult[] | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".csv")) setFile(dropped);
  }, []);

  const handleRun = async () => {
    if (!file || !token) return;
    setIsProcessing(true);
    setError("");
    setResults(null);

    try {
      // 1. Read and parse the CSV
      const text = await file.text();
      const gwTxns = gateway === "razorpay" ? parseRazorpayCSV(text) : parsePhonePeCSV(text);

      if (gwTxns.length === 0) {
        setError("Could not parse any transactions from this CSV. Please check the file format and try again.");
        setIsProcessing(false);
        return;
      }

      // 2. Fetch all confirmed orders from the DB (no date filter, let the CSV define the scope)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? "http://localhost:6005/api/v1" : "https://api.raaghas.in/api/v1")}/orders/admin/all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const orders: any[] = await res.json();

      // 3. Run reconciliation engine
      const reconciled = reconcile(orders, gwTxns);
      setResults(reconciled);
      setActiveTab("all");
    } catch (err: any) {
      setError(err.message || "Reconciliation failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = results
    ? results
        .filter(r => activeTab === "all" || r.status === activeTab)
        .filter(r =>
          !search ||
          r.order_id?.includes(search) ||
          r.payment_id?.toLowerCase().includes(search.toLowerCase()) ||
          r.email?.toLowerCase().includes(search.toLowerCase()) ||
          r.customer?.toLowerCase().includes(search.toLowerCase())
        )
    : [];

  const counts = results
    ? {
        all: results.length,
        matched: results.filter(r => r.status === "matched").length,
        ghost: results.filter(r => r.status === "ghost").length,
        orphan: results.filter(r => r.status === "orphan").length,
        mismatch: results.filter(r => r.status === "mismatch").length,
      }
    : null;

  const healthScore = counts
    ? Math.round((counts.matched / Math.max(counts.all, 1)) * 100)
    : null;

  const handleExportResults = () => {
    if (!results) return;
    const headers = ["Status", "Order ID", "Payment ID", "DB Amount", "GW Amount", "Customer", "Email", "Date", "Notes"];
    const rows = results.map(r => [
      r.status, r.order_id || "", r.payment_id || "",
      r.db_amount || "", r.gw_amount || "",
      r.customer || "", r.email || "", r.date || "", `"${r.notes}"`
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconciliation_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F9FAFB]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <RefreshCw size={22} className="text-wine" />
              Payment Reconciliation
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Compare Razorpay / PhonePe settlements against your order database
            </p>
          </div>
          {results && (
            <button
              onClick={handleExportResults}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all"
            >
              <Download size={16} /> Export Results
            </button>
          )}
        </div>

        {/* Health Score Strip */}
        {counts !== null && (
          <div className="grid grid-cols-5 gap-4 mt-6">
            {[
              { label: "Health Score", value: `${healthScore}%`, color: healthScore! >= 95 ? "text-green-600" : healthScore! >= 80 ? "text-amber-600" : "text-red-600", bg: healthScore! >= 95 ? "bg-green-50" : healthScore! >= 80 ? "bg-amber-50" : "bg-red-50" },
              { label: "Total Checked", value: counts.all, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Matched", value: counts.matched, color: "text-green-600", bg: "bg-green-50" },
              { label: "Ghost Orders", value: counts.ghost, color: "text-red-600", bg: "bg-red-50" },
              { label: "Orphan Payments", value: counts.orphan, color: "text-amber-600", bg: "bg-amber-50" },
            ].map((stat, i) => (
              <div key={i} className={`${stat.bg} rounded-xl px-5 py-4 flex flex-col`}>
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-auto p-8">
        {/* Upload Card */}
        {!results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Upload Settlement Report</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Download your CSV from Razorpay or PhonePe dashboard and upload it here.
                </p>

                {/* Gateway Selector */}
                <div className="flex gap-3 mb-6">
                  {(["razorpay", "phonepe"] as const).map(gw => (
                    <button
                      key={gw}
                      onClick={() => setGateway(gw)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-widest border-2 transition-all ${
                        gateway === gw
                          ? "border-wine bg-wine text-white"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {gw === "razorpay" ? "Razorpay" : "PhonePe"}
                    </button>
                  ))}
                </div>

                {/* Drop Zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("csv-upload")?.click()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-wine bg-wine/5"
                      : file
                      ? "border-green-400 bg-green-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                  }`}
                >
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle className="text-green-500" size={40} />
                      <p className="text-sm font-bold text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="text-gray-300" size={40} />
                      <p className="text-sm font-semibold text-gray-700">Drag & drop your CSV here</p>
                      <p className="text-xs text-gray-400">or click to browse</p>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                  <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700 space-y-1">
                    {gateway === "razorpay" ? (
                      <>
                        <p className="font-bold">How to export from Razorpay:</p>
                        <p>Dashboard → Transactions → Payments → Export → Select Date Range → Download CSV</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold">How to export from PhonePe:</p>
                        <p>PhonePe Business Dashboard → Reports → Transaction Report → Download CSV</p>
                      </>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 flex gap-3">
                    <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-700">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleRun}
                  disabled={!file || isProcessing}
                  className="mt-6 w-full py-3 bg-charcoal text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-wine transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Reconciling...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Run Reconciliation
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results Table */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Tabs + Search */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex bg-gray-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar gap-0.5">
                    {(["all", "matched", "ghost", "orphan", "mismatch"] as TabType[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 whitespace-nowrap rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                          activeTab === tab ? "bg-white text-wine shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {tab !== "all" && STATUS_CONFIG[tab].icon}
                        {tab === "all" ? "All" : STATUS_CONFIG[tab].label}
                        {counts && (
                          <span className="ml-1 px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold">
                            {counts[tab]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search ID, email..."
                        className="bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-wine/10 outline-none w-64"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => { setResults(null); setFile(null); setSearch(""); }}
                      className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Order / Payment</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Customer</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">DB Amount</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">GW Amount</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-24 text-center">
                            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">No records in this category</p>
                          </td>
                        </tr>
                      ) : filtered.map((r, i) => {
                        const cfg = STATUS_CONFIG[r.status];
                        return (
                          <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border w-fit ${cfg.color}`}>
                                {cfg.icon}
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                {r.order_id && (
                                  <span className="text-xs font-bold text-gray-900 tracking-widest uppercase flex items-center gap-1.5">
                                    <FileText size={11} className="text-gray-400" />
                                    #{r.order_id.slice(-8)}
                                  </span>
                                )}
                                {r.payment_id && r.payment_id !== "—" && (
                                  <span className="text-[10px] text-gray-400 font-mono">{r.payment_id}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-900">{r.customer || "—"}</span>
                                <span className="text-[10px] text-gray-400">{r.email || ""}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-gray-900">
                                {r.db_amount != null ? `₹${Number(r.db_amount).toLocaleString()}` : "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-bold ${
                                r.status === "mismatch"
                                  ? r.gw_amount! < r.db_amount!
                                    ? "text-red-600"
                                    : "text-amber-600"
                                  : "text-gray-900"
                              }`}>
                                {r.gw_amount != null ? `₹${Number(r.gw_amount).toLocaleString()}` : "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-gray-500">
                                {r.date ? (() => { try { return format(new Date(r.date), "MMM dd, yyyy"); } catch { return r.date; } })() : "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4 max-w-xs">
                              <p className="text-[10px] text-gray-500 leading-relaxed">{r.notes}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action prompts for critical issues */}
              {counts && (counts.ghost > 0 || counts.orphan > 0) && (
                <div className="mt-6 space-y-3">
                  {counts.ghost > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
                      <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-900">{counts.ghost} Ghost Order{counts.ghost > 1 ? "s" : ""} Detected</p>
                        <p className="text-xs text-red-700 mt-1">
                          These orders are confirmed in your database but have no matching payment in the gateway.
                          <strong> Do not ship these products.</strong> Contact the customer and verify payment before fulfillment.
                        </p>
                      </div>
                    </div>
                  )}
                  {counts.orphan > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                      <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">{counts.orphan} Orphaned Payment{counts.orphan > 1 ? "s" : ""} Found</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Customers paid successfully but no order was created (usually due to network drop after payment).
                          <strong> You need to either manually create the order or refund these payments.</strong>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
