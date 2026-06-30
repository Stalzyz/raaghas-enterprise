"use client";

import { useState, useEffect } from "react";
import {
  Zap, Plus, ArrowRight, Settings2, Trash2, ShieldCheck,
  ShoppingCart, Tag, Loader2, X, Save, ToggleLeft, ToggleRight,
  AlertCircle, CheckCircle2
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? "http://localhost:6005/api/v1" : "https://api.raaghas.in/api/v1");

const CONDITION_OPTIONS = [
  { value: "minCartValue", label: "Cart Value ≥ ₹", type: "number" },
  { value: "maxCartValue", label: "Cart Value ≤ ₹", type: "number" },
  { value: "userType", label: "Customer Type", type: "select", options: ["new", "returning", "vip"] },
  { value: "minItemCount", label: "Min Items in Cart", type: "number" },
  { value: "category", label: "Cart Contains Category", type: "text" },
  { value: "timeOfDay", label: "Time of Day", type: "select", options: ["morning", "afternoon", "evening", "night"] },
];

const ACTION_OPTIONS = [
  { value: "PERCENTAGE_DISCOUNT", label: "% Discount on Total", fields: [{ key: "value", label: "Discount %", type: "number" }] },
  { value: "FLAT_DISCOUNT", label: "₹ Flat Discount", fields: [{ key: "value", label: "Amount Off (₹)", type: "number" }] },
  { value: "FREE_SHIPPING", label: "Free Shipping", fields: [] },
  { value: "COUPON_CODE", label: "Apply Coupon Code", fields: [{ key: "couponCode", label: "Coupon Code", type: "text" }] },
  { value: "GIFT_PRODUCT", label: "Add Free Gift SKU", fields: [{ key: "sku", label: "Product SKU", type: "text" }] },
];

const GROWTH_RECIPES = [
  {
    name: "AOV Booster",
    description: "Spend ₹5000+ get ₹500 OFF",
    priority: 8,
    conditions: { minCartValue: 5000 },
    actions: { type: "FLAT_DISCOUNT", value: 500 },
  },
  {
    name: "New User Welcome",
    description: "First-time customers get 10% OFF",
    priority: 10,
    conditions: { userType: "new" },
    actions: { type: "PERCENTAGE_DISCOUNT", value: 10 },
  },
  {
    name: "Flash Sale Nudge",
    description: "Free Shipping on any order tonight",
    priority: 6,
    conditions: { timeOfDay: "night" },
    actions: { type: "FREE_SHIPPING" },
  },
  {
    name: "Bulk Buy Reward",
    description: "Buy 3+ items, get 15% OFF",
    priority: 7,
    conditions: { minItemCount: 3 },
    actions: { type: "PERCENTAGE_DISCOUNT", value: 15 },
  },
];

const emptyForm = {
  name: "",
  description: "",
  priority: 5,
  isActive: true,
  conditionKey: "minCartValue",
  conditionValue: "",
  actionType: "PERCENTAGE_DISCOUNT",
  actionValue: "",
  actionCoupon: "",
  actionSku: "",
};

function getConditionLabel(conditions: any): string {
  if (!conditions) return "—";
  if (conditions.minCartValue) return `Cart ≥ ₹${conditions.minCartValue}`;
  if (conditions.maxCartValue) return `Cart ≤ ₹${conditions.maxCartValue}`;
  if (conditions.userType) return `Customer is ${conditions.userType}`;
  if (conditions.minItemCount) return `≥ ${conditions.minItemCount} items`;
  if (conditions.category) return `Category: ${conditions.category}`;
  if (conditions.timeOfDay) return `Time: ${conditions.timeOfDay}`;
  return JSON.stringify(conditions);
}

function getActionLabel(actions: any): string {
  if (!actions) return "—";
  if (actions.type === "PERCENTAGE_DISCOUNT") return `${actions.value}% OFF`;
  if (actions.type === "FLAT_DISCOUNT") return `₹${actions.value} OFF`;
  if (actions.type === "FREE_SHIPPING") return "Free Shipping";
  if (actions.type === "COUPON_CODE") return `Code: ${actions.couponCode}`;
  if (actions.type === "GIFT_PRODUCT") return `Gift: ${actions.sku}`;
  return JSON.stringify(actions);
}

