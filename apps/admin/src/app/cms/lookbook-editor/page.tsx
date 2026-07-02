"use client";

import { API_BASE } from "@/lib/api";

import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Crosshair, Save, AlertCircle, CheckCircle2 } from "lucide-react";

interface Hotspot {
  id: string;
  x: number;
  y: number;
  productId: string;
}

interface Scene {
  id: string;
  title: string;
  image: string;
  hotspots: Hotspot[];
}

export default function LookbookEditor() {
  const [scenes, setScenes] = useState<Scene[]>([{
    id: "scene-1",
    title: "Intro Scene",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=2000",
    hotspots: []
  }]);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  const activeScene = scenes[activeSceneIndex];

  const imageRef = useRef<HTMLDivElement>(null);

  const addScene = () => {
    setScenes([...scenes, {
      id: `scene-${Date.now()}`,
      title: "New Story Scene",
      image: "https://images.unsplash.com/photo-1612422656768-d5e4ec31fac0?q=80&w=2000",
      hotspots: []
    }]);
    setActiveSceneIndex(scenes.length);
  };

  const removeScene = (index: number) => {
    if (scenes.length === 1) return;
    const newScenes = scenes.filter((_, i) => i !== index);
    setScenes(newScenes);
    setActiveSceneIndex(Math.max(0, index - 1));
  };

  const updateActiveScene = (data: Partial<Scene>) => {
    setScenes(scenes.map((s, i) => i === activeSceneIndex ? { ...s, ...data } : s));
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newHotspot: Hotspot = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      productId: "",
    };

    updateActiveScene({ hotspots: [...activeScene.hotspots, newHotspot] });
  };

  const updateHotspotProduct = (id: string, productId: string) => {
    const newHotspots = activeScene.hotspots.map(h => h.id === id ? { ...h, productId } : h);
    updateActiveScene({ hotspots: newHotspots });
  };

  const removeHotspot = (id: string) => {
    const newHotspots = activeScene.hotspots.filter(h => h.id !== id);
    updateActiveScene({ hotspots: newHotspots });
  };

  useEffect(() => {
    fetch(`${API_BASE}/products`)
      .then(res => res.json())
      .then(data => {
        if (data.items) {
          setProducts(data.items);
        } else if (Array.isArray(data)) {
          setProducts(data);
        }
      })
      .catch(err => console.error("Failed to load products", err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const pageRes = await fetch(`${API_BASE}/cms/pages/lookbooks`);
      let page;
      if (!pageRes.ok) {
        const createRes = await fetch(`${API_BASE}/cms/pages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Lookbooks", handle: "lookbooks", isPublished: true })
        });
        page = await createRes.json();
      } else {
        page = await pageRes.json();
      }

      // Reformat scenes for storefront compatibility (pre-calculate names/prices)
      const formattedScenes = scenes.map(s => ({
        ...s,
        hotspots: s.hotspots.map(h => {
          const p = products.find(prod => prod.id === h.productId);
          return {
            ...h,
            productName: p?.title || "Unknown Product",
            price: p?.price || 0,
            handle: p?.handle || "",
            image: p?.images?.[0]?.url || ""
          };
        })
      }));

      const content = { scenes: formattedScenes };
      
      const updateRes = await fetch(`${API_BASE}/cms/pages/${page.id}/sections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ type: "LOOKBOOK", order: 0, content }])
      });

      if (!updateRes.ok) throw new Error("Failed to save Lookbook Story");

      setMessage({ type: 'success', text: "Editorial Story saved successfully." });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: "Failed to save the lookbook." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Editorial Story Editor</h2>
          <p className="text-gray-500 font-medium font-sans text-sm">Create immersive, multi-scene shoppable lookbooks for your brand.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-wine text-ivory px-6 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-charcoal transition-all disabled:opacity-50 shadow-xl">
          <Save size={16} /> {saving ? "Saving Story..." : "Publish Story"}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="font-bold">{message.text}</p>
        </div>
      )}

      {/* Scene Navigator */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
         {scenes.map((scene, index) => (
           <button 
            key={scene.id}
            onClick={() => setActiveSceneIndex(index)}
            className={`relative min-w-[200px] h-32 rounded-xl overflow-hidden border-2 transition-all ${index === activeSceneIndex ? 'border-wine ring-4 ring-wine/10' : 'border-transparent opacity-60 hover:opacity-100'}`}
           >
              <img src={scene.image} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                 <p className="text-[10px] text-white font-bold uppercase tracking-widest truncate">{scene.title}</p>
              </div>
              {scenes.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); removeScene(index); }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 hover:scale-110 transition-all group-hover:opacity-100"
                >
                   <Trash2 size={12} />
                </button>
              )}
           </button>
         ))}
         <button 
          onClick={addScene}
          className="min-w-[200px] h-32 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-wine hover:text-wine transition-all"
         >
            <Plus size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Add Scene</span>
         </button>
      </div>

      {/* Editor Controls (Title & Image) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-sm">
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">Scene Title</label>
           <input type="text" value={activeScene.title} onChange={e => updateActiveScene({ title: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-wine" />
        </div>
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">Background Image URL</label>
           <input type="text" value={activeScene.image} onChange={e => updateActiveScene({ image: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-wine" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Main Canvas */}
        <div className="lg:col-span-2 space-y-4">
           <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-6 left-6 z-10 bg-wine text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]">
                Active: {activeScene.title}
              </div>
              <div 
                ref={imageRef}
                onClick={handleImageClick}
                className="relative cursor-crosshair overflow-hidden rounded-lg group"
              >
                 <img src={activeScene.image} alt="Lookbook Canvas" className="w-full h-auto" />
                 
                 {/* Hotspots Overlay */}
                 {activeScene.hotspots.map((spot) => (
                   <div 
                    key={spot.id}
                    className="absolute w-8 h-8 -ml-4 -mt-4 bg-charcoal text-white rounded-full flex items-center justify-center shadow-2xl animate-in zoom-in-50 duration-200"
                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                   >
                      <Crosshair size={14} />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-charcoal text-[10px] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        HP-{spot.id.slice(0, 3)}
                      </div>
                   </div>
                 ))}

                 {/* Empty State Instructions */}
                 {activeScene.hotspots.length === 0 && (
                   <div className="absolute inset-0 flex items-center justify-center bg-charcoal/10 pointer-events-none">
                      <div className="bg-white/90 backdrop-blur px-6 py-4 rounded-full flex items-center gap-3 text-charcoal shadow-xl">
                        <Plus size={20} className="text-wine" />
                        <span className="text-xs font-bold uppercase tracking-widest">Click anywhere to start tagging</span>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Tagged Products ({activeScene.hotspots.length})</h3>
              
              {activeScene.hotspots.length === 0 ? (
                <div className="py-12 text-center text-gray-300 space-y-2">
                   <AlertCircle size={32} className="mx-auto" />
                   <p className="text-xs font-medium">No Hotspots Placed</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                   {activeScene.hotspots.map((spot, index) => (
                    <div key={spot.id} className="p-4 bg-gray-50 border border-gray-100 rounded-lg space-y-3">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold bg-charcoal text-white px-2 py-0.5 rounded">Hotspot {index + 1}</span>
                          <button onClick={() => removeHotspot(spot.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                             <Trash2 size={16} />
                          </button>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-400">Search Product</label>
                          <select 
                            className="w-full bg-white border border-gray-200 px-3 py-2 text-xs outline-none focus:border-wine rounded-md"
                            value={spot.productId}
                            onChange={(e) => updateHotspotProduct(spot.id, e.target.value)}
                          >
                             <option value="">Select a product...</option>
                             {products.map(p => (
                               <option key={p.id} value={p.id}>{p.title}</option>
                             ))}
                          </select>
                       </div>
                    </div>
                  ))}
                </div>
              )}
           </div>

           <div className="bg-wine/5 border border-wine/10 p-6 rounded-xl space-y-3 shadow-inner">
              <h4 className="text-xs font-bold text-wine tracking-widest uppercase">Pro Tip</h4>
              <p className="text-xs text-wine/70 leading-relaxed font-medium">Create a "Story" of 3-5 scenes to guide your customer through an editorial journey of your latest collection.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
