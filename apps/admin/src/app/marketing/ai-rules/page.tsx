"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Plus, Trash2, Save, 
  ToggleLeft, ToggleRight, Loader2, AlertCircle,
  CheckCircle2, Info, ArrowLeft, Target, Lightbulb
} from "lucide-react";
import Link from "next/link";

const API_URL = API_BASE;

interface StyleRule {
  id: string;
  name: string;
  trigger: string;
  recommendation: string;
  isActive: boolean;
}

export default function AIStyleRulesPage() {
  const [rules, setRules] = useState<StyleRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  // New Rule Form
  const [newRule, setNewRule] = useState({
    name: "",
    trigger: "",
    recommendation: "",
  });

  const showToast = (message: string, ok = true) => {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/ai/rules`, {
        headers: {
          // If token is needed, we would add it here. For now it seems AI Rules don't have AuthGuard.
          "Content-Type": "application/json",
        }
      });
      if (res.ok) setRules(await res.json());
      else {
        showToast("Failed to fetch rules", false);
        setRules([]);
      }
    } catch {
      showToast("Error connecting to API", false);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleAddRule = async () => {
    if (!newRule.name || !newRule.trigger || !newRule.recommendation) {
      showToast("Please fill all fields", false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/ai/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRule),
      });
      if (res.ok) {
        showToast("Rule added successfully!");
        setShowAdd(false);
        setNewRule({ name: "", trigger: "", recommendation: "" });
        fetchRules();
      } else {
        throw new Error();
      }
    } catch {
      showToast("Failed to add rule", false);
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`${API_URL}/ai/rules/${id}`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current })
      });
      if (res.ok) {
        setRules(rules.map(r => r.id === id ? { ...r, isActive: !current } : r));
      } else {
        showToast("Failed to toggle rule", false);
      }
    } catch {
      showToast("Failed to toggle rule", false);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`${API_URL}/ai/rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRules(rules.filter(r => r.id !== id));
        showToast("Rule removed.");
      } else {
        showToast("Failed to remove rule.", false);
      }
    } catch {
      showToast("Failed to remove rule.", false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
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
            {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link href="/marketing" className="text-gray-400 hover:text-wine text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-2 transition-colors">
            <ArrowLeft size={12} /> Back to Marketing
          </Link>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal flex items-center gap-3">
            <Sparkles className="text-wine" size={32} /> AI Styling Guide
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Train your AI Stylist with brand-specific knowledge and styling logic.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-6 py-3 bg-wine text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-wine/10"
        >
          <Plus size={16} /> Create Brand Rule
        </button>
      </div>

      {/* ─── Intro Card ─── */}
      <div className="bg-gradient-to-r from-wine to-charcoal rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h3 className="text-xl font-bold mb-2">How it works</h3>
          <p className="text-ivory/80 text-sm leading-relaxed">
            When a customer chats with the AI Stylist, it checks these rules. If the user mentions a **Trigger** 
            (like "Cotton" or "Wedding"), the AI will prioritize your **Recommendation** 
            (like suggesting specific collections or styling tips).
          </p>
        </div>
        <Sparkles className="absolute -right-8 -bottom-8 text-white/10 w-64 h-64 -rotate-12" />
      </div>

      {/* ─── Add Rule Modal/Form ─── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border-2 border-wine/20 rounded-3xl p-8 shadow-2xl space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-wine">New Styling Rule</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-charcoal">&times; Close</button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Wedding Expert"
                  value={newRule.name}
                  onChange={e => setNewRule({...newRule, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-wine/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Trigger Keyword</label>
                <input
                  type="text"
                  placeholder="e.g. Silk or Wedding"
                  value={newRule.trigger}
                  onChange={e => setNewRule({...newRule, trigger: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-wine/20 transition-all"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Recommendation / AI Prompt Injection</label>
                <textarea
                  rows={3}
                  placeholder="Describe the styling logic the AI should follow..."
                  value={newRule.recommendation}
                  onChange={e => setNewRule({...newRule, recommendation: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-wine/20 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowAdd(false)}
                className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-gray-500"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddRule}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-wine text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Save Rule
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Rules List ─── */}
      <div className="grid gap-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
          <Target size={14} /> Active Styling Logic ({rules.length})
        </h3>
        {loading ? (
          <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-wine" size={32} /></div>
        ) : rules.length === 0 ? (
          <div className="bg-white border rounded-3xl p-20 text-center space-y-4 shadow-sm border-dashed">
            <Info className="mx-auto text-gray-300" size={48} />
            <p className="text-gray-500 font-medium">No style rules created yet.</p>
          </div>
        ) : (
          rules.map((rule, i) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white border rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 group transition-all hover:border-wine/20 hover:shadow-md ${rule.isActive ? "border-gray-100" : "border-gray-200 opacity-60"}`}
            >
              <div className="w-12 h-12 rounded-xl bg-wine/10 text-wine flex items-center justify-center flex-shrink-0 animate-pulse">
                <Lightbulb size={24} />
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-charcoal">{rule.name}</h4>
                  <span className="px-2 py-0.5 bg-charcoal text-white rounded text-[8px] font-bold uppercase tracking-widest">
                    Trigger: {rule.trigger}
                  </span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{rule.recommendation}</p>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center">
                <button 
                  onClick={() => toggleRule(rule.id, rule.isActive)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${rule.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}
                >
                  {rule.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {rule.isActive ? "Active" : "Paused"}
                </button>
                <button 
                  onClick={() => deleteRule(rule.id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ─── AI Context Tip ─── */}
      <div className="mt-12 bg-charcoal rounded-3xl p-8 text-ivory/60 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-4">
          <p className="text-xs uppercase tracking-widest font-bold text-ivory">Expert Tip</p>
          <p className="text-sm leading-relaxed">
            Use <span className="text-wine font-bold">Specific Triggers</span> like "Silk" or "Wedding" for best results. 
            The AI Stylist is smart enough to match synonyms, but being explicit about your brand's 
            premium collections yields the most luxurious user conversions.
          </p>
        </div>
        <div className="w-px h-16 bg-ivory/10 hidden md:block"></div>
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold text-wine italic">OpenAI</span>
          <span className="text-[10px] uppercase tracking-widest">Powered Engine</span>
        </div>
      </div>

    </div>
  );
}
