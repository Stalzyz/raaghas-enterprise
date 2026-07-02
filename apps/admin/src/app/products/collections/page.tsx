"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { 
  Search, 
  Plus, 
  MoreVertical, 
  LayoutGrid, 
  Package, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Image as ImageIcon,
  X,
  Trash2,
  Edit2
} from "lucide-react";
import Link from "next/link";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function CollectionsPage() {
  const { token } = useAdminAuth();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCollection, setEditingCollection] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    handle: "",
    description: "",
    image: ""
  });

  useEffect(() => {
    if (token) loadCollections();
  }, [token]);

  async function loadCollections() {
    setLoading(true);
    try {
      const apiBase = (API_BASE).replace(/\/api\/v1\/?$/, '') + '/api/v1';
      const res = await fetch(`${apiBase}/products/collections?adminMode=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCollections(Array.isArray(data) ? data : []);
      } else {
        setCollections([]);
      }
    } catch (err) {
      console.error("Failed to load collections:", err);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }

  const realCollections = collections.filter(c => c && !c.id?.startsWith('type-'));

  const openModal = (collection?: any) => {
    if (collection) {
      setEditingCollection(collection);
      setFormData({
        title: collection.title,
        handle: collection.handle,
        description: collection.description || "",
        image: collection.image || ""
      });
    } else {
      setEditingCollection(null);
      setFormData({ title: "", handle: "", description: "", image: "" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const apiBase = (API_BASE).replace(/\/api\/v1\/?$/, '') + '/api/v1';
      const url = editingCollection 
        ? `${apiBase}/products/collections/${editingCollection.id}`
        : `${apiBase}/products/collections`;
      
      const res = await fetch(url, {
        method: editingCollection ? 'PATCH' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        loadCollections();
      }
    } catch (err) {
      alert("Failed to save collection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the "${title}" collection?`)) return;

    try {
      const apiBase = (API_BASE).replace(/\/api\/v1\/?$/, '') + '/api/v1';
      const res = await fetch(`${apiBase}/products/collections/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) loadCollections();
    } catch (err) {
      alert("Failed to delete collection.");
    }
  };

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Collections</h2>
          <p className="text-gray-500 font-medium font-sans text-sm mt-1">Group products into categories for easier navigation.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-6 py-2.5 bg-wine text-ivory rounded-xl text-sm font-bold shadow-lg shadow-wine/20 hover:bg-wine-dark transition-all"
        >
          <Plus size={18} /> Create Collection
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold border-b border-gray-100">
              <th className="px-6 py-4">Collection</th>
              <th className="px-6 py-4">Products</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-xs text-gray-400 font-bold uppercase tracking-widest"><Loader2 className="inline-block animate-spin mr-2" size={16}/> Syncing Collections...</td></tr>
            ) : realCollections.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">No collections found. Start by creating one.</td></tr>
            ) : realCollections.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-beige rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100">
                       {c.image ? <img src={c.image} className="w-full h-full object-cover" /> : <LayoutGrid className="text-wine/40" size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-charcoal">{c.title}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-widest">/{c.handle}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-600">
                   {c._count?.products || 0} Products
                </td>
                <td className="px-6 py-4">
                   <span className="text-[9px] uppercase font-bold px-2 py-1 rounded bg-green-100 text-green-700">Active</span>
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/products/collections/${c.id}`}
                        className="p-2 hover:bg-wine/5 rounded-lg text-gray-400 hover:text-wine transition-colors"
                        title="Manage Products"
                      >
                        <Package size={16} />
                      </Link>
                      <button 
                        onClick={() => openModal(c)}
                        className="p-2 hover:bg-wine/5 rounded-lg text-gray-400 hover:text-wine transition-colors"
                        title="Edit Collection"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id, c.title)}
                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Collection"
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Collection Modal ─────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <div>
                    <h3 className="text-lg font-bold text-charcoal">{editingCollection ? "Edit Collection" : "New Collection"}</h3>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Collection Details</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                 <div className="space-y-4">
                    <div>
                       <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Collection Title</label>
                       <input 
                         required
                         type="text"
                         value={formData.title}
                         onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                         className="w-full px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-wine/30 transition-all outline-none"
                         placeholder="e.g. Summer Silk"
                       />
                    </div>

                    <div>
                       <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Handle (Optional)</label>
                       <input 
                         type="text"
                         value={formData.handle}
                         onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                         className="w-full px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-wine/30 transition-all outline-none"
                         placeholder="summer-silk"
                       />
                    </div>

                    <div>
                       <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Description</label>
                       <textarea 
                         rows={3}
                         value={formData.description}
                         onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                         className="w-full px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-wine/30 transition-all outline-none"
                       />
                    </div>

                    <div>
                       <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Banner Image URL</label>
                       <input 
                         type="text"
                         value={formData.image}
                         onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                         className="w-full px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-wine/30 transition-all outline-none"
                         placeholder="https://..."
                       />
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-gray-100 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-all"
                    >
                       Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 px-6 py-3 bg-wine text-ivory rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-wine/20 hover:bg-wine-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                       {isSaving && <Loader2 className="animate-spin" size={14} />}
                       {editingCollection ? "Update" : "Create"} Collection
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
