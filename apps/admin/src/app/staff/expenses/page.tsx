"use client";

import { useState, useEffect } from "react";
import { Wallet, ExternalLink, RefreshCw, Info, ShieldCheck, CheckCircle2, AlertTriangle, Settings } from "lucide-react";

export default function StaffExpensesPage() {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [customUrl, setCustomUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState("https://expense.zoho.com");
  const [showUrlConfig, setShowUrlConfig] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem("zoho_custom_url");
    if (savedUrl) {
      setCustomUrl(savedUrl);
      setActiveUrl(savedUrl);
    }
  }, []);

  const handleSaveCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      localStorage.setItem("zoho_custom_url", customUrl.trim());
      setActiveUrl(customUrl.trim());
    } else {
      localStorage.removeItem("zoho_custom_url");
      setActiveUrl("https://expense.zoho.com");
    }
    setShowUrlConfig(false);
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#FDFBF7] min-h-screen flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-charcoal uppercase tracking-tight">Expense Claims & Reimbursements</h1>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-blue-200/50 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Zoho Integration
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Review staff receipt submissions, travel claims, and process reimbursements via Zoho Expense.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowUrlConfig(!showUrlConfig)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-charcoal text-xs font-bold rounded-xl transition-all"
            title="Configure Custom Embed / Portal Link"
          >
            <Settings size={15} />
            {customUrl ? "Custom Link Saved" : "Set Embed Link"}
          </button>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className="flex items-center gap-1.5 px-3 py-2 bg-beige/60 hover:bg-beige text-wine text-xs font-bold rounded-xl transition-all"
          >
            <Info size={15} />
            Setup Guide
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-charcoal text-xs font-bold rounded-xl transition-all"
            title="Reload Portal"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>

          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2 bg-wine text-ivory rounded-xl text-xs font-bold uppercase tracking-wider hover:scale-[1.02] transition-all shadow-md shadow-wine/20"
          >
            Open Zoho Expense
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Custom URL Configuration Box */}
      {showUrlConfig && (
        <div className="bg-white border border-wine/20 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-wine uppercase tracking-wider flex items-center gap-1.5">
              <Settings size={14} /> Custom Zoho Expense Embed / Organization Link
            </h3>
            <span className="text-[11px] text-gray-400">Optional</span>
          </div>
          <p className="text-xs text-gray-600">
            If Zoho blocks standard iframe login, paste your organization dashboard link below:
          </p>
          <form onSubmit={handleSaveCustomUrl} className="flex gap-2">
            <input
              type="url"
              placeholder="e.g. https://expense.zoho.com/app/your-org-id"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="flex-1 px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-wine"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-wine text-white rounded-xl text-xs font-bold hover:bg-wine/90 transition-all"
            >
              Save Link
            </button>
            {customUrl && (
              <button
                type="button"
                onClick={() => {
                  setCustomUrl("");
                  localStorage.removeItem("zoho_custom_url");
                  setActiveUrl("https://expense.zoho.com");
                  setShowUrlConfig(false);
                }}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs hover:bg-gray-200"
              >
                Reset Default
              </button>
            )}
          </form>
        </div>
      )}

      {/* Info / Setup Banner (Toggleable) */}
      {showInfo && (
        <div className="bg-wine/5 border border-wine/15 rounded-2xl p-5 text-charcoal space-y-3">
          <div className="flex items-center gap-2 text-wine font-bold text-sm">
            <ShieldCheck size={18} />
            <span>How Expense Claims Work with Zoho Expense</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
            <div className="bg-white p-4 rounded-xl border border-wine/10">
              <p className="font-bold text-charcoal mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> 1. Staff Submits Receipt
              </p>
              <p>Staff upload receipt photos from their phone or web app with category and merchant details.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-wine/10">
              <p className="font-bold text-charcoal mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> 2. Manager Approval
              </p>
              <p>Managers verify the expense report and approve or request changes with 1-click.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-wine/10">
              <p className="font-bold text-charcoal mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> 3. Payout & Accounting
              </p>
              <p>Finance marks claims as reimbursed and exports accounting reports to Tally / Excel.</p>
            </div>
          </div>
        </div>
      )}

      {/* Embedded iFrame Container & Security Warning */}
      <div className="flex-1 w-full bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col min-h-[650px] relative">
        {/* Security Warning Notice bar */}
        <div className="bg-amber-50 border-b border-amber-200/60 px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Note:</strong> Zoho Expense restricts embedding login pages inside frames for security (<code className="bg-amber-100/80 px-1 py-0.5 rounded text-[11px]">X-Frame-Options</code>).
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 shadow-xs"
            >
              Open Zoho Expense in New Tab <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-10 flex flex-col items-center justify-center p-6 text-center gap-4">
            <div className="w-12 h-12 border-3 border-wine/20 border-t-wine rounded-full animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-charcoal uppercase tracking-wider">Connecting to Zoho Expense Portal...</p>
              <p className="text-xs text-gray-500 max-w-md">
                If the box below remains empty, click "Open Zoho Expense in New Tab" above.
              </p>
            </div>
            <a
              href="https://expense.zoho.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-wine text-white font-bold text-xs rounded-xl hover:bg-wine/90 transition-all shadow-sm"
            >
              Launch Zoho Expense Desk <ExternalLink size={14} />
            </a>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={activeUrl}
          onLoad={() => setIsLoading(false)}
          className="w-full flex-1 min-h-[600px] border-0"
          title="Staff Expense Claims Portal - Zoho Expense"
          allow="geolocation; camera"
        />
      </div>
    </div>
  );
}

