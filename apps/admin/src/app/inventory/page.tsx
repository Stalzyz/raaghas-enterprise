"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { 
  BarChart3, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Save, 
  History,
  Search,
  Loader2,
  Settings2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function InventoryDashboard() {
  const { token } = useAdminAuth();
  const [radar, setRadar] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get("search");
      if (q) setSearch(q);
    }
  }, []);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [radarRes, gridRes] = await Promise.all([
        fetch(`${API_BASE}/inventory/radar`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/inventory/grid`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const radarData = await radarRes.json();
      const gridData = await gridRes.json();
      
      setRadar(radarData);
      setVariants(Array.isArray(gridData) ? gridData : []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustStock = async (variantId: string, change: number) => {
    try {
      const res = await fetch(`${API_BASE}/inventory/adjust`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ variantId, change, type: 'ADJUSTMENT', notes: 'Manual adjustment from Grid' })
      });
      if (!res.ok) throw new Error("Failed to adjust stock");
      
      // Update local state
      setVariants(prev => prev.map(v => 
        v.id === variantId ? { ...v, inventory: v.inventory + change } : v
      ));
    } catch (error) {
       alert("Error adjusting stock");
    }
  };

  const filteredVariants = variants.filter(v => 
    v.sku?.toLowerCase().includes(search.toLowerCase()) || 
    v.product?.title?.toLowerCase().includes(search.toLowerCase()) ||
    v.productId?.toLowerCase() === search.toLowerCase() ||
    v.product?.id?.toLowerCase() === search.toLowerCase()
  );

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
         <Loader2 className="animate-spin text-wine" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      
      {/* ─── THE RADAR: HEALTH OVERVIEW ─── */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-charcoal">Inventory Radar</h2>
            <p className="text-gray-500 font-medium font-sans text-sm">Real-time stock health orchestration.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-wine hover:border-wine transition-all">
             <History size={16} /> Movement Logs
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {/* Total Health Card */}
           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-gray-50 rounded-lg"><Package size={20} className="text-charcoal" /></div>
                 <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">HEALTHY</span>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Stocked SKUs</p>
              <h3 className="text-3xl font-bold text-charcoal">{radar?.summary.healthy}</h3>
           </div>

           {/* Low Stock Card */}
           <div className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all ${radar?.summary.low > 0 ? "ring-2 ring-orange-400/20 border-orange-100" : ""}`}>
              <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-orange-50 rounded-lg"><AlertTriangle size={20} className="text-orange-500" /></div>
                 {radar?.summary.low > 0 && <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-2 h-2 bg-orange-500 rounded-full" />}
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Low Stock Alerts</p>
              <h3 className="text-3xl font-bold text-charcoal">{radar?.summary.low}</h3>
           </div>

           {/* Critical Card */}
           <div className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all ${radar?.summary.critical > 0 ? "ring-2 ring-red-400/20 border-red-100" : ""}`}>
              <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle size={20} className="text-red-500" /></div>
                 {radar?.summary.critical > 0 && <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 bg-red-500 rounded-full" />}
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Out of Stock</p>
              <h3 className="text-3xl font-bold text-charcoal">{radar?.summary.critical}</h3>
           </div>

           {/* Velocity Card */}
           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-blue-50 rounded-lg"><BarChart3 size={20} className="text-blue-500" /></div>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Stock Velocity</p>
              <h3 className="text-3xl font-bold text-charcoal">High</h3>
              <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Across 12 Categories</p>
           </div>
        </div>
      </div>

      {/* ─── THE GRID: BULK INVENTORY ─── */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
               <h3 className="text-xl font-bold text-charcoal">The Grid</h3>
               <p className="text-sm text-gray-400 font-medium font-sans">High-speed bulk stock synchronization.</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search SKU or Product..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-wine transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
               </div>
               <button className="p-2.5 bg-gray-50 text-gray-400 hover:text-charcoal transition-all rounded-xl border border-gray-100">
                  <Settings2 size={20} />
               </button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-gray-50/50">
                     <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Product & SKU</th>
                     <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">B2C Available</th>
                     <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">B2B Reserved</th>
                     <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Balance</th>
                     <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50 font-sans">
                  {filteredVariants.map((v) => {
                    const reservedCount = v.reservations.reduce((sum: number, r: any) => sum + r.quantity, 0);
                    const available = v.inventory - reservedCount;
                    const isLow = available <= v.product.lowStockThreshold;
                    const isOut = available <= 0;

                    return (
                      <tr key={v.id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                             <p className="text-sm font-bold text-charcoal">{v.product.title}</p>
                             {[v.option1Value, v.option2Value, v.option3Value].filter(Boolean).length > 0 && (
                               <span className="text-[10px] bg-wine/10 text-wine px-2 py-0.5 rounded-full font-bold">
                                 {[v.option1Value, v.option2Value, v.option3Value].filter(Boolean).join(' / ')}
                               </span>
                             )}
                           </div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{v.sku || 'No SKU'}</p>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <span className={`text-lg font-bold font-serif ${isOut ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-charcoal'}`}>
                                 {available}
                              </span>
                              {isLow && (
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${isOut ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                                   {isOut ? 'Out' : 'Low'}
                                </span>
                              )}
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-sm font-medium text-gray-400">{reservedCount}</span>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-sm font-bold text-charcoal">{v.inventory}</span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleAdjustStock(v.id, -1)}
                                className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
                              >
                                <Minus size={16} />
                              </button>
                              <button 
                                onClick={() => handleAdjustStock(v.id, 1)}
                                className="p-1.5 hover:bg-green-50 hover:text-green-500 rounded-lg transition-all"
                              >
                                <Plus size={16} />
                              </button>
                              <button className="p-1.5 hover:bg-gray-100 hover:text-wine rounded-lg transition-all ml-2">
                                <History size={16} />
                              </button>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>

         {filteredVariants.length === 0 && (
           <div className="p-20 text-center text-gray-400 font-medium">
              No matching SKUs found in the inventory grid.
           </div>
         )}
      </div>

    </div>
  );
}