export default function AutomatedOffers() {
  const { token } = useAdminAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/marketing/offer-rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRules(await res.json());
    } catch {
      showToast("error", "Failed to load offer rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadRules();
  }, [token]);

  const openNewModal = (prefill?: typeof emptyForm) => {
    setForm(prefill ? { ...emptyForm, ...prefill } : { ...emptyForm });
    setShowModal(true);
  };

  const buildPayload = () => {
    const conditions: Record<string, any> = {};
    const opt = CONDITION_OPTIONS.find(o => o.value === form.conditionKey);
    if (opt?.type === "number") conditions[form.conditionKey] = Number(form.conditionValue);
    else conditions[form.conditionKey] = form.conditionValue;

    const actions: Record<string, any> = { type: form.actionType };
    if (["PERCENTAGE_DISCOUNT", "FLAT_DISCOUNT"].includes(form.actionType)) actions.value = Number(form.actionValue);
    if (form.actionType === "COUPON_CODE") actions.couponCode = form.actionCoupon;
    if (form.actionType === "GIFT_PRODUCT") actions.sku = form.actionSku;

    return {
      name: form.name,
      description: form.description,
      priority: Number(form.priority),
      isActive: form.isActive,
      conditions,
      actions,
    };
  };

  const handleSave = async () => {
    if (!form.name.trim()) return showToast("error", "Rule name is required.");
    if (!form.conditionValue && form.conditionKey !== "FREE_SHIPPING") {
      // allowed for some
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/marketing/offer-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save rule.");
      }
      showToast("success", "Rule created successfully!");
      setShowModal(false);
      loadRules();
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: any) => {
    try {
      const res = await fetch(`${API_BASE}/marketing/offer-rules/${rule.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      if (res.ok) {
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
        showToast("success", `Rule ${!rule.isActive ? "activated" : "paused"}.`);
      }
    } catch {
      showToast("error", "Failed to toggle rule.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule permanently?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/marketing/offer-rules/${id}/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== id));
        showToast("success", "Rule deleted.");
      }
    } catch (e: any) {
      showToast("error", "Error: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const actionDef = ACTION_OPTIONS.find(a => a.value === form.actionType);
  const conditionDef = CONDITION_OPTIONS.find(c => c.value === form.conditionKey);

  return (
    <div className="space-y-8">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold transition-all ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Automated Offer Engine</h2>
          <p className="text-gray-500 text-sm mt-1">Design If-This-Then-That rules that auto-apply at checkout.</p>
        </div>
        <button
          onClick={() => openNewModal()}
          className="flex items-center gap-2 bg-wine text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-all shadow-lg"
        >
          <Plus size={16} /> New Rule
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rule List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-wine" size={32} />
            </div>
          ) : rules.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[3rem] text-gray-400">
              <Settings2 size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-bold">No active offer rules.</p>
              <p className="text-xs mt-1">Start by creating your first automated conversion rule.</p>
              <button
                onClick={() => openNewModal()}
                className="mt-4 px-5 py-2 bg-wine text-white text-xs font-bold rounded-xl hover:bg-charcoal transition-all"
              >
                Create First Rule
              </button>
            </div>
          ) : (
            rules.map(rule => (
              <div
                key={rule.id}
                className={`bg-white rounded-[2.5rem] border p-8 shadow-sm flex items-center gap-8 relative overflow-hidden group transition-all ${rule.isActive ? "border-gray-100" : "border-gray-200 opacity-60"}`}
              >
                <div className={`absolute top-0 left-0 w-1.5 h-full ${rule.isActive ? "bg-wine" : "bg-gray-300"} opacity-60`} />

                <div className={`w-12 h-12 ${rule.isActive ? "bg-wine/5 text-wine" : "bg-gray-100 text-gray-400"} rounded-2xl flex items-center justify-center shrink-0`}>
                  <Zap size={24} />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-charcoal">{rule.name}</h3>
                      {rule.description && <p className="text-xs text-gray-400 mt-0.5">{rule.description}</p>}
                    </div>
                    <div className="flex gap-3 items-center relative z-10">
                      <span className="px-2 py-0.5 bg-gray-100 rounded-lg text-[10px] font-bold text-charcoal">Priority {rule.priority}</span>
                      <button
                        onClick={() => handleToggle(rule)}
                        className="text-gray-400 hover:text-wine transition-colors"
                        title={rule.isActive ? "Pause rule" : "Activate rule"}
                      >
                        {rule.isActive ? <ToggleRight size={22} className="text-wine" /> : <ToggleLeft size={22} />}
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={deletingId === rule.id}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        {deletingId === rule.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <ShoppingCart size={14} className="text-wine" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal">
                        {getConditionLabel(rule.conditions)}
                      </span>
                    </div>
                    <ArrowRight size={14} className="text-gray-300 shrink-0" />
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-wine text-white rounded-xl shadow-md">
                      <Tag size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {getActionLabel(rule.actions)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Growth Recipes */}
          <div className="bg-charcoal text-white rounded-[2.5rem] p-8 shadow-xl space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">Growth Recipes</h4>
            <div className="space-y-3">
              {GROWTH_RECIPES.map(recipe => (
                <button
                  key={recipe.name}
                  onClick={() => openNewModal({
                    ...emptyForm,
                    name: recipe.name,
                    description: recipe.description,
                    priority: recipe.priority,
                    conditionKey: Object.keys(recipe.conditions)[0],
                    conditionValue: String(Object.values(recipe.conditions)[0]),
                    actionType: recipe.actions.type,
                    actionValue: (recipe.actions as any).value ? String((recipe.actions as any).value) : "",
                  })}
                  className="w-full text-left p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold">{recipe.name}</p>
                    <p className="text-[10px] opacity-40">{recipe.description}</p>
                  </div>
                  <Plus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Conflict Info */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-wine" />
              <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal">Conflict Resolution</h4>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
              Rules are evaluated in descending <span className="font-bold text-wine">priority order</span>. Only the highest-value eligible offer is applied, preventing stacking.
            </p>
          </div>
        </div>
      </div>

      {/* New Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-charcoal">Create Offer Rule</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Name & Meta */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Rule Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. New User Welcome Offer"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional note for yourself"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Priority (higher = first)</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-wine text-sm"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                      className={`w-10 h-5 rounded-full transition-all relative ${form.isActive ? "bg-wine" : "bg-gray-200"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.isActive ? "left-5" : "left-0.5"}`} />
                    </button>
                    <span className="text-xs font-bold text-charcoal">{form.isActive ? "Active" : "Inactive"}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Condition Builder */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">IF condition</p>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.conditionKey}
                  onChange={e => setForm({ ...form, conditionKey: e.target.value, conditionValue: "" })}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                >
                  {CONDITION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {conditionDef?.type === "select" ? (
                  <select
                    value={form.conditionValue}
                    onChange={e => setForm({ ...form, conditionValue: e.target.value })}
                    className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                  >
                    <option value="">Select…</option>
                    {conditionDef.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={conditionDef?.type === "number" ? "number" : "text"}
                    value={form.conditionValue}
                    onChange={e => setForm({ ...form, conditionValue: e.target.value })}
                    placeholder={conditionDef?.type === "number" ? "e.g. 2000" : "Value"}
                    className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                  />
                )}
              </div>
            </div>

            {/* Action Builder */}
            <div className="bg-wine/5 rounded-2xl p-5 space-y-3 border border-wine/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-wine">THEN apply action</p>
              <select
                value={form.actionType}
                onChange={e => setForm({ ...form, actionType: e.target.value, actionValue: "", actionCoupon: "", actionSku: "" })}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none"
              >
                {ACTION_OPTIONS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              {actionDef?.fields.map(field => (
                <input
                  key={field.key}
                  type={field.type}
                  placeholder={field.label}
                  value={field.key === "value" ? form.actionValue : field.key === "couponCode" ? form.actionCoupon : form.actionSku}
                  onChange={e => setForm({
                    ...form,
                    ...(field.key === "value" ? { actionValue: e.target.value } : {}),
                    ...(field.key === "couponCode" ? { actionCoupon: e.target.value } : {}),
                    ...(field.key === "sku" ? { actionSku: e.target.value } : {}),
                  })}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                />
              ))}
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-wine text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-charcoal transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving…" : "Save Rule"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
