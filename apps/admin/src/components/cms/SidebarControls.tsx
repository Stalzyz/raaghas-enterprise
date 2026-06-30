"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, Eye, EyeOff, GripVertical, Trash2, 
  Plus, Settings2, Image as ImageIcon, Layout as LayoutIcon,
  MousePointer2, Palette, Sparkles, Play, Move, Box, Library,
  ShoppingBag, Copy, Check, ChevronDown, ChevronUp, Bot
} from "lucide-react";
import { useState } from "react";

import { MediaUploader } from "./MediaUploader";

interface Section {
  id: string;
  type: string;
  content: Record<string, any>;
  style?: Record<string, any>;
  settings?: Record<string, any>;
  hidden?: boolean;
}

type EditorTab = "content" | "media" | "style" | "animation" | "position";

export function SidebarControls({
  sections = [],
  activeSectionId,
  onSelectSection,
  onUpdateSection,
  onMoveSection,
  onRemoveSection,
  onAddSection,
  palette = [],
  activeTab,
  setActiveTab
}: {
  sections: Section[];
  activeSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onUpdateSection: (id: string, content: any, style?: any, settings?: any, hidden?: boolean) => void;
  onMoveSection: (id: string, dir: "up" | "down") => void;
  onRemoveSection: (id: string) => void;
  onAddSection: (type: string, presetId?: string) => void;
  palette: any[];
  activeTab: "sections" | "media" | "pages" | "navigation" | "theme";
  setActiveTab: (tab: any) => void;
}) {
  const activeSection = Array.isArray(sections) ? sections.find(s => s.id === activeSectionId) : null;
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTab>("content");

  const getSavedTemplates = () => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem('raaghas_saved_sections');
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("CMS: Failed to parse saved templates", e);
      return [];
    }
  };

  const [savedTemplates, setSavedTemplates] = useState<any[]>(getSavedTemplates);

  const deleteSavedTemplate = (tplId: string) => {
    const updated = savedTemplates.filter((t: any) => t.id !== tplId);
    setSavedTemplates(updated);
    localStorage.setItem('raaghas_saved_sections', JSON.stringify(updated));
  };

  return (
    <div className="w-[350px] h-full bg-white border-r border-gray-200 flex flex-col shadow-xl z-20">
      <AnimatePresence mode="wait">
        {!activeSection ? (
          /* STRUCTURE MODE */
          <motion.div
            key="structure"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
               <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner mb-4">
                  {[
                    { id: "sections", label: "Sections", icon: LayoutIcon },
                    { id: "media", label: "Media", icon: ImageIcon },
                    { id: "theme", label: "Theme", icon: Palette },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                        activeTab === tab.id ? "bg-white text-wine shadow-sm" : "text-gray-400 hover:text-charcoal"
                      }`}
                    >
                       <tab.icon size={12} />
                       {tab.label}
                    </button>
                  ))}
               </div>
              <h3 className="text-[10px] font-bold text-charcoal uppercase tracking-[0.2em]">
                {activeTab === 'sections' ? 'Custom Sections' : activeTab === 'media' ? 'Library Assets' : 'Brand Theme'}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {activeTab === 'sections' && (
                <div className="space-y-2">
                  {Array.isArray(sections) && sections.filter(s => s && s.id).map((section, idx) => (
                    <SectionItem 
                      key={section.id} 
                      section={section} 
                      idx={idx}
                      isFirst={idx === 0}
                      isLast={idx === sections.length - 1}
                      onSelect={() => onSelectSection(section.id)}
                      onMove={onMoveSection}
                      onRemove={onRemoveSection}
                      onToggleVisibility={() => onUpdateSection(section.id, section.content, section.style, section.settings, !section.hidden)}
                      palette={palette}
                    />
                  ))}
                </div>
              )}

              {activeTab === 'media' && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                   <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
                      <ImageIcon size={32} />
                   </div>
                   <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest px-8 leading-loose">
                      Manage your global assets here. Use section editors to upload specific images.
                   </p>
                </div>
              )}

              {activeTab === 'theme' && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                   <div className="w-16 h-16 bg-wine/5 rounded-2xl flex items-center justify-center text-wine/30">
                      <Palette size={32} />
                   </div>
                   <p className="text-[10px] uppercase font-bold text-wine tracking-widest px-8 leading-loose">
                      Theme Editor is open in the right drawer.
                   </p>
                   <button 
                    onClick={() => setActiveTab('sections')}
                    className="px-6 py-2 bg-gray-100 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors"
                   >
                     Back to Sections
                   </button>
                </div>
              )}

              <div className="mt-8">
                <div className="flex items-center gap-3 mb-4 px-2">
                   <div className="h-px bg-gray-100 flex-1" />
                   <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">Add New Content</span>
                   <div className="h-px bg-gray-100 flex-1" />
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden ring-1 ring-charcoal/5">
                  <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Section Library</span>
                     <Sparkles size={14} className="text-wine animate-pulse" />
                  </div>
                  <div className="p-2 space-y-1">
                    {/* User Saved Templates */}
                    {savedTemplates.length > 0 && (
                      <div className="mb-4">
                        <div className="px-3 py-2 text-[9px] uppercase font-bold tracking-widest text-wine flex items-center gap-2">
                          <Box size={12} /> My Saved Templates
                        </div>
                         {savedTemplates.map((tpl: any, idx: number) => (
                           <div
                             key={`saved-${idx}`}
                             className="group/tpl w-full flex items-center gap-1 hover:bg-wine/[0.03] rounded-xl transition-all"
                           >
                             <button
                               onClick={() => onAddSection(tpl.type, `saved-${tpl.id}`)}
                               className="flex-1 flex items-center gap-3 p-3 text-left"
                             >
                               <div className="p-2.5 bg-wine/10 text-wine rounded-xl shadow-sm">
                                 <Sparkles size={16} />
                               </div>
                               <div className="flex-1 min-w-0">
                                 <p className="text-[11px] font-bold text-charcoal uppercase tracking-tighter group-hover/tpl:text-wine">{tpl.name}</p>
                                 <p className="text-[9px] text-gray-400 truncate font-medium">Custom Block</p>
                               </div>
                             </button>
                             <button
                               onClick={() => {
                                 if (confirm(`Delete template "${tpl.name}"?`)) deleteSavedTemplate(tpl.id);
                               }}
                               className="p-2 mr-1 text-gray-300 hover:text-red-500 opacity-0 group-hover/tpl:opacity-100 transition-all rounded-lg hover:bg-red-50"
                               title="Delete template"
                             >
                               <Trash2 size={14} />
                             </button>
                           </div>
                         ))}
                      </div>
                    )}

                    {palette.map(p => (
                      <div key={p.type} className="space-y-1">
                        <button
                          onClick={() => onAddSection(p.type)}
                          className="group w-full flex items-center gap-3 p-3 hover:bg-wine/[0.03] rounded-xl text-left transition-all"
                        >
                          <div className="p-2.5 bg-gray-50 text-gray-400 rounded-xl group-hover:bg-wine group-hover:text-white transition-all shadow-sm">
                            {p.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-charcoal uppercase tracking-tighter transition-colors group-hover:text-wine">{p.label}</p>
                            <p className="text-[9px] text-gray-400 truncate font-medium">{p.description || "Add this component"}</p>
                          </div>
                        </button>
                        
                        {p.presets && (
                          <div className="pl-14 pr-2 pb-2 flex flex-wrap gap-2">
                             {p.presets.map((preset: any) => (
                               <button 
                                 key={preset.id}
                                 onClick={() => onAddSection(p.type, preset.id)}
                                 className="px-2 py-1 bg-gray-50 hover:bg-wine hover:text-white text-[9px] font-bold text-gray-400 rounded-md transition-all border border-gray-100"
                               >
                                  + {preset.name}
                               </button>
                             ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-gray-50/50 border-t border-gray-50 text-center">
                     <p className="text-[9px] text-gray-400 italic">More templates coming soon...</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* EDIT MODE */
          <motion.div
            key="edit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <button 
                onClick={() => onSelectSection(null)}
                className="p-2 hover:bg-white rounded-lg transition-colors text-charcoal/60"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Editing Section</h3>
                <p className="text-sm font-bold text-charcoal truncate mt-1">
                  {palette.find(p => p.type === activeSection.type)?.label || activeSection.type}
                </p>
              </div>
            </div>

             <div className="flex border-b border-gray-100 bg-white overflow-x-auto no-scrollbar">
                {(["content", "media", "style", "animation", "position"] as EditorTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveEditorTab(tab)}
                    className={`flex-none px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative ${
                      activeEditorTab === tab ? "text-wine" : "text-gray-400 hover:text-charcoal"
                    }`}
                  >
                    {tab}
                    {activeEditorTab === tab && (
                      <motion.div 
                         layoutId="activeTab"
                         className="absolute bottom-0 left-0 right-0 h-0.5 bg-wine" 
                      />
                    )}
                  </button>
                ))}
             </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
               <div className="space-y-6">
                  <EditorContent 
                    section={activeSection} 
                    activeTab={activeEditorTab}
                    onUpdate={(c, s, st) => onUpdateSection(activeSection.id, c, s, st)} 
                  />
               </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
               <button 
                  onClick={() => {
                    const saved = JSON.parse(localStorage.getItem('raaghas_saved_sections') || '[]');
                    const tpl = {
                      id: Math.random().toString(36).substring(7),
                      name: `${activeSection.type} Template`,
                      type: activeSection.type,
                      content: activeSection.content,
                      style: activeSection.style,
                      settings: activeSection.settings
                    };
                    localStorage.setItem('raaghas_saved_sections', JSON.stringify([...saved, tpl]));
                    alert('Template saved to library!');
                  }}
                  className="flex-1 py-3 border border-wine/20 text-wine bg-wine/5 hover:bg-wine text-white transition-all text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 group hover:text-white"
               >
                  <Library size={12} className="group-hover:text-white" /> Save
               </button>
               <button 
                  onClick={() => onRemoveSection(activeSection.id)}
                  className="flex-1 py-3 border border-red-100 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
               >
                  <Trash2 size={12} /> Remove
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionItem({ section, idx, isFirst, isLast, onSelect, onMove, onRemove, onToggleVisibility, palette }: any) {
  const meta = palette.find((p: any) => p.type === section.type);
  
  return (
    <div 
      onClick={onSelect}
      className="group flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-wine/50 hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
    >
      <div className="text-gray-300 group-hover:text-charcoal transition-colors">
        <GripVertical size={16} />
      </div>
      <div className={`p-2 rounded-lg ${section.hidden ? 'bg-gray-100 text-gray-400' : 'bg-wine/5 text-wine'}`}>
        {meta?.icon || <ImageIcon size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-bold uppercase tracking-wide truncate ${section.hidden ? 'text-gray-300' : 'text-charcoal'}`}>
          {section.content?.adminLabel || meta?.label || section.type}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
          className="p-1.5 hover:bg-gray-50 rounded text-gray-400 hover:text-charcoal"
        >
          {section.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onMove(section.id, "up"); }} 
          disabled={isFirst}
          className="p-1.5 hover:bg-gray-50 rounded text-gray-400 disabled:opacity-10"
        >
          <ChevronLeft size={14} className="rotate-90" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onMove(section.id, "down"); }} 
          disabled={isLast}
          className="p-1.5 hover:bg-gray-50 rounded text-gray-400 disabled:opacity-10"
        >
          <ChevronLeft size={14} className="-rotate-90" />
        </button>
      </div>
    </div>
  );
}

