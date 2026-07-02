"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { Plus, Search, MoreVertical, ExternalLink, Trash2, Edit2, FileText, Globe, Lock, Sparkles } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";

export default function PagesManager() {
  const { token } = useAdminAuth();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (token) fetchPages();
  }, [token]);

  async function fetchPages() {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/cms/pages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setPages(data);
      } else {
        setPages([]);
      }
    } catch (err) {
      console.error("Failed to fetch pages", err);
    } finally {
      setLoading(false);
    }
  }

  async function deletePage(id: string) {
    if (!confirm("Are you sure you want to delete this page?")) return;
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/cms/pages/${id}`, { 
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchPages();
    } catch (err) {
      console.error("Failed to delete page", err);
    }
  }

  async function seedPolicies() {
    if (!confirm("This will generate or reset standard policy pages (Terms, Privacy, Returns). Proceed?")) return;
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/cms/pages/seed-policies`, { 
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Standard policies generated successfully!");
        fetchPages();
      } else {
        const error = await res.json();
        alert(`Failed to generate policies: ${error.message || res.statusText}`);
      }
    } catch (err: any) {
      console.error("Failed to seed policies", err);
      alert(`An error occurred: ${err.message}`);
    }
  }

  const filteredPages = Array.isArray(pages) ? pages.filter(p => 
    (p.title || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.handle || "").toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-charcoal">Pages</h1>
          <p className="text-sm text-gray-500">Manage policies, landing pages, and custom content corridors.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={seedPolicies}
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Sparkles size={18} className="text-wine" />
            Generate Policies
          </button>
          <Link 
            href="/cms/pages/new" 
            className="bg-wine text-ivory px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-bold uppercase tracking-widest shadow-lg shadow-wine/20 hover:scale-105 transition-all"
          >
            <Plus size={18} />
            Create New Page
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search by title or URL slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-wine/20 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 border-b border-gray-50">
                <th className="px-8 py-4">Page Title & Slug</th>
                <th className="px-8 py-4">Type</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Last Updated</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic">Loading pages...</td>
                </tr>
              ) : filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic">No pages found. Start by creating your first page!</td>
                </tr>
              ) : filteredPages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-beige flex items-center justify-center text-wine">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-charcoal">{page.title}</p>
                        <p className="text-xs text-gray-400 font-mono">/pages/{page.handle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {page.type}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit ${
                      page.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {page.status === 'PUBLISHED' ? <Globe size={10} /> : <Lock size={10} />}
                      {page.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs text-gray-400">
                    {new Date(page.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={`https://raaghas.in/pages/${page.handle}`} 
                        target="_blank" 
                        className="p-2 text-gray-400 hover:text-wine hover:bg-wine/5 rounded-lg transition-all"
                        title="View Live"
                      >
                        <ExternalLink size={18} />
                      </a>
                      <Link 
                        href={`/cms/pages/${page.handle}`}
                        className="p-2 text-gray-400 hover:text-wine hover:bg-wine/5 rounded-lg transition-all"
                        title="Edit Page"
                      >
                        <Edit2 size={18} />
                      </Link>
                      <button 
                        onClick={() => deletePage(page.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
