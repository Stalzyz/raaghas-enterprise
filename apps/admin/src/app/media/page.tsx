"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect, useRef } from "react";
import { Upload, FolderPlus, Grid, List, Search, MoreVertical, FileIcon, ImageIcon, FilmIcon, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function MediaManager() {
  const { token } = useAdminAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchMedia();
    } else {
      const timer = setTimeout(() => {
        if (!token) setIsLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [token]);

  const fetchMedia = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/cms/media`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await res.json();
      setMediaItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch media:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const baseUrl = API_BASE;
    
    try {
      // Parallel upload for better speed, but limited to 5 at a time to avoid socket exhaustion
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return fetch(`${baseUrl}/cms/media/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
          credentials: 'include'
        });
      });

      await Promise.all(uploadPromises);
      fetchMedia();
    } catch (err) {
      console.error("Bulk upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(i => i.id));
  };

  const copyLinks = () => {
    const links = mediaItems.filter(i => selectedIds.includes(i.id)).map(i => i.url).join("\n");
    navigator.clipboard.writeText(links);
    alert(`${selectedIds.length} links copied to clipboard!`);
  };

  const exportToCSV = () => {
    const selected = mediaItems.filter(i => selectedIds.includes(i.id));
    const csvString = "Filename,URL\n" + selected.map(i => `"${i.filename}","${i.url}"`).join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `raaghas_media_links_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/cms/media/${id}`, {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      if (res.ok) {
        fetchMedia();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Delete failed:", res.status, errorData);
        alert(`Delete failed (${res.status}): ${errorData.message || 'Server error or permission denied.'}`);
      }
    } catch (err) {
      console.error("Delete network failure:", err);
      alert("Network error. Please check your connection.");
    }
  };

  const deleteSelected = async () => {
    if (!confirm(`Permanently delete ${selectedIds.length} assets? This cannot be undone.`)) return;

    setIsLoading(true);
    const baseUrl = API_BASE;
    
    try {
      // Process deletions in parallel
      await Promise.all(selectedIds.map(id => 
        fetch(`${baseUrl}/cms/media/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include'
        })
      ));
      
      setSelectedIds([]);
      fetchMedia();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert("Some assets could not be deleted.");
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = Array.isArray(mediaItems) ? mediaItems.filter(item => 
    (item.filename || "").toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Media Manager</h2>
          <p className="text-gray-500 font-medium font-sans">Upload and organize all your brand assets here.</p>
        </div>
        <div className="flex gap-4">
           <input 
             type="file" 
             className="hidden" 
             ref={fileInputRef} 
             onChange={handleUpload}
             accept="image/*,video/*"
             multiple
           />
           <button 
             onClick={() => fileInputRef.current?.click()}
             disabled={isUploading}
             className="flex items-center gap-2 px-6 py-2 bg-wine text-ivory rounded-lg text-sm font-bold shadow-lg shadow-wine/20 hover:bg-wine-dark transition-all disabled:opacity-50"
           >
              {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              {isUploading ? "Uploading..." : "Bulk Upload Assets"}
           </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-4 justify-between items-center">
        <div className="relative flex-1 max-w-md">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
           <input 
             type="text" 
             placeholder="Search assets..." 
             className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:border-wine transition-colors" 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-wine/5 px-4 py-1.5 rounded-full border border-wine/10 animate-in fade-in slide-in-from-top-2">
             <span className="text-[10px] font-bold text-wine uppercase tracking-widest">{selectedIds.length} Selected</span>
             <div className="h-4 w-px bg-wine/20 mx-2" />
             <button onClick={copyLinks} className="text-[10px] font-bold text-wine hover:underline uppercase tracking-widest">Copy Links</button>
             <button onClick={exportToCSV} className="text-[10px] font-bold text-wine hover:underline uppercase tracking-widest">Export CSV</button>
             <div className="h-4 w-px bg-wine/20 mx-2" />
             <button onClick={deleteSelected} className="text-[10px] font-bold text-red-600 hover:underline uppercase tracking-widest">Delete Selected</button>
          </div>
        )}
        
        <div className="flex items-center gap-2 border-l border-gray-200 pl-6 ml-auto">
           <button 
             onClick={selectAll}
             className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-charcoal hover:bg-gray-100 rounded-lg transition-all"
           >
             {selectedIds.length === filtered.length ? "Deselect All" : "Select All"}
           </button>
           <div className="w-px h-6 bg-gray-100 mx-2" />
           <button 
             onClick={() => setViewMode("grid")}
             className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-wine/10 text-wine" : "text-gray-400 hover:bg-gray-100"}`}
           >
             <Grid size={18} />
           </button>
           <button 
             onClick={() => setViewMode("list")}
             className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-wine/10 text-wine" : "text-gray-400 hover:bg-gray-100"}`}
           >
             <List size={18} />
           </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-wine" size={40} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-xl border-2 border-dashed border-gray-100">
           <ImageIcon size={48} className="mx-auto text-gray-200 mb-4" />
           <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No assets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {filtered.map((item) => (
            <div 
              key={item.id} 
              onClick={() => toggleSelect(item.id)}
              className={`group bg-white rounded-xl border transition-all cursor-pointer relative overflow-hidden ${selectedIds.includes(item.id) ? 'border-wine ring-2 ring-wine/20 shadow-xl' : 'border-gray-200 hover:shadow-xl hover:border-wine/20'}`}
            >
              <div className="aspect-square bg-gray-50 relative flex items-center justify-center border-b border-gray-100 overflow-hidden">
                 {item.type?.toLowerCase().includes("image") ? (
                   <img src={item.url?.startsWith('http') ? item.url : `${(`${API_BASE}/api/v1`).replace('/api/v1', '')}${item.url}`} alt={item.filename} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                 ) : (
                   <div className="flex flex-col items-center gap-2">
                     <FilmIcon className="text-gray-300" size={40} />
                     <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Video Asset</span>
                   </div>
                 )}
                 
                 {/* Selection Checkbox */}
                 <div className={`absolute top-2 left-2 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-wine border-wine text-white' : 'bg-white/80 border-gray-300'}`}>
                    {selectedIds.includes(item.id) && <CheckCircle2 size={14} />}
                 </div>

                 {/* Quick Actions Overlay */}
                 <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.filename); }}
                      className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                    >
                       <Trash2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); window.open(item.url, '_blank'); }}
                      className="p-2 bg-white text-charcoal rounded-lg hover:bg-wine hover:text-white transition-colors"
                    >
                       <Search size={16} />
                    </button>
                 </div>
              </div>
              <div className="p-3">
                 <p className="text-[10px] font-bold truncate text-gray-700">{item.filename}</p>
                 <div className="flex justify-between items-center mt-1">
                   <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{Math.round((item.size || 0) / 1024)} KB</span>
                   <span className="text-[9px] text-gray-300 font-medium">{new Date(item.createdAt).toLocaleDateString()}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
