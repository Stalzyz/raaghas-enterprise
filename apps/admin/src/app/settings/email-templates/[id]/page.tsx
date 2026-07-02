"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { ArrowLeft, Save, Copy, Check, Eye, Code } from "lucide-react";
import Link from "next/link";

export default function EmailTemplateEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === 'new';
  const router = useRouter();
  const { token, isLoading: authLoading } = useAdminAuth();
  const baseUrl = `${API_BASE}/api/v1`;
  const [error, setError] = useState<string | null>(null);
  
  const [template, setTemplate] = useState({
    name: "",
    type: "CUSTOM",
    subject: "",
    body: "",
    isActive: true
  });
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"code" | "preview">("code");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isNew && token) fetchTemplate();
    if (!isNew && !token) {
      setError('Session expired. Please log in again.');
      setLoading(false);
    }
  }, [id, token, authLoading]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`${baseUrl}/notifications/templates/${id}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (res.status === 401) {
        setError('Session expired. Please log out and log back in.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setTemplate(data);
    } catch (error) {
      console.error("Failed to load template", error);
      setError('Failed to load template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (isNew) {
        await fetch(`${baseUrl}/notifications/templates`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(template)
        });
      } else {
        await fetch(`${baseUrl}/notifications/templates/${id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(template)
        });
      }
      router.push('/settings/email-templates');
      router.refresh();
    } catch (error) {
      console.error("Failed to save template", error);
      alert("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const copyVar = (v: string) => {
    navigator.clipboard.writeText(`{{${v}}}`);
    setCopied(v);
    setTimeout(() => setCopied(null), 2000);
  };

  const getAvailableVars = () => {
    switch (template.type) {
      case 'ORDER_PLACED':
        return ['buyerName', 'orderId', 'shortOrderId', 'amount', 'itemsHtml'];
      case 'INVOICE':
        return ['buyerName', 'invoiceNumber', 'amount'];
      case 'PAYMENT_FAILED':
        return ['buyerName', 'orderId', 'shortOrderId', 'amount'];
      default:
        return ['buyerName', 'orderId', 'amount', 'itemsHtml'];
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading editor...</div>;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link href="/settings/email-templates" className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-charcoal flex items-center gap-2">
              {isNew ? 'New Template' : 'Edit Template'}
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-mono tracking-wider">
                {template.type}
              </span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer mr-4">
            <input 
              type="checkbox" 
              checked={template.isActive} 
              onChange={(e) => setTemplate({ ...template, isActive: e.target.checked })}
              className="accent-wine w-4 h-4 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2 bg-wine text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm hover:shadow-md hover:bg-wine/90 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : <><Save size={16} /> Save Template</>}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="p-6 max-w-4xl mx-auto w-full flex-1 flex flex-col gap-6">
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Template Name</label>
                <input 
                  type="text" 
                  value={template.name}
                  onChange={e => setTemplate({...template, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-wine focus:ring-1 focus:ring-wine bg-white"
                  placeholder="e.g. Order Confirmation (Diwali)"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Trigger Type (System Code)</label>
                <input 
                  type="text" 
                  value={template.type}
                  onChange={e => setTemplate({...template, type: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-wine focus:ring-1 focus:ring-wine bg-white font-mono uppercase"
                  placeholder="ORDER_PLACED"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Subject Line</label>
              <input 
                type="text" 
                value={template.subject}
                onChange={e => setTemplate({...template, subject: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-wine focus:ring-1 focus:ring-wine bg-white shadow-sm"
                placeholder="Order Confirmed: #{{shortOrderId}}"
              />
            </div>

            <div className="flex-1 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email HTML Body</label>
                <div className="flex bg-gray-200 rounded-lg p-1">
                  <button 
                    onClick={() => setViewMode('code')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition ${viewMode === 'code' ? 'bg-white shadow-sm text-charcoal' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Code size={14} /> Code
                  </button>
                  <button 
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition ${viewMode === 'preview' ? 'bg-white shadow-sm text-charcoal' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Eye size={14} /> Preview
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm relative">
                {viewMode === 'code' ? (
                  <textarea 
                    value={template.body}
                    onChange={e => setTemplate({...template, body: e.target.value})}
                    className="w-full h-full p-4 text-sm font-mono bg-[#1E1E1E] text-[#D4D4D4] focus:outline-none resize-none leading-relaxed"
                    placeholder="<div>Hello {{buyerName}}...</div>"
                    spellCheck="false"
                  />
                ) : (
                  <div className="w-full h-full overflow-y-auto bg-gray-50 p-8 flex justify-center">
                    {/* Simulated Email Client View */}
                    <div className="bg-white shadow-xl rounded-lg overflow-hidden w-full max-w-[600px] border border-gray-100 min-h-[400px]">
                      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                        <span className="text-[10px] text-gray-500 font-medium ml-2">Inbox Preview</span>
                      </div>
                      <div className="p-4 border-b border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Subject:</div>
                        <div className="text-sm font-bold text-charcoal">{template.subject || "(No Subject)"}</div>
                      </div>
                      <div 
                        className="p-4"
                        dangerouslySetInnerHTML={{ __html: template.body || "<div style='color:#999;text-align:center;padding:40px;'>Empty template</div>" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Sidebar (Variables) */}
        <div className="w-72 bg-white border-l border-gray-200 p-6 overflow-y-auto shrink-0 shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-2">Available Variables</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Click a variable to copy it, then paste it into your subject or body.</p>
          </div>
          
          <div className="space-y-2">
            {getAvailableVars().map(v => (
              <button 
                key={v}
                onClick={() => copyVar(v)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-wine/30 hover:bg-wine/5 group transition text-left"
              >
                <code className="text-xs font-bold text-wine group-hover:text-wine bg-wine/5 px-2 py-1 rounded">
                  {`{{${v}}}`}
                </code>
                {copied === v ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-gray-300 group-hover:text-wine opacity-0 group-hover:opacity-100 transition" />}
              </button>
            ))}
          </div>
          
          <div className="mt-8 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <h4 className="text-xs font-bold text-blue-800 mb-2">Bulletproof Fallback</h4>
            <p className="text-xs text-blue-600/80 leading-relaxed">
              If a template is disabled or deleted, the system automatically falls back to the default hardcoded HTML.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
