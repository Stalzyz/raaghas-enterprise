"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Palette, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Layout, 
  Clock,
  LayoutGrid,
  Zap,
  RefreshCcw,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Preset {
  id: string;
  name: string;
  description: string;
  previewImage: string;
  isActive: boolean;
  config: any;
}

export default function ThemePresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPresets = async () => {
    try {
      const res = await fetch(`${API_BASE}/cms/presets`);
      if (res.ok) {
        const data = await res.json();
        setPresets(data);
      }
    } catch (err) {
      console.error("Failed to fetch presets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const handleApply = async (id: string) => {
    setApplying(id);
    try {
      const res = await fetch(`${API_BASE}/cms/presets/${id}/apply`, {
        method: "POST"
      });
      if (res.ok) {
        setSuccess(id);
        fetchPresets();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      alert("Failed to apply theme.");
    } finally {
      setApplying(null);
    }
  };

  const handleSeed = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cms/presets/seed`, {
        method: "POST"
      });
      if (res.ok) {
        fetchPresets();
      }
    } catch (err) {
      alert("Failed to seed presets.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-wine font-bold uppercase tracking-[0.2em] text-[10px]">
            <Palette size={14} /> Design System
          </div>
          <h1 className="text-3xl font-serif text-charcoal tracking-tight">Designer Presets</h1>
          <p className="text-gray-400 max-w-xl text-sm leading-relaxed">
            Switch your storefront's visual identity instantly. Apply a preset to update your colors, 
            typography, and homepage layout layouts. High-end D2C configurations at your fingertips.
          </p>
        </div>
        
        <button 
          onClick={handleSeed}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-xl text-xs font-bold uppercase tracking-widest text-charcoal hover:bg-gray-50 transition-all shadow-sm active:scale-95"
        >
          <RefreshCcw size={14} className={loading ? "animate-spin" : ""} /> Regenerate Flagships
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-[4/5] bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : presets.length === 0 ? (
        <div className="py-24 text-center space-y-4 bg-white rounded-3xl border border-dashed border-gray-200">
           <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
              <LayoutGrid size={32} />
           </div>
           <div>
             <h3 className="text-lg font-bold text-charcoal">No Presets Found</h3>
             <p className="text-sm text-gray-400">Click Regenerate to populate the flagship designer themes.</p>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {presets.map((preset) => (
             <PresetCard 
               key={preset.id} 
               preset={preset} 
               isApplying={applying === preset.id}
               isSuccess={success === preset.id}
               onApply={() => handleApply(preset.id)}
             />
           ))}
        </div>
      )}

      {/* ─── Pro Tip ────────────────────────────────────────────────────────── */}
      <div className="bg-wine/5 border border-wine/10 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
         <div className="w-12 h-12 bg-wine text-ivory rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-wine/20">
            <Zap size={24} />
         </div>
         <div className="flex-1 text-center md:text-left">
            <h4 className="text-sm font-bold text-wine tracking-tight mb-1">PRO TIP: Custom Campaigns</h4>
            <p className="text-xs text-wine/60 leading-relaxed font-medium">
              A preset is just a starting point. Once applied, you can still use the <strong>Theme Builder</strong> to 
              fine-tune every section, upload new campaign assets, and tweak brand colors for seasonal launches.
            </p>
         </div>
         <Link href="/cms">
           <button className="px-6 py-3 bg-wine text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-charcoal transition-all shadow-md active:scale-95">
             Go to Theme Builder
           </button>
         </Link>
      </div>
    </div>
  );
}

function PresetCard({ preset, isApplying, isSuccess, onApply }: { preset: Preset, isApplying: boolean, isSuccess: boolean, onApply: () => void }) {
  const config = preset.config || {};
  const colors = config.theme || {};

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative bg-white rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${preset.isActive ? 'border-wine shadow-2xl scale-[1.02]' : 'border-gray-50 hover:border-gray-200'}`}
    >
      {/* Preview Image Area */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-50 flex items-center justify-center">
        {preset.previewImage ? (
          <img 
            src={preset.previewImage} 
            onError={(e) => {
              (e.target as any).style.display = 'none';
              (e.target as any).nextSibling.style.display = 'flex';
            }}
            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" 
            alt={preset.name}
          />
        ) : null}
        
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 transition-all duration-700 ${preset.previewImage ? 'hidden' : 'flex'}`} style={{ backgroundColor: colors.bg || '#FDFBF7' }}>
            <div className="p-6 rounded-[2rem] bg-white shadow-xl ring-1 ring-black/5 flex items-center justify-center">
               <Palette size={48} style={{ color: colors.primaryColor }} />
            </div>
            <div className="text-center px-6">
               <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: colors.primaryColor }}>{preset.name}</p>
               <p className="text-[8px] font-medium text-gray-400 uppercase tracking-widest mt-1">Abstract Concept</p>
            </div>
        </div>
        
        {/* Overlay Badges */}
        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
               <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: colors.primaryColor }} />
               <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: colors.secondaryColor }} />
            </div>
            <div className="flex items-center gap-2 text-white/60 text-[10px] uppercase font-bold tracking-widest">
               <Layout size={12} /> {config.sections?.length || 0} Sections
            </div>
          </div>
        </div>

        {preset.isActive && (
          <div className="absolute top-6 right-6 bg-wine text-ivory px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-xl ring-4 ring-white/10 backdrop-blur-md">
            <CheckCircle2 size={12} /> Currently Active
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-8 space-y-4">
        <div>
          <h3 className="text-xl font-serif text-charcoal mb-2">{preset.name}</h3>
          <p className="text-xs text-gray-400 leading-relaxed font-medium line-clamp-2">{preset.description}</p>
        </div>

        <div className="flex items-center gap-4 py-2 border-y border-gray-50">
           <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-gray-300 tracking-widest mb-1">Typography</p>
              <div className="flex items-center gap-2 text-[11px] font-bold text-charcoal">
                <span className={colors.fontHeading === 'serif' ? 'font-serif' : 'font-sans'}>{colors.fontHeading}</span>
                <span className="text-gray-200">/</span>
                <span className="font-sans">{colors.fontBody}</span>
              </div>
           </div>
           <div className="w-px h-8 bg-gray-50" />
           <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-gray-300 tracking-widest mb-1">Radius</p>
              <p className="text-[11px] font-bold text-charcoal">{colors.buttonRadius}</p>
           </div>
        </div>

        <button 
          onClick={onApply}
          disabled={preset.isActive || isApplying}
          className={`w-full py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
            preset.isActive ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100' :
            isSuccess ? 'bg-green-500 text-white shadow-green-200' :
            isApplying ? 'bg-charcoal text-white animate-pulse' :
            'bg-charcoal text-white hover:bg-wine shadow-charcoal/20'
          }`}
        >
          {isSuccess ? <><CheckCircle2 size={14} /> Applied Ready</> :
           isApplying ? 'Switching Theme...' :
           preset.isActive ? 'Live on Store' : 
           <><ArrowRight size={14} /> Apply Version</>}
        </button>
      </div>

      {/* Quick View Link */}
      <div className="absolute top-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity">
         <button className="p-3 bg-white/90 backdrop-blur-md rounded-2xl text-charcoal shadow-xl hover:scale-110 transition-transform">
            <Eye size={18} />
         </button>
      </div>
    </motion.div>
  );
}