function EditorContent({ section, activeTab, onUpdate }: { section: Section; activeTab: EditorTab; onUpdate: (c: any, s: any, st: any) => void }) {
  const { type, content, style, settings } = section as any;

  const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    const newObj = { ...(obj || {}) };
    let current = newObj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const nextKey = keys[i+1];
      const isNextNumeric = !isNaN(Number(nextKey));
      
      if (isNextNumeric) {
        current[key] = Array.isArray(current[key]) ? [...current[key]] : [];
      } else {
        current[key] = (current[key] && !Array.isArray(current[key])) ? { ...current[key] } : {};
      }
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return newObj;
  };

  const getDisplayUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? "http://localhost:6005" : "https://api.raaghas.in");
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${baseUrl}${cleanPath}`;
  };

  const renderField = (label: string, value: string, key: string, textarea = false) => (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">{label}</label>
      {textarea ? (
        <textarea 
          rows={4}
          value={value || ""} 
          onChange={(e) => onUpdate(setNestedValue(content, key, e.target.value), style, settings)}
          className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:bg-white focus:border-wine outline-none transition-all resize-none shadow-inner"
        />
      ) : (
        <input 
          type="text" 
          value={value || ""} 
          onChange={(e) => onUpdate(setNestedValue(content, key, e.target.value), style, settings)}
          className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:bg-white focus:border-wine outline-none transition-all shadow-inner"
        />
      )}
    </div>
  );

  const renderSubField = (index: number, label: string, value: string, key: string, parentKey: string, textarea = false) => (
    <div className="space-y-1 px-3">
      <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">{label}</label>
      {textarea ? (
        <textarea 
          rows={3}
          value={value || ""} 
          onChange={(e) => {
            const arr = [...(content[parentKey] || [])];
            arr[index] = { ...arr[index], [key]: e.target.value };
            onUpdate({ ...content, [parentKey]: arr }, style, settings);
          }}
          className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-wine transition-all"
        />
      ) : (
        <input 
          type="text" 
          value={value || ""} 
          onChange={(e) => {
            const arr = [...(content[parentKey] || [])];
            arr[index] = { ...arr[index], [key]: e.target.value };
            onUpdate({ ...content, [parentKey]: arr }, style, settings);
          }}
          className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-wine transition-all"
        />
      )}
    </div>
  );

  const renderColorPicker = (label: string, value: string, key: string, target: "content" | "style" | "settings" = "content") => (
    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
       <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{label}</span>
       <div className="flex items-center gap-2">
          <input 
            type="color" 
            value={value || "#ffffff"} 
            onChange={(e) => {
              if (target === "style") onUpdate(content, setNestedValue(style, key, e.target.value), settings);
              else if (target === "settings") onUpdate(content, style, setNestedValue(settings, key, e.target.value));
              else onUpdate(setNestedValue(content, key, e.target.value), style, settings);
            }}
            className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
          />
          <span className="text-[10px] font-mono text-gray-400">{value || "#ffffff"}</span>
       </div>
    </div>
  );

  const renderSlider = (label: string, value: number, key: string, target: "content" | "style" | "settings" = "content", min = 0, max = 160, step = 1, unit = "px") => (
    <div className="space-y-3">
       <div className="flex justify-between items-center">
          <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{label}</label>
          <span className="text-[10px] font-bold text-wine">{value || 0}{unit}</span>
       </div>
       <input 
         type="range" 
         min={min} 
         max={max} 
         step={step}
         value={value || 0}
         onChange={(e) => {
           const val = step % 1 === 0 ? parseInt(e.target.value) : parseFloat(e.target.value);
           if (target === "style") onUpdate(content, setNestedValue(style, key, val), settings);
           else if (target === "settings") onUpdate(content, style, setNestedValue(settings, key, val));
           else onUpdate(setNestedValue(content, key, val), style, settings);
         }}
         className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-wine"
       />
    </div>
  );

  if (activeTab === "style") {
    return (
      <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
         <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
               <Palette size={14} className="text-wine" /> Visual Identity
            </h4>
            {renderColorPicker("Background Color", style?.backgroundColor, "backgroundColor", "style")}
            {renderColorPicker("Text Color", style?.textColor, "textColor", "style")}
         </div>
         <div className="space-y-6">
            <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
               <LayoutIcon size={14} className="text-wine" /> Spacing & Layout
            </h4>
            {renderSlider("Padding Top", style?.paddingTop, "paddingTop", "style", 0, 200, 10)}
            {renderSlider("Padding Bottom", style?.paddingBottom, "paddingBottom", "style", 0, 200, 10)}
            
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Content Alignment</label>
               <div className="flex bg-gray-50 border border-gray-100 rounded-xl p-1">
                  {[
                    { id: "left", label: "Left" },
                    { id: "center", label: "Center" },
                    { id: "right", label: "Right" }
                  ].map((align) => (
                    <button
                      key={align.id}
                      onClick={() => onUpdate(content, { ...style, textAlign: align.id }, settings)}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${
                        (style?.textAlign || "left") === align.id ? "bg-white text-wine shadow-sm" : "text-gray-400 hover:text-charcoal"
                      }`}
                    >
                      {align.label}
                    </button>
                  ))}
               </div>
            </div>

            {type === "HERO" && (
              <div className="space-y-2">
                 <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Vertical Position</label>
                 <div className="flex bg-gray-50 border border-gray-100 rounded-xl p-1">
                    {[
                      { id: "items-start", label: "Top" },
                      { id: "items-center", label: "Middle" },
                      { id: "items-end", label: "Bottom" }
                    ].map((align) => (
                      <button
                        key={align.id}
                        onClick={() => onUpdate(content, { ...style, verticalAlign: align.id }, settings)}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${
                          (style?.verticalAlign || "items-center") === align.id ? "bg-white text-wine shadow-sm" : "text-gray-400 hover:text-charcoal"
                        }`}
                      >
                        {align.label}
                      </button>
                    ))}
                 </div>
              </div>
            )}
         </div>

         {type === "HERO" && (
           <div className="pt-6 border-t border-gray-100 space-y-6">
              <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                 <Move size={14} className="text-wine" /> Dimensions & Overlay
              </h4>
              {renderSlider("Hero Height", style?.height, "height", "style", 50, 100, 5, "vh")}
              {renderSlider("Overlay Opacity", style?.overlayOpacity, "overlayOpacity", "style", 0, 1, 0.1, "")}
              {renderColorPicker("Overlay Color", style?.overlayColor, "overlayColor", "style")}
           </div>
         )}
      </div>
    );
  }

  if (activeTab === "media") {
    return (
      <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
         {["HERO", "STORY_BANNER", "DEAL_BANNER", "BRAND_STORY", "CATEGORY_STRIP", "BANNER", "TEXT_BLOCK"].includes(type) && (
           <MediaUploader 
             label="Primary Visual Asset"
             value={content.image || content.backgroundImage || content.bannerImage}
             onChange={(url) => {
               if (type === "BRAND_STORY" || type === "BANNER" || type === "TEXT_BLOCK") {
                 onUpdate({ ...content, image: url }, style, settings);
               } else if (type === "HERO") {
                 // HERO: save to `image` — this is what ALL hero variants (Classic, Aesthetic, InfiniteCanvas, QuantumMosaic) read
                 onUpdate({ ...content, image: url, backgroundImage: url }, style, settings);
               } else {
                 onUpdate({ ...content, backgroundImage: url }, style, settings);
               }
             }}
           />
         )}
         
         {type === "HERO" && content?.variant === "aesthetic" && (
           <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">Floating Asset Controls</h4>
              <p className="text-[10px] text-gray-400 italic">Manage fabrics and icons in the Content tab.</p>
           </div>
         )}

         {!["HERO", "STORY_BANNER", "DEAL_BANNER", "BRAND_STORY", "CATEGORY_STRIP", "BANNER", "TEXT_BLOCK"].includes(type) && (
            <div className="p-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
               <div className="p-3 bg-gray-50 text-gray-300 rounded-full"><ImageIcon size={24} /></div>
               <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No primary media fields for this section.</p>
            </div>
         )}
      </div>
    );
  }

  if (activeTab === "content") {
    return (
      <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
        <div className="space-y-2 pb-6 border-b border-gray-100">
           {renderField("Sidebar Label (Internal)", content.adminLabel, "adminLabel")}
           <p className="text-[9px] text-gray-400 italic mt-1 pl-1">Rename this section to organize your sidebar.</p>
        </div>

        {/* HERO */}
        {type === "HERO" && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3">
              <label className="text-[10px] uppercase font-bold tracking-widest text-charcoal/40">Section Layout Style</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "default", label: "Standard" },
                  { id: "aesthetic", label: "Aesthetic" },
                  { id: "holographic_layer", label: "Holographic" }
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onUpdate({ ...content, variant: v.id }, style, settings)}
                    className={`py-2 text-[9px] font-bold uppercase rounded-lg border transition-all ${
                      (content?.variant || "default") === v.id 
                        ? "bg-wine text-white border-wine shadow-md" 
                        : "bg-white text-gray-400 border-gray-100 hover:border-wine/30"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Holographic Specific Text Fields */}
            {content?.variant === "holographic_layer" && (
              <div className="pt-6 border-t border-gray-100 space-y-6">
                <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                   <Sparkles size={14} className="text-wine" /> Holographic Layer Details
                </h4>
                {renderField("Main Headline", content.headline, "headline")}
                {renderField("Sub-headline / Title", content.subheadline, "subheadline")}
                {renderField("Description Text", content.text, "text", true)}
                
                <div className="space-y-4">
                   <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">Primary Call to Action</label>
                   <div className="grid grid-cols-2 gap-4">
                     {renderField("CTA Label", content.ctaText, "ctaText")}
                     {renderField("CTA Link", content.ctaLink, "ctaLink")}
                   </div>
                </div>

                <div className="pt-6 border-t border-gray-50 space-y-4">
                  <h5 className="text-[10px] font-bold text-charcoal uppercase tracking-widest">Reverse Card Content (Details)</h5>
                  {renderField("Back Title", content.backTitle, "backTitle")}
                  {renderField("Back Text", content.backText, "backText", true)}
                  <div className="grid grid-cols-2 gap-4">
                    {renderField("Back CTA Label", content.backCtaText, "backCtaText")}
                    {renderField("Back CTA Link", content.backCtaLink, "backCtaLink")}
                  </div>
                </div>
              </div>
            )}

            {/* 3D Engine & Floating Assets - Visible for both Aesthetic and Holographic */}
            {(content?.variant === "aesthetic" || content?.variant === "holographic_layer") && (
              <div className="pt-6 border-t border-gray-100 space-y-6">
                <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                   <Sparkles size={14} className="text-wine" /> 3D Engine & Floating Assets
                </h4>
                
                <div className="p-4 bg-wine/5 rounded-2xl border border-wine/10 space-y-4">
                  <span className="text-[10px] font-bold text-wine uppercase tracking-widest flex items-center gap-2">
                    <Move size={12} /> Floating Layer Precision
                  </span>
                  {renderSlider("Parallax Intensity", settings?.parallaxIntensity, "parallaxIntensity", "settings", 0, 50, 5)}
                  {renderSlider("Holographic Shimmer", settings?.shimmerIntensity, "shimmerIntensity", "settings", 0, 100, 10)}
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">3D Floating Fabrics (Glows)</label>
                  <div className="space-y-4">
                    {(content.fabrics || []).map((fabric: any, i: number) => (
                      <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3 relative group/item">
                         <button 
                           onClick={() => {
                             const arr = [...(content.fabrics || [])];
                             arr.splice(i, 1);
                             onUpdate({ ...content, fabrics: arr }, style, settings);
                           }}
                           className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover/item:opacity-100 transition-all"
                         >
                           <Trash2 size={12} />
                         </button>
                         <MediaUploader label="Fabric Texture / Glow" value={fabric.image} onChange={(url) => {
                           const arr = [...(content.fabrics || [])];
                           arr[i] = { ...arr[i], image: url };
                           onUpdate({ ...content, fabrics: arr }, style, settings);
                         }} />
                         {renderSlider("Horizontal (X)", fabric.x, `fabrics.${i}.x`, "content", 0, 100, 1, "%")}
                         {renderSlider("Vertical (Y)", fabric.y, `fabrics.${i}.y`, "content", 0, 100, 1, "%")}
                         {renderSlider("Opacity", fabric.opacity, `fabrics.${i}.opacity`, "content", 0, 0.5, 0.01, "")}
                      </div>
                    ))}
                    <button 
                      onClick={() => onUpdate({ ...content, fabrics: [...(content.fabrics || []), { x: 50, y: 50, opacity: 0.1, scale: 1, speed: 0.2 }] }, style, settings)}
                      className="w-full py-2 border border-dashed border-gray-200 rounded-xl text-[9px] font-bold uppercase text-gray-400 hover:border-wine/30 hover:text-wine transition-all"
                    >
                      + Add Floating Fabric
                    </button>
                  </div>

                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400 mt-6">3D Floating Icons (PNGs)</label>
                  <div className="space-y-4">
                    {(content.uiElements || []).map((el: any, i: number) => (
                      <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-4 relative group/item shadow-sm">
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-bold text-wine uppercase tracking-widest">Floating Badge #{i+1}</span>
                           <button 
                             onClick={() => {
                               const arr = [...(content.uiElements || [])];
                               arr.splice(i, 1);
                               onUpdate({ ...content, uiElements: arr }, style, settings);
                             }}
                             className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                           >
                             <Trash2 size={12} />
                           </button>
                         </div>

                         <div className="space-y-4 pt-2 border-t border-gray-100">
                           <MediaUploader label="Custom Icon / Image" value={el.image} onChange={(url) => {
                             const arr = [...(content.uiElements || [])];
                             arr[i] = { ...arr[i], image: url };
                             onUpdate({ ...content, uiElements: arr }, style, settings);
                           }} />
                           
                           <div className="grid grid-cols-2 gap-3">
                             <div className="space-y-1">
                               <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">Main Title</label>
                               <input 
                                 type="text" 
                                 value={el.text || ""} 
                                 onChange={e => {
                                   const arr = [...(content.uiElements || [])];
                                   arr[i] = { ...arr[i], text: e.target.value };
                                   onUpdate({ ...content, uiElements: arr }, style, settings);
                                 }} 
                                 className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-wine" 
                                 placeholder="e.g. PREMIUM" 
                               />
                             </div>
                             <div className="space-y-1">
                               <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">Subtitle</label>
                               <input 
                                 type="text" 
                                 value={el.subtext || ""} 
                                 onChange={e => {
                                   const arr = [...(content.uiElements || [])];
                                   arr[i] = { ...arr[i], subtext: e.target.value };
                                   onUpdate({ ...content, uiElements: arr }, style, settings);
                                 }} 
                                 className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-wine" 
                                 placeholder="e.g. SILKS" 
                               />
                             </div>
                           </div>

                           <div className="grid grid-cols-2 gap-3">
                             <div className="space-y-1">
                               <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">Icon Set</label>
                               <select 
                                 value={el.iconName || "KalamkariFlower"} 
                                 onChange={e => {
                                   const arr = [...(content.uiElements || [])];
                                   arr[i] = { ...arr[i], iconName: e.target.value };
                                   onUpdate({ ...content, uiElements: arr }, style, settings);
                                 }} 
                                 className="w-full bg-white border border-gray-100 rounded-lg px-2 py-2 text-[10px] outline-none focus:border-wine"
                               >
                                 <option value="LuxuryHanger">Luxury Hanger</option>
                                 <option value="SilkSpool">Silk Spool</option>
                                 <option value="KalamkariFlower">Kalamkari Flower</option>
                                 <option value="MandalaPattern">Mandala Pattern</option>
                                 <option value="PeacockFeather">Peacock Feather</option>
                                 <option value="Lotus">Lotus Flower</option>
                               </select>
                             </div>
                             <div className="space-y-1">
                               <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">Badge Shape</label>
                               <select 
                                 value={el.shape || "none"} 
                                 onChange={e => {
                                   const arr = [...(content.uiElements || [])];
                                   arr[i] = { ...arr[i], shape: e.target.value as any };
                                   onUpdate({ ...content, uiElements: arr }, style, settings);
                                 }} 
                                 className="w-full bg-white border border-gray-100 rounded-lg px-2 py-2 text-[10px] outline-none focus:border-wine"
                               >
                                 <option value="none">No Badge</option>
                                 <option value="circle">Glass Circle</option>
                                 <option value="rounded">Glass Rounded</option>
                               </select>
                             </div>
                           </div>

                           <div className="pt-2 space-y-4">
                             {renderSlider("X-Position (%)", el.x, `uiElements.${i}.x`, "content", 0, 100, 1, "%")}
                             {renderSlider("Y-Position (%)", el.y, `uiElements.${i}.y`, "content", 0, 100, 1, "%")}
                             {renderSlider("Scale", el.size, `uiElements.${i}.size`, "content", 0.5, 2, 0.1, "x")}
                             {renderSlider("Opacity", el.opacity, `uiElements.${i}.opacity`, "content", 0, 1, 0.1, "")}
                           </div>
                         </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => onUpdate({ ...content, uiElements: [...(content.uiElements || []), { x: 80, y: 20, size: 1, opacity: 0.4, speed: 0.4 }] }, style, settings)}
                      className="w-full py-2 border border-dashed border-gray-200 rounded-xl text-[9px] font-bold uppercase text-gray-400 hover:border-wine/30 hover:text-wine transition-all"
                    >
                      + Add UI Icon
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Fields for Default/Aesthetic Variants */}
            {content?.variant !== "holographic_layer" && (
              <div className="space-y-6 pt-4 border-t border-gray-100">
                {renderField("Headline", content.headline, "headline", true)}
                {renderField("Sub-headline", content.subheadline || content.description, "subheadline", true)}
                {renderField("Urgency Tag", content.urgencyTag, "urgencyTag")}
                
                <div className="space-y-4">
                   <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">Primary Action</label>
                   <div className="grid grid-cols-2 gap-4">
                     {renderField("Label", content.primaryCta?.text || content.ctaText, "primaryCta.text")}
                     {renderField("Link", content.primaryCta?.link || content.ctaLink, "primaryCta.link")}
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">Secondary Action</label>
                   <div className="grid grid-cols-2 gap-4">
                     {renderField("Label", content.secondaryCta?.text, "secondaryCta.text")}
                     {renderField("Link", content.secondaryCta?.link, "secondaryCta.link")}
                   </div>
                </div>
                {renderField("Trust Line", content.trustLine, "trustLine")}
              </div>
            )}
          </div>
        )}

        {/* ACCORDION FAQ */}
        {type === "ACCORDION_FAQ" && (
          <div className="space-y-4">
            {renderField("Section Headline", content.headline, "headline")}
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Questions & Answers</label>
              <button onClick={() => onUpdate({ ...content, faqs: [...(content.faqs || []), { question: "New Question", answer: "The answer..." }] }, style, settings)} className="p-1 text-wine hover:bg-gray-100 rounded"><Plus size={14} /></button>
            </div>
            {(content.faqs || []).map((faq: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3 relative group/item">
                <button onClick={() => { const newFaqs = [...content.faqs]; newFaqs.splice(i, 1); onUpdate({ ...content, faqs: newFaqs }, style, settings); }} className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                {renderSubField(i, "Question", faq.question, "question", "faqs")}
                {renderSubField(i, "Answer", faq.answer, "answer", "faqs", true)}
              </div>
            ))}
          </div>
        )}

        {/* LEGAL PROSE */}
        {type === "LEGAL_PROSE" && (
          <div className="space-y-6">
            {renderField("Document Title", content.title, "title")}
            {renderField("Last Updated", content.lastUpdated, "lastUpdated")}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Policy Sections</label>
                <button onClick={() => onUpdate({ ...content, sections: [...(content.sections || []), { title: "Section Title", content: "..." }] }, style, settings)} className="p-1 text-wine hover:bg-gray-100 rounded"><Plus size={14} /></button>
              </div>
              {(content.sections || []).map((sec: any, i: number) => (
                <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3 relative group/item">
                  <button onClick={() => { const newSecs = [...content.sections]; newSecs.splice(i, 1); onUpdate({ ...content, sections: newSecs }, style, settings); }} className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                  {renderSubField(i, "Title", sec.title, "title", "sections")}
                  {renderSubField(i, "Content (HTML)", sec.content, "content", "sections", true)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IMAGE_ROW */}
        {type === "IMAGE_ROW" && (
          <div className="space-y-6">
            {renderField("Section Headline", content.headline, "headline")}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Image Shape</label>
              <select 
                value={content.imageShape || "round"} 
                onChange={e => onUpdate({ ...content, imageShape: e.target.value }, style, settings)} 
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:bg-white focus:border-wine outline-none transition-all shadow-inner"
              >
                <option value="round">Round / Circle</option>
                <option value="rounded-square">Rounded Square</option>
                <option value="square">Square</option>
                <option value="logo">Logo (Fit width)</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Images</label>
              <button onClick={() => onUpdate({ ...content, images: [...(content.images || []), { url: "", link: "" }] }, style, settings)} className="p-1 text-wine hover:bg-gray-100 rounded"><Plus size={14} /></button>
            </div>
            
            <div className="space-y-4">
              {(content.images || []).map((img: any, i: number) => (
                <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3 relative group/item">
                   <button 
                     onClick={() => {
                       const arr = [...(content.images || [])];
                       arr.splice(i, 1);
                       onUpdate({ ...content, images: arr }, style, settings);
                     }}
                     className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover/item:opacity-100 transition-all"
                   >
                     <Trash2 size={12} />
                   </button>
                   <MediaUploader label={`Image ${i + 1}`} value={img.url} onChange={(url) => {
                     const arr = [...(content.images || [])];
                     arr[i] = { ...arr[i], url };
                     onUpdate({ ...content, images: arr }, style, settings);
                   }} />
                   {renderSubField(i, "Link (Optional)", img.link, "link", "images")}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEXT BLOCK */}
        {type === "TEXT_BLOCK" && (
          <div className="space-y-6">
            {renderField("Headline", content.headline, "headline")}
            {renderField("Body Text", content.body, "body", true)}
          </div>
        )}

        {/* PRODUCT_GRID & SMART_GRID */}
        {["PRODUCT_GRID", "SMART_GRID"].includes(type) && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag size={14} className="text-wine" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal">Source Configuration</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {["collection", "manual"].map((source) => (
                  <button
                    key={source}
                    onClick={() => onUpdate({ ...content, source }, style, settings)}
                    className={`py-2 text-[9px] font-bold uppercase rounded-lg border transition-all ${
                      (content?.source || "collection") === source 
                        ? "bg-charcoal text-white border-charcoal shadow-md" 
                        : "bg-white text-gray-400 border-gray-100 hover:border-wine/30"
                    }`}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>

            {renderField("Grid Title", content.title, "title")}
            {renderField("Sub-headline", content.subtitle, "subtitle")}

            {content.source === "manual" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">Selected Products</label>
                  <button 
                    onClick={() => onUpdate({ ...content, productHandles: [...(content.productHandles || []), ""] }, style, settings)}
                    className="p-1 text-wine hover:bg-wine/5 rounded border border-wine/10"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {(content.productHandles || []).map((h: string, i: number) => (
                  <div key={i} className="flex gap-2">
                    <input 
                      type="text"
                      value={h}
                      onChange={(e) => {
                        const arr = [...content.productHandles];
                        arr[i] = e.target.value;
                        onUpdate({ ...content, productHandles: arr }, style, settings);
                      }}
                      placeholder="product-handle"
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs focus:bg-white focus:border-wine transition-all"
                    />
                    <button 
                      onClick={() => {
                        const arr = [...content.productHandles];
                        arr.splice(i, 1);
                        onUpdate({ ...content, productHandles: arr }, style, settings);
                      }}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {renderField("Collection Handle", content.collectionHandle, "collectionHandle")}
                {renderSlider("Product Limit", content.limit || content.count, content.limit ? "limit" : "count", "content", 2, 24, 2)}
                {type === "SMART_GRID" && (
                   <div className="p-4 bg-wine/5 rounded-2xl border border-wine/10">
                      <p className="text-[9px] text-wine font-bold uppercase tracking-widest leading-relaxed">
                         Note: Smart Grid uses AI-driven sorting based on customer history.
                      </p>
                   </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CATEGORY_STRIP */}
        {type === "CATEGORY_STRIP" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                 <LayoutIcon size={14} className="text-wine" /> Category Links
              </h4>
              <button 
                onClick={() => onUpdate({ ...content, categories: [...(content.categories || []), { label: "New Category", handle: "", image: "" }] }, style, settings)}
                className="p-1.5 text-wine hover:bg-wine/5 rounded-lg transition-colors border border-wine/10"
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="space-y-4">
              {(content.categories || []).map((cat: any, i: number) => (
                <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-4 relative group/item shadow-sm">
                   <button 
                     onClick={() => {
                       const arr = [...content.categories];
                       arr.splice(i, 1);
                       onUpdate({ ...content, categories: arr }, style, settings);
                     }}
                     className="absolute top-2 right-2 p-1.5 text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all"
                   >
                     <Trash2 size={12} />
                   </button>
                   
                   {renderSubField(i, "Label", cat.label, "label", "categories")}
                   {renderSubField(i, "Link / Handle", cat.link || cat.handle, "handle", "categories")}
                   <MediaUploader 
                     label="Category Visual" 
                     value={cat.image} 
                     onChange={(url) => {
                       const arr = [...content.categories];
                       arr[i] = { ...arr[i], image: url };
                       onUpdate({ ...content, categories: arr }, style, settings);
                     }} 
                   />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOCIAL_PROOF (UGC) */}
        {type === "SOCIAL_PROOF" && (
          <div className="space-y-6">
            {renderField("Headline", content.headline, "headline")}
            {renderField("Subtext / CTA Instruction", content.subtext, "subtext", true)}
            {renderField("Instagram Handle", content.handleText, "handleText")}
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">Community Media</h4>
              <button 
                onClick={() => onUpdate({ ...content, items: [...(content.items || []), { name: "", city: "", image: "" }] }, style, settings)}
                className="p-1.5 text-wine hover:bg-wine/5 rounded-lg transition-colors border border-wine/10"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-4">
              {(content.items || []).map((item: any, i: number) => (
                <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3 relative group/item">
                   <button 
                     onClick={() => {
                       const arr = [...content.items];
                       arr.splice(i, 1);
                       onUpdate({ ...content, items: arr }, style, settings);
                     }}
                     className="absolute top-2 right-2 p-1.5 text-red-400 opacity-0 group-hover/item:opacity-100 transition-all"
                   >
                     <Trash2 size={12} />
                   </button>
                   <div className="grid grid-cols-2 gap-3">
                     {renderSubField(i, "Name", item.name, "name", "items")}
                     {renderSubField(i, "City", item.city, "city", "items")}
                   </div>
                   {renderSubField(i, "Comment / Review", item.comment, "comment", "items", true)}
                   <MediaUploader 
                     label="User Photo" 
                     value={item.image} 
                     onChange={(url) => {
                       const arr = [...content.items];
                       arr[i] = { ...arr[i], image: url };
                       onUpdate({ ...content, items: arr }, style, settings);
                     }} 
                   />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TESTIMONIALS */}
        {type === "TESTIMONIALS" && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3">
              <label className="text-[10px] uppercase font-bold tracking-widest text-charcoal/40">Layout Density</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "default", label: "Standard" },
                  { id: "compact", label: "Compact" }
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onUpdate({ ...content, variant: v.id }, style, settings)}
                    className={`py-2 text-[9px] font-bold uppercase rounded-lg border transition-all ${
                      (content?.variant || "default") === v.id 
                        ? "bg-wine text-white border-wine shadow-md" 
                        : "bg-white text-gray-400 border-gray-100 hover:border-wine/30"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            {renderField("Headline", content.headline, "headline")}
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">Customer Quotes</h4>
              <button 
                onClick={() => onUpdate({ ...content, testimonials: [...(content.testimonials || []), { name: "", quote: "", rating: 5 }] }, style, settings)}
                className="p-1.5 text-wine hover:bg-wine/5 rounded-lg transition-colors border border-wine/10"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-4">
              {(content.testimonials || []).map((t: any, i: number) => (
                <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3 relative group/item">
                   <button 
                     onClick={() => {
                       const arr = [...content.testimonials];
                       arr.splice(i, 1);
                       onUpdate({ ...content, testimonials: arr }, style, settings);
                     }}
                     className="absolute top-2 right-2 p-1.5 text-red-400 opacity-0 group-hover/item:opacity-100 transition-all"
                   >
                     <Trash2 size={12} />
                   </button>
                   {renderSubField(i, "Quote", t.quote || t.feedback, "quote", "testimonials", true)}
                   <div className="grid grid-cols-2 gap-3">
                     {renderSubField(i, "Name", t.name, "name", "testimonials")}
                     {renderSubField(i, "City", t.city, "city", "testimonials")}
                   </div>
                   {renderSubField(i, "Rating (1-5)", String(t.rating), "rating", "testimonials")}
                   <MediaUploader 
                     label="Customer Avatar (Optional)" 
                     value={t.image} 
                     onChange={(url) => {
                       const arr = [...content.testimonials];
                       arr[i] = { ...arr[i], image: url };
                       onUpdate({ ...content, testimonials: arr }, style, settings);
                     }} 
                   />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FEATURED COLLECTION */}
        {type === "FEATURED_COLLECTION" && (
          <div className="space-y-4">
            {renderField("Section Title", content.title, "title")}
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Collections List</label>
              <button onClick={() => onUpdate({ ...content, collections: [...(content.collections || []), { name: "New", handle: "", image: "" }] }, style, settings)} className="p-1 text-wine hover:bg-gray-100 rounded"><Plus size={14} /></button>
            </div>
            {(content.collections || []).map((col: any, i: number) => (
              <div key={i} className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-3 relative group/item">
                <button onClick={() => { const cols = [...content.collections]; cols.splice(i, 1); onUpdate({ ...content, collections: cols }, style, settings); }} className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                {renderSubField(i, "Name", col.name, "name", "collections")}
                {renderSubField(i, "Handle", col.handle, "handle", "collections")}
                <MediaUploader label="Image" value={col.image} onChange={(url) => { const cols = [...content.collections]; cols[i] = { ...cols[i], image: url }; onUpdate({ ...content, collections: cols }, style, settings); }} />
              </div>
            ))}
          </div>
        )}

        {/* STORY BANNER */}
        {type === "STORY_BANNER" && (
          <div className="space-y-6">
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Background image set in the Media tab ↑</p>
            </div>
            {renderField("Headline", content.headline, "headline")}
            {renderField("Sub-copy", content.subtext, "subtext", true)}
            <div className="grid grid-cols-2 gap-4">
              {renderField("CTA Button Text", content.ctaText, "ctaText")}
              {renderField("CTA Link", content.ctaLink, "ctaLink")}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">Text Overlay Position</label>
              <div className="grid grid-cols-3 gap-2">
                {["left", "center", "right"].map((pos) => (
                  <button
                    key={pos}
                    onClick={() => onUpdate({ ...content, textAlign: pos }, style, settings)}
                    className={`py-2 text-[9px] font-bold uppercase rounded-lg border transition-all capitalize ${
                      (content?.textAlign || "center") === pos
                        ? "bg-charcoal text-white border-charcoal"
                        : "bg-white text-gray-400 border-gray-100 hover:border-wine/30"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DEAL BANNER */}
        {type === "DEAL_BANNER" && (
          <div className="space-y-6">
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <p className="text-[9px] text-red-600 uppercase tracking-widest font-bold">Flash Sale / Urgency Section</p>
            </div>
            {renderField("Deal Headline", content.headline, "headline")}
            {renderField("Deal Description", content.subtext, "subtext", true)}
            <div className="grid grid-cols-2 gap-4">
              {renderField("Discount Code", content.discountCode, "discountCode")}
              {renderField("Urgency Text", content.endsText, "endsText")}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {renderField("CTA Button Text", content.ctaText, "ctaText")}
              {renderField("CTA Link", content.ctaLink, "ctaLink")}
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[9px] text-amber-700 uppercase tracking-widest font-bold leading-relaxed">
                Tip: Set Urgency Text like "Ends in 2 hours" to drive conversions.
              </p>
            </div>
          </div>
        )}

        {/* AOV BUNDLES */}
        {type === "AOV_BUNDLES" && (
          <div className="space-y-6">
            {renderField("Headline", content.headline, "headline")}
            {renderField("Description", content.description, "description", true)}
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">Product Bundles</h4>
              <button 
                onClick={() => onUpdate({ ...content, bundles: [...(content.bundles || []), { title: "New Bundle", price: "0", discount: "0%", image: "", productHandle: "" }] }, style, settings)}
                className="p-1.5 text-wine hover:bg-wine/5 rounded-lg transition-colors border border-wine/10"
              >
                <Plus size={14} />
              </button>
            </div>
            {(content.bundles || []).map((b: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-4 relative group/item">
                <button onClick={() => { const arr = [...content.bundles]; arr.splice(i, 1); onUpdate({ ...content, bundles: arr }, style, settings); }} className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                <MediaUploader label="Bundle Image" value={b.image} onChange={(url) => { const arr = [...content.bundles]; arr[i] = { ...arr[i], image: url }; onUpdate({ ...content, bundles: arr }, style, settings); }} />
                {renderSubField(i, "Bundle Name", b.title, "title", "bundles")}
                {renderSubField(i, "Product Handle", b.productHandle, "productHandle", "bundles")}
                <div className="grid grid-cols-2 gap-3">
                  {renderSubField(i, "Price", b.price, "price", "bundles")}
                  {renderSubField(i, "Discount Tag", b.discount, "discount", "bundles")}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TRUST BAR */}
        {type === "TRUST_BAR" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">USP Items</h4>
              <button 
                onClick={() => onUpdate({ ...content, items: [...(content.items || []), { icon: "Star", text: "New USP" }] }, style, settings)}
                className="p-1.5 text-wine hover:bg-wine/5 rounded-lg transition-colors border border-wine/10"
              >
                <Plus size={14} />
              </button>
            </div>
            {(content.items || []).map((item: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3 relative group/item">
                <button onClick={() => { const arr = [...content.items]; arr.splice(i, 1); onUpdate({ ...content, items: arr }, style, settings); }} className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                {renderSubField(i, "Icon Name (Lucide)", item.icon, "icon", "items")}
                {renderSubField(i, "USP Text", item.text, "text", "items")}
              </div>
            ))}
          </div>
        )}

        {/* EDITORIAL STORY */}
        {type === "EDITORIAL" && (
          <div className="space-y-6">
            {renderField("Main Title", content.title, "title")}
            {renderField("Brief Description", content.description, "description", true)}
            <MediaUploader 
              label="Main Editorial Image" 
              value={content.mainImage} 
              onChange={(url) => onUpdate({ ...content, mainImage: url }, style, settings)} 
            />
            <div className="pt-6 border-t border-gray-100 space-y-6">
               <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">Secondary Content</h4>
               {renderField("Secondary Headline", content.subheadline, "subheadline")}
               {renderField("Secondary Text", content.subtext, "subtext", true)}
               <MediaUploader 
                 label="Side Image" 
                 value={content.sideImage} 
                 onChange={(url) => onUpdate({ ...content, sideImage: url }, style, settings)} 
               />
               <div className="grid grid-cols-2 gap-4">
                 {renderField("CTA Text", content.linkText, "linkText")}
                 {renderField("CTA Link", content.link, "link")}
               </div>
            </div>
          </div>
        )}

        {/* CUSTOM HTML */}
        {type === "CUSTOM_HTML" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="p-4 bg-charcoal/5 rounded-2xl border border-charcoal/10 flex items-center gap-3">
               <Settings2 size={16} className="text-charcoal" />
               <p className="text-[10px] text-charcoal font-bold uppercase tracking-widest">HTML Editor</p>
            </div>

            {renderField("Raw HTML Content", content.html, "html", true)}

            {/* ── ChatGPT Assistant Panel ─────────────────────────── */}
            <CustomHtmlGuide />
          </div>
        )}


        {/* LOOKBOOK */}
        {type === "LOOKBOOK" && (
          <div className="space-y-6">
            {renderField("Headline", content.headline, "headline")}
            {renderField("Description", content.description, "description", true)}
            <MediaUploader 
              label="Main Lookbook Image" 
              value={content.image} 
              onChange={(url) => onUpdate({ ...content, image: url }, style, settings)} 
            />
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">Product Hotspots</h4>
              <button 
                onClick={() => onUpdate({ ...content, hotspots: [...(content.hotspots || []), { x: 50, y: 50, productHandle: "" }] }, style, settings)}
                className="p-1.5 text-wine hover:bg-wine/5 rounded-lg transition-colors border border-wine/10"
              >
                <Plus size={14} />
              </button>
            </div>
            {(content.hotspots || []).map((h: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3 relative group/item">
                <button onClick={() => { const arr = [...content.hotspots]; arr.splice(i, 1); onUpdate({ ...content, hotspots: arr }, style, settings); }} className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                <div className="grid grid-cols-2 gap-3">
                  {renderSubField(i, "X (%)", h.x, "x", "hotspots")}
                  {renderSubField(i, "Y (%)", h.y, "y", "hotspots")}
                </div>
                {renderSubField(i, "Product Handle", h.productHandle, "productHandle", "hotspots")}
              </div>
            ))}
          </div>
        )}

        {/* INSTAGRAM FEED */}
        {type === "INSTAGRAM_FEED" && (
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-800">Instagram Integration</span>
              </div>
              <p className="text-[9px] text-purple-600 leading-relaxed">
                Connect your Instagram account to display live posts. Fill in your profile details below.
              </p>
            </div>
            {renderField("Section Headline", content.headline, "headline")}
            {renderField("Instagram Handle", content.handleText, "handleText")}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">Instagram Access Token</label>
              <input
                type="password"
                value={content.accessToken || ""}
                onChange={(e) => onUpdate({ ...content, accessToken: e.target.value }, style, settings)}
                placeholder="IGQVJ…"
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-xs focus:bg-white focus:border-wine outline-none transition-all"
              />
              <p className="text-[9px] text-gray-400">Generate via Meta Business Suite → Instagram API</p>
            </div>
            {renderSlider("Posts to Show", content.postCount || 6, "postCount", "content", 3, 12, 1)}
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[9px] text-amber-700 font-bold uppercase tracking-widest leading-relaxed">
                Without an access token, the grid will show placeholder tiles. Add your token on the VPS API env as INSTAGRAM_ACCESS_TOKEN.
              </p>
            </div>
          </div>
        )}

        {/* BRAND_STORY */}
        {type === "BRAND_STORY" && (
          <div className="space-y-6">
            {renderField("Headline", content.headline, "headline")}
            {renderField("Story Body", content.body, "body", true)}
            {renderField("Signature Text", content.signatureText, "signatureText")}
          </div>
        )}

        {/* LOGO_CLOUD */}
        {type === "LOGO_CLOUD" && (
          <div className="space-y-6">
            {renderField("Headline", content.headline, "headline")}
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">Logos</h4>
              <button 
                onClick={() => onUpdate({ ...content, logos: [...(content.logos || []), { image: "", alt: "Brand" }] }, style, settings)}
                className="p-1.5 text-wine hover:bg-wine/5 rounded-lg transition-colors border border-wine/10"
              >
                <Plus size={14} />
              </button>
            </div>
            {(content.logos || []).map((logo: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3 relative group/item">
                <button onClick={() => { const arr = [...content.logos]; arr.splice(i, 1); onUpdate({ ...content, logos: arr }, style, settings); }} className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                <MediaUploader label="Logo Image" value={logo.image} onChange={(url) => { const arr = [...content.logos]; arr[i] = { ...arr[i], image: url }; onUpdate({ ...content, logos: arr }, style, settings); }} />
                {renderSubField(i, "Alt Text", logo.alt, "alt", "logos")}
              </div>
            ))}
          </div>
        )}

        {/* IMAGE_SCROLL */}
        {type === "IMAGE_SCROLL" && (
          <div className="space-y-6">
            {renderField("Headline", content.headline, "headline")}

            {/* Corner Shape Control */}
            <div className="space-y-2 pt-4 border-t border-gray-50">
              <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Corner Shape</label>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { value: "full", label: "⬤", title: "Circle" },
                  { value: "2xl", label: "▣", title: "Pill" },
                  { value: "xl", label: "◻", title: "Rounded" },
                  { value: "lg", label: "▢", title: "Slight" },
                  { value: "none", label: "□", title: "Square" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    title={opt.title}
                    onClick={() => onUpdate(content, style, { ...(settings || {}), shape: opt.value })}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[16px] border transition-all ${
                      (settings?.shape ?? "full") === opt.value
                        ? "bg-wine text-white border-wine shadow-sm"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-wine/50 hover:text-wine"
                    }`}
                  >
                    {opt.label}
                    <span className="text-[8px] font-bold uppercase tracking-widest leading-none">{opt.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">Images</h4>
              <button 
                onClick={() => onUpdate({ ...content, images: [...(content.images || []), { image: "", title: "", link: "" }] }, style, settings)}
                className="p-1.5 text-wine hover:bg-wine/5 rounded-lg transition-colors border border-wine/10"
              >
                <Plus size={14} />
              </button>
            </div>
            {(content.images || []).map((img: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3 relative group/item">
                <button onClick={() => { const arr = [...content.images]; arr.splice(i, 1); onUpdate({ ...content, images: arr }, style, settings); }} className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                <MediaUploader label="Scroll Image" value={img.image} onChange={(url) => { const arr = [...content.images]; arr[i] = { ...arr[i], image: url }; onUpdate({ ...content, images: arr }, style, settings); }} />
                {renderSubField(i, "Title", img.title, "title", "images")}
                {renderSubField(i, "Link", img.link, "link", "images")}
              </div>
            ))}
          </div>
        )}

        {/* CATEGORIES_MOSAIC */}
        {type === "CATEGORIES_MOSAIC" && (
          <div className="space-y-6">
            {renderField("Headline", content.headline, "headline")}
            {renderField("Subheadline", content.subheadline, "subheadline")}
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">Mosaic Categories</h4>
              <button 
                onClick={() => onUpdate({ ...content, categories: [...(content.categories || []), { image: "", title: "", link: "" }] }, style, settings)}
                className="p-1.5 text-wine hover:bg-wine/5 rounded-lg transition-colors border border-wine/10"
              >
                <Plus size={14} />
              </button>
            </div>
            {(content.categories || []).map((cat: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3 relative group/item">
                <button onClick={() => { const arr = [...content.categories]; arr.splice(i, 1); onUpdate({ ...content, categories: arr }, style, settings); }} className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                <MediaUploader label="Category Image" value={cat.image} onChange={(url) => { const arr = [...content.categories]; arr[i] = { ...arr[i], image: url }; onUpdate({ ...content, categories: arr }, style, settings); }} />
                {renderSubField(i, "Title", cat.title, "title", "categories")}
                {renderSubField(i, "Link", cat.link, "link", "categories")}
              </div>
            ))}
          </div>
        )}

        {/* FEATURE_GRID */}
        {type === "FEATURE_GRID" && (
          <div className="space-y-6">
            {renderField("Headline", content.headline, "headline")}
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">Features</h4>
              <button 
                onClick={() => onUpdate({ ...content, features: [...(content.features || []), { icon: "Star", title: "New Feature", description: "" }] }, style, settings)}
                className="p-1.5 text-wine hover:bg-wine/5 rounded-lg transition-colors border border-wine/10"
              >
                <Plus size={14} />
              </button>
            </div>
            {(content.features || []).map((feature: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3 relative group/item">
                <button onClick={() => { const arr = [...content.features]; arr.splice(i, 1); onUpdate({ ...content, features: arr }, style, settings); }} className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                {renderSubField(i, "Icon Name (Lucide)", feature.icon, "icon", "features")}
                {renderSubField(i, "Title", feature.title, "title", "features")}
                {renderSubField(i, "Description", feature.description, "description", "features", true)}
              </div>
            ))}
          </div>
        )}

        {/* PRODUCT_SCROLL */}
        {type === "PRODUCT_SCROLL" && (
          <div className="space-y-6">
            {renderField("Section Title", content.title, "title")}
            {renderField("Subtitle Badge", content.subtitle, "subtitle")}
            {renderField("Collection Handle", content.collectionHandle, "collectionHandle")}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Max Products</label>
                <span className="text-[10px] font-bold text-wine">{content.limit || 12}</span>
              </div>
              <input type="range" min={4} max={24} step={4} value={content.limit || 12}
                onChange={e => onUpdate({ ...content, limit: parseInt(e.target.value) }, style, settings)}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-wine"
              />
            </div>
          </div>
        )}

        {/* ANNOUNCEMENT_MARQUEE */}
        {type === "ANNOUNCEMENT_MARQUEE" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Marquee Items</label>
                <button
                  onClick={() => onUpdate({ ...content, items: [...(content.items || []), "New Item"] }, style, settings)}
                  className="px-2 py-1 bg-wine/10 text-wine rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-wine hover:text-white transition-all"
                >
                  + Add
                </button>
              </div>
              {(content.items || []).map((item: string, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={item}
                    onChange={e => {
                      const arr = [...(content.items || [])];
                      arr[i] = e.target.value;
                      onUpdate({ ...content, items: arr }, style, settings);
                    }}
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-wine transition-all"
                  />
                  <button
                    onClick={() => {
                      const arr = [...(content.items || [])];
                      arr.splice(i, 1);
                      onUpdate({ ...content, items: arr }, style, settings);
                    }}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Scroll Speed</label>
                <span className="text-[10px] font-bold text-wine">{content.speed || 30}s</span>
              </div>
              <input type="range" min={10} max={60} step={5} value={content.speed || 30}
                onChange={e => onUpdate({ ...content, speed: parseInt(e.target.value) }, style, settings)}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-wine"
              />
              <p className="text-[9px] text-gray-400 italic">Lower = faster scroll</p>
            </div>
          </div>
        )}

        {/* Default fallback for other types */}
        {!["HERO", "ACCORDION_FAQ", "LEGAL_PROSE", "TEXT_BLOCK", "PRODUCT_GRID", "SMART_GRID", "FEATURED_COLLECTION", "CATEGORY_STRIP", "SOCIAL_PROOF", "TESTIMONIALS", "AOV_BUNDLES", "STORY_BANNER", "DEAL_BANNER", "TRUST_BAR", "CUSTOM_HTML", "LOOKBOOK", "EDITORIAL", "INSTAGRAM_FEED", "BRAND_STORY", "LOGO_CLOUD", "IMAGE_SCROLL", "CATEGORIES_MOSAIC", "FEATURE_GRID", "PRODUCT_SCROLL", "ANNOUNCEMENT_MARQUEE"].includes(type) && (
           <div className="space-y-6">
              {renderField("Headline", content.headline, "headline")}
              {renderField("Description", content.description || content.subtext, content.description ? "description" : "subtext", true)}
              <div className="grid grid-cols-2 gap-4">
                {renderField("CTA Text", content.ctaText || content.cta?.text, content.ctaText ? "ctaText" : "cta.text")}
                {renderField("CTA Link", content.ctaLink || content.cta?.link, content.ctaLink ? "ctaLink" : "cta.link")}
              </div>
           </div>
        )}
      </div>
    );
  }

  if (activeTab === "animation") {
    return (
      <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
         <div className="space-y-6">
            <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
               <Play size={14} className="text-wine" /> Motion & Behavior
            </h4>
            {type === "HERO" && content.variant === "holographic_layer" && (
              <div className="space-y-6">
                <div className="p-4 bg-wine/5 rounded-2xl border border-wine/10 space-y-4">
                  <span className="text-[10px] font-bold text-wine uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12} /> 3D Engine Precision (also in Content tab)
                  </span>
                  {renderSlider("3D Parallax Intensity", settings?.parallaxIntensity, "parallaxIntensity", "settings", 0, 50, 5)}
                  {renderSlider("Holographic Shimmer", settings?.shimmerIntensity, "shimmerIntensity", "settings", 0, 100, 10)}
                  {renderSlider("Layer Depth (Z-Gap)", settings?.layerGap, "layerGap", "settings", 20, 200, 10)}
                </div>
              </div>
            )}
            {renderSlider("Animation Speed", settings?.speed, "speed", "settings", 0.5, 3, 0.1, "s")}
            {renderSlider("Entry Delay", settings?.delay, "delay", "settings", 0, 2, 0.1, "s")}
         </div>
      </div>
    );
  }

  if (activeTab === "position") {
    return (
      <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
         <div className="space-y-6">
            <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
               <Move size={14} className="text-wine" /> Layout Position
            </h4>
            {renderSlider("Z-Index", style?.zIndex, "zIndex", "style", 0, 100, 1, "")}
            {renderSlider("Content Max Width", style?.maxWidth, "maxWidth", "style", 400, 1600, 50, "px")}
         </div>
      </div>
    );
  }

  return (
    <div className="p-12 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-center">
       <Settings2 size={24} className="text-gray-200 mb-4" />
       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select a tab to edit</p>
    </div>
  );
}

// ─── ChatGPT Prompt + Guide for Custom HTML blocks ───────────────────────────

const CHATGPT_PROMPT = `CONTEXT — Raaghas Website Design System
=================================================

I am creating custom HTML content blocks for the Raaghas website.
The site supports light and dark mode. You MUST use the CSS classes and rules below
so that all content automatically adapts to both themes. NEVER use hardcoded
colors like #ffffff, white, black, #1a1a1a, or Tailwind utility classes.

── AVAILABLE CSS CLASSES ──────────────────────────────────────────────────────

BACKGROUNDS:   rg-bg (page bg) | rg-surface (card/panel bg)
TEXT:          rg-text (primary) | rg-muted (secondary) | rg-accent (wine-red)
BORDERS:       rg-border (1px border) | rg-divider (horizontal rule)
CARDS:         rg-card | rg-card-lg | rg-glass-card
BADGES:        rg-badge (filled) | rg-badge-outline
BUTTONS:       rg-btn (filled wine) | rg-btn-outline
GRIDS:         rg-grid-2 | rg-grid-3 | rg-grid-4  (all stack on mobile)
SECTION:       rg-section (max-width container)
TYPOGRAPHY:    rg-heading | rg-subheading | rg-body
ACCENT BLOCKS: rg-wine-block (wine bg) | rg-dark-block (dark bg)

── RULES ──────────────────────────────────────────────────────────────────────

1. ALWAYS use rg-* classes for colors and backgrounds.
2. NEVER write style="color: #..." or style="background: #..."
3. Inline styles are ONLY for spacing (margin, padding, gap, width).
4. NEVER generate <style> blocks or global CSS. It breaks the host website.
5. Images: style="width:100%; border-radius:12px; display:block;"
6. Use semantic tags: <h2 class="rg-heading">, <p class="rg-body">, <span class="rg-muted">
7. Buttons as links: <a href="/collections/all" class="rg-btn">Shop Now</a>
8. Always include alt text on images.

── EXAMPLE OUTPUT ─────────────────────────────────────────────────────────────

<section class="rg-section">
  <p class="rg-subheading">New Collection</p>
  <h2 class="rg-heading" style="margin-bottom: 16px;">Handcrafted Luxury</h2>
  <p class="rg-body" style="margin-bottom: 32px;">Each piece is woven with care by master artisans.</p>
  <div class="rg-grid-3" style="margin-bottom: 40px;">
    <div class="rg-card">
      <span class="rg-badge" style="margin-bottom: 12px;">Bestseller</span>
      <h3 class="rg-text" style="font-size:16px; font-weight:700; margin-bottom:6px;">Kalamkari Kurti</h3>
      <p class="rg-muted" style="font-size:13px;">Natural dyes on handspun cotton.</p>
    </div>
  </div>
  <a href="/collections/all" class="rg-btn">Explore Collection</a>
</section>

── NOW ANSWER MY REQUEST ──────────────────────────────────────────────────────`;

const CLASS_REFERENCE = [
  { cls: "rg-card",        desc: "Card box with border" },
  { cls: "rg-card-lg",     desc: "Larger card, more padding" },
  { cls: "rg-glass-card",  desc: "Frosted glass effect" },
  { cls: "rg-text",        desc: "Primary text color" },
  { cls: "rg-muted",       desc: "Secondary / caption text" },
  { cls: "rg-accent",      desc: "Wine-red accent color" },
  { cls: "rg-btn",         desc: "Wine-red filled button" },
  { cls: "rg-btn-outline", desc: "Ghost outline button" },
  { cls: "rg-badge",       desc: "Filled pill badge" },
  { cls: "rg-badge-outline",desc: "Outline pill badge" },
  { cls: "rg-grid-2",      desc: "2-col (stacks mobile)" },
  { cls: "rg-grid-3",      desc: "3-col (stacks mobile)" },
  { cls: "rg-section",     desc: "Full-width container" },
  { cls: "rg-heading",     desc: "Large serif heading" },
  { cls: "rg-subheading",  desc: "Small uppercase label" },
  { cls: "rg-body",        desc: "Body paragraph" },
  { cls: "rg-wine-block",  desc: "Wine-red bg block" },
  { cls: "rg-divider",     desc: "Horizontal separator" },
];

function CustomHtmlGuide() {
  const [copied, setCopied] = useState(false);
  const [showClasses, setShowClasses] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const copyPrompt = () => {
    navigator.clipboard.writeText(CHATGPT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-3">

      {/* ── ChatGPT Prompt Panel ── */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-indigo-100">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Bot size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest">ChatGPT Assistant</p>
            <p className="text-[9px] text-indigo-500 leading-snug">Paste this prompt first, then ask for your HTML block</p>
          </div>
          <button
            onClick={copyPrompt}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
              copied
                ? "bg-green-500 text-white"
                : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
            }`}
          >
            {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy Prompt</>}
          </button>
        </div>

        {/* 3-step instruction */}
        <div className="px-4 py-3 space-y-2">
          {[
            { n: "1", t: "Open ChatGPT", d: "Start a new chat at chat.openai.com" },
            { n: "2", t: "Paste the prompt", d: "Click \"Copy Prompt\" above → paste as your first message" },
            { n: "3", t: "Ask for your block", d: 'Type your request, e.g. \'Make a 3-column feature section for our silk sarees\'' },
          ].map(s => (
            <div key={s.n} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</span>
              <div>
                <p className="text-[9px] font-bold text-indigo-800 uppercase tracking-wide">{s.t}</p>
                <p className="text-[9px] text-indigo-600 leading-relaxed">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Class Reference (collapsible) ── */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden">
        <button
          onClick={() => setShowClasses(!showClasses)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 transition-colors"
        >
          <span className="text-[10px] font-bold text-charcoal uppercase tracking-widest">rg-* Class Reference</span>
          {showClasses ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>
        {showClasses && (
          <div className="px-3 pb-3 grid grid-cols-1 gap-1">
            {CLASS_REFERENCE.map(({ cls, desc }) => (
              <div key={cls} className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg border border-gray-100">
                <code className="text-[9px] text-wine font-mono font-bold">{cls}</code>
                <span className="text-[9px] text-gray-500 ml-2 text-right">{desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Rules / Tips (collapsible) ── */}
      <div className="rounded-2xl border border-amber-100 bg-amber-50 overflow-hidden">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-100 transition-colors"
        >
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">⚠ Rules & Tips</span>
          {showInstructions ? <ChevronUp size={14} className="text-amber-500" /> : <ChevronDown size={14} className="text-amber-500" />}
        </button>
        {showInstructions && (
          <ul className="px-4 pb-4 space-y-1.5 list-none">
            {[
              ["✅", "Always use rg-* classes for colors"],
              ["❌", "Never use #fff, white, #1a1a1a, black"],
              ["❌", "Never use Tailwind classes (bg-white, text-gray-800)"],
              ["❌", "Never use <style> blocks (it breaks the whole site)"],
              ["✅", "Inline styles only for margin/padding/width/gap"],
              ["✅", "Images: style=\"width:100%; border-radius:12px; display:block;\""],
              ["✅", "Buttons: <a class=\"rg-btn\"> or <button class=\"rg-btn\">"],
              ["✅", "All grids use rg-grid-2 / rg-grid-3 for mobile stacking"],
              ["✅", "External <script> tags are blocked for security"],
            ].map(([icon, rule]) => (
              <li key={rule} className="flex gap-2 text-[9px] text-amber-800 leading-relaxed">
                <span className="shrink-0">{icon}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
