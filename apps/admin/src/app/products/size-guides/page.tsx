"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { Plus, Trash, Edit, Check, X } from "lucide-react";

export default function SizeGuidesPage() {
  const { token } = useAdminAuth();
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [htmlContent, setHtmlContent] = useState("");

  const apiBase = API_BASE;

  const fetchGuides = async () => {
    try {
      const res = await fetch(`${apiBase}/size-guides`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGuides(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchGuides();
  }, [token]);

  const handleSave = async (id?: string) => {
    if (!name || !htmlContent) return alert("Name and Content are required");
    try {
      const res = await fetch(`${apiBase}/size-guides${id ? `/${id}` : ''}`, {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, htmlContent })
      });
      if (res.ok) {
        setIsCreating(false);
        setIsEditing(null);
        setName("");
        setHtmlContent("");
        fetchGuides();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to save");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving size guide");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this size guide?")) return;
    try {
      const res = await fetch(`${apiBase}/size-guides/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchGuides();
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (guide: any) => {
    setIsEditing(guide.id);
    setName(guide.name);
    setHtmlContent(guide.htmlContent);
    setIsCreating(false);
  };

  const startCreate = () => {
    setIsCreating(true);
    setIsEditing(null);
    setName("");
    setHtmlContent("");
  };

  const cancel = () => {
    setIsCreating(false);
    setIsEditing(null);
    setName("");
    setHtmlContent("");
  };

  return (
    <div className="p-8 space-y-8 bg-[#FDFBF7] min-h-screen">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal uppercase tracking-tight">Size Guides</h1>
          <p className="text-sm text-gray-500 mt-2">Manage HTML size charts that can be assigned to products.</p>
        </div>
        <button onClick={startCreate} className="bg-wine text-ivory px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
          <Plus size={16} /> New Size Guide
        </button>
      </div>

      {(isCreating || isEditing) && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-serif text-charcoal">{isEditing ? "Edit Size Guide" : "Create Size Guide"}</h2>
            <button onClick={cancel} className="text-gray-400 hover:text-charcoal"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Name (e.g. Kurtis Size Chart)</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-1 focus:ring-wine focus:border-wine"
                placeholder="Kurti Size Chart"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">HTML Content</label>
              <textarea 
                value={htmlContent} 
                onChange={e => setHtmlContent(e.target.value)} 
                className="w-full border border-gray-200 rounded-xl px-4 py-2 h-64 font-mono text-sm focus:ring-1 focus:ring-wine focus:border-wine"
                placeholder="<table>...</table>"
              />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button onClick={cancel} className="px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-gray-200 text-gray-500">Cancel</button>
            <button onClick={() => handleSave(isEditing || undefined)} className="px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-wine text-ivory flex items-center gap-2">
              <Check size={16} /> Save Guide
            </button>
          </div>
        </div>
      )}

      {!loading && !isCreating && !isEditing && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm divide-y divide-gray-50">
          {guides.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No size guides found. Create one above!</div>
          ) : (
            guides.map(guide => (
              <div key={guide.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <h3 className="font-bold text-charcoal">{guide.name}</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Updated {new Date(guide.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => startEdit(guide)} className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-charcoal hover:bg-gray-100"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(guide.id)} className="p-2 bg-red-50 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100"><Trash size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
