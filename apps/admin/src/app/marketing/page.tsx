"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Users, TrendingUp, IndianRupee,
  Zap, RefreshCw, CheckCircle2, Clock, Send,
  ChevronDown, AlertTriangle, BarChart3, Loader2,
  Phone, ShoppingBag, Sparkles, Filter
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

const API_URL = `${API_BASE}/api/v1`;

interface Lead {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  cartTotal: number;
  status: "PENDING" | "NUDGE_1_SENT" | "NUDGE_2_SENT" | "CONVERTED";
  items?: any[];
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  pending: number;
  nudge1Sent: number;
  nudge2Sent: number;
  converted: number;
  conversionRate: string;
  potentialRevenue: number;
}

const STATUS_CONFIG: Record<Lead["status"], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:      { label: "Abandoned",    color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  icon: <Clock size={12} /> },
  NUDGE_1_SENT: { label: "Nudge 1 Sent", color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   icon: <Send size={12} /> },
  NUDGE_2_SENT: { label: "Nudge 2 Sent", color: "text-violet-700", bg: "bg-violet-50 border-violet-200", icon: <Zap size={12} /> },
  CONVERTED:    { label: "Converted",    color: "text-green-700",  bg: "bg-green-50 border-green-200",  icon: <CheckCircle2 size={12} /> },
};

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border p-6 flex flex-col gap-3 shadow-sm ${accent ? "border-wine/20 bg-gradient-to-br from-wine/[0.03] to-transparent" : "border-gray-100"}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? "bg-wine text-ivory" : "bg-gray-100 text-charcoal"}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{label}</p>
        <p className={`text-3xl font-bold tracking-tight mt-1 ${accent ? "text-wine" : "text-charcoal"}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function MarketingPage() {
  const { token } = useAdminAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  const showToast = (message: string, ok = true) => {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, leadsRes] = await Promise.all([
        fetch(`${API_URL}/marketing/leads/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/marketing/leads${filter !== "ALL" ? `?status=${filter}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (leadsRes.ok) setLeads(await leadsRes.json());
    } catch {
      // Mock data for dev/preview
      setStats({ total: 47, pending: 18, nudge1Sent: 15, nudge2Sent: 8, converted: 6, conversionRate: "12.8%", potentialRevenue: 342500 });
      setLeads([
        { id: "1", phone: "9876543210", name: "Priya Sharma", email: "priya@gmail.com", cartTotal: 4500, status: "PENDING",     createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString() },
        { id: "2", phone: "9988776655", name: "Ananya Mishra", email: "ananya@gmail.com", cartTotal: 2800, status: "NUDGE_1_SENT", createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 7200000).toISOString() },
        { id: "3", phone: "8877665544", name: "Riya Singh", email: "riya@gmail.com",   cartTotal: 6200, status: "NUDGE_2_SENT", createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
        { id: "4", phone: "7766554433", name: "Divya Patel",  email: "divya@gmail.com", cartTotal: 1900, status: "CONVERTED",   createdAt: new Date(Date.now() - 259200000).toISOString(), updatedAt: new Date(Date.now() - 200000000).toISOString() },
        { id: "5", phone: "6655443322", name: "Kavya Nair",   email: "kavya@gmail.com", cartTotal: 3400, status: "PENDING",     createdAt: new Date(Date.now() - 5400000).toISOString(), updatedAt: new Date(Date.now() - 5400000).toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sendNudge = async (leadId: string, template: "NUDGE_1" | "NUDGE_2") => {
    setNudging(n => ({ ...n, [leadId]: true }));
    try {
      const res = await fetch(`${API_URL}/marketing/leads/${leadId}/nudge`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ template }),
      });
      const data = await res.json();
      showToast(data.message || "Nudge sent!", res.ok);
      if (res.ok) fetchData();
    } catch {
      showToast("Failed to send nudge. Check WhatsApp config.", false);
    } finally {
      setNudging(n => ({ ...n, [leadId]: false }));
    }
  };

  const markConverted = async (phone: string) => {
    try {
      await fetch(`${API_URL}/marketing/leads/${phone}/mark-converted`, { 
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Lead marked as converted! 🎉");
      fetchData();
    } catch {
      showToast("Action failed.", false);
    }
  };

  const filteredLeads = filter === "ALL" ? leads : leads.filter(l => l.status === filter);
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ago`;
    if (h > 0) return `${h}h ago`;
    return `${m}m ago`;
  };

  return (
    <div className="space-y-8">

      {/* ─── Toast ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 ${
              toast.ok ? "bg-charcoal text-white" : "bg-red-600 text-white"
            }`}
          >
            {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Header ─── */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal flex items-center gap-3">
            <MessageCircle className="text-wine" size={32} /> WhatsApp Nudge Engine
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Autonomously recover abandoned carts via personalised WhatsApp follow-ups.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* ─── Stats ─── */}
      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={<Users size={20} />}       label="Total Leads"     value={stats.total}           />
          <StatCard icon={<Clock size={20} />}        label="Abandoned"       value={stats.pending}         sub="Need nudge" />
          <StatCard icon={<Send size={20} />}         label="Nudge 1 Sent"   value={stats.nudge1Sent}      />
          <StatCard icon={<Zap size={20} />}          label="Nudge 2 Sent"   value={stats.nudge2Sent}      />
          <StatCard icon={<TrendingUp size={20} />}   label="Conversion Rate" value={stats.conversionRate} accent />
          <StatCard icon={<IndianRupee size={20} />}  label="At-Risk Revenue" value={`₹${Number(stats.potentialRevenue).toLocaleString("en-IN")}`} sub="recoverable" accent />
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ─── Funnel Pipeline ─── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
          <BarChart3 size={14} /> Recovery Funnel
        </h3>
        <div className="flex items-center gap-2">
          {stats && (
            <>
              {[
                { label: "Abandoned", value: stats.pending, color: "bg-amber-400" },
                { label: "Nudge 1",  value: stats.nudge1Sent, color: "bg-blue-400" },
                { label: "Nudge 2",  value: stats.nudge2Sent, color: "bg-violet-400" },
                { label: "Recovered",value: stats.converted,  color: "bg-green-500" },
              ].map((stage, i) => {
                const pct = stats.total > 0 ? (stage.value / stats.total) * 100 : 0;
                return (
                  <div key={i} className="flex-1">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stage.label}</span>
                      <span className="text-sm font-bold text-charcoal">{stage.value}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className={`h-full rounded-full ${stage.color}`}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{pct.toFixed(0)}% of total</p>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ─── Lead Table ─── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
            <Filter size={14} /> Leads ({filteredLeads.length})
          </h3>
          <div className="flex gap-2 flex-wrap">
            {["ALL", "PENDING", "NUDGE_1_SENT", "NUDGE_2_SENT", "CONVERTED"].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filter === s
                    ? "bg-charcoal text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {s === "ALL" ? "All" : STATUS_CONFIG[s as Lead["status"]]?.label || s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex items-center justify-center">
            <Loader2 className="animate-spin text-wine" size={32} />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <Sparkles size={40} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold text-sm">No leads in this stage</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredLeads.map((lead) => {
              const cfg = STATUS_CONFIG[lead.status];
              const isNudging = nudging[lead.id];
              const canNudge1 = lead.status === "PENDING";
              const canNudge2 = lead.status === "NUDGE_1_SENT";

              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-gray-50/60 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-wine/10 text-wine flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {(lead.name?.[0] || lead.phone[0]).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-charcoal text-sm truncate">{lead.name || "Unknown Customer"}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Phone size={10} /> {lead.phone}
                      </span>
                      {lead.email && (
                        <span className="text-[10px] text-gray-400 truncate hidden sm:block">{lead.email}</span>
                      )}
                    </div>
                  </div>

                  {/* Cart Value */}
                  <div className="flex items-center gap-1.5 text-wine font-bold">
                    <ShoppingBag size={14} />
                    <span>₹{Number(lead.cartTotal).toLocaleString("en-IN")}</span>
                  </div>

                  {/* Status Badge */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${cfg.bg} ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </span>

                  {/* Time */}
                  <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{timeAgo(lead.updatedAt)}</span>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canNudge1 && (
                      <button
                        onClick={() => sendNudge(lead.id, "NUDGE_1")}
                        disabled={isNudging}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isNudging ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                        Nudge 1
                      </button>
                    )}
                    {canNudge2 && (
                      <button
                        onClick={() => sendNudge(lead.id, "NUDGE_2")}
                        disabled={isNudging}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-violet-700 transition-colors disabled:opacity-50"
                      >
                        {isNudging ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                        Nudge 2
                      </button>
                    )}
                    {lead.status !== "CONVERTED" && (
                      <button
                        onClick={() => markConverted(lead.phone)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle2 size={10} /> Converted
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── WhatsApp Config Reminder ─── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
        <div className="p-2 bg-amber-100 rounded-xl text-amber-600 flex-shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div>
          <p className="font-bold text-amber-800 text-sm mb-1">WhatsApp Integration Required</p>
          <p className="text-amber-700 text-xs leading-relaxed">
            To enable automated nudges, add your Grafty.pro credentials to Store Settings:
            <code className="ml-2 bg-amber-100 px-2 py-0.5 rounded font-mono text-[11px]">WHATSAPP_API_KEY</code>,
            <code className="ml-1 bg-amber-100 px-2 py-0.5 rounded font-mono text-[11px]">WHATSAPP_APP_ID</code>.
            Crons run every 30 min (Nudge 1) and every 1 hr (Nudge 2).
          </p>
        </div>
      </div>

    </div>
  );
}
