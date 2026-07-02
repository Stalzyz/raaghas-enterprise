"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronRight, Save, Loader2, GripVertical, Menu as MenuIcon, ExternalLink } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function NavigationPage() {
  const { token } = useAdminAuth();
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/navigation`);
      const data = await res.json();
      setMenus(data);
      if (data.length > 0) setSelectedMenu(data[0]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMenuItem = (parentId: string | null = null) => {
    if (!selectedMenu) return;
    
    const newItem = {
      label: "New Link",
      url: "/",
      children: []
    };

    const updatedMenu = { ...selectedMenu };
    if (!parentId) {
      updatedMenu.items = [...updatedMenu.items, newItem];
    } else {
      updatedMenu.items = updatedMenu.items.map((item: any) => {
        if (item.id === parentId) {
          return { ...item, children: [...(item.children || []), newItem] };
        }
        return item;
      });
    }
    setSelectedMenu(updatedMenu);
  };

  const handleUpdateItem = (index: number, parentIndex: number | null, field: string, value: string) => {
    const updatedMenu = { ...selectedMenu };
    if (parentIndex === null) {
      updatedMenu.items[index][field] = value;
    } else {
      updatedMenu.items[parentIndex].children[index][field] = value;
    }
    setSelectedMenu(updatedMenu);
  };

  const handleRemoveItem = (index: number, parentIndex: number | null) => {
    const updatedMenu = { ...selectedMenu };
    if (parentIndex === null) {
      updatedMenu.items.splice(index, 1);
    } else {
      updatedMenu.items[parentIndex].children.splice(index, 1);
    }
    setSelectedMenu(updatedMenu);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch(`${API_BASE}/navigation`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(selectedMenu)
      });
      alert("Menu saved successfully");
    } catch (error) {
      alert("Error saving menu");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-wine" size={40} /></div>;
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Navigation Master</h2>
          <p className="text-gray-500 font-medium font-sans text-sm mt-1">Orchestrate the user journey across header and footer menus.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-charcoal text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-wine transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? "Saving..." : "Keep Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Menu Selection */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-4 shadow-sm">
           <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Menus</h3>
           {menus.map((menu) => (
             <button
               key={menu.id}
               onClick={() => setSelectedMenu(menu)}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedMenu?.id === menu.id ? 'bg-wine/5 text-wine border-wine/10 border' : 'text-gray-400 hover:bg-gray-50 border border-transparent'}`}
             >
                <MenuIcon size={18} /> {menu.name}
             </button>
           ))}
           <button className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-4 border-2 border-dashed border-gray-100 rounded-xl text-[10px] font-bold text-gray-300 hover:border-wine hover:text-wine transition-all uppercase tracking-widest">
              <Plus size={14} /> Create New Menu
           </button>
        </div>

        {/* Menu Items Editor */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm flex flex-col">
          {selectedMenu ? (
            <>
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                 <div>
                    <h3 className="text-xl font-bold text-charcoal">{selectedMenu.name}</h3>
                    <p className="text-xs text-gray-400 font-medium font-sans mt-0.5">Handle: <code className="bg-gray-100 px-1.5 py-0.5 rounded italic">{selectedMenu.handle}</code></p>
                 </div>
                 <button onClick={() => handleAddMenuItem()} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-wine transition-all">
                    <Plus size={14} /> Add Top Level Link
                 </button>
              </div>

              <div className="p-8 space-y-4 overflow-y-auto max-h-[600px]">
                 {selectedMenu.items.map((item: any, idx: number) => (
                   <div key={idx} className="space-y-3">
                      <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl group border border-transparent hover:border-wine/20 hover:bg-white transition-all">
                         <div className="cursor-grab text-gray-300 group-hover:text-wine"><GripVertical size={20} /></div>
                         <div className="grid grid-cols-2 gap-4 flex-1">
                            <input 
                              value={item.label}
                              onChange={(e) => handleUpdateItem(idx, null, 'label', e.target.value)}
                              className="bg-transparent text-sm font-bold border-b border-transparent focus:border-wine outline-none py-1"
                              placeholder="Label"
                            />
                            <div className="flex items-center gap-2">
                               <ExternalLink size={14} className="text-gray-300" />
                               <input 
                                value={item.url}
                                onChange={(e) => handleUpdateItem(idx, null, 'url', e.target.value)}
                                className="bg-transparent text-xs text-gray-400 border-b border-transparent focus:border-wine outline-none py-1 flex-1 font-sans"
                                placeholder="/url"
                               />
                            </div>
                         </div>
                         <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleAddMenuItem(item.id)} className="p-2 hover:bg-wine/5 text-gray-400 hover:text-wine rounded-lg transition-all"><Plus size={18} /></button>
                            <button onClick={() => handleRemoveItem(idx, null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"><Trash2 size={18} /></button>
                         </div>
                      </div>

                      {/* Nested Items */}
                      <div className="pl-12 space-y-2">
                         {item.children?.map((child: any, childIdx: number) => (
                           <div key={childIdx} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100/50 group hover:border-wine/10 hover:shadow-sm transition-all">
                              <span className="text-gray-200"><ChevronRight size={16} /></span>
                              <div className="grid grid-cols-2 gap-4 flex-1">
                                 <input 
                                   value={child.label}
                                   onChange={(e) => handleUpdateItem(childIdx, idx, 'label', e.target.value)}
                                   className="bg-transparent text-xs font-bold border-b border-transparent focus:border-wine outline-none py-1"
                                 />
                                 <input 
                                   value={child.url}
                                   onChange={(e) => handleUpdateItem(childIdx, idx, 'url', e.target.value)}
                                   className="bg-transparent text-[10px] text-gray-400 border-b border-transparent focus:border-wine outline-none py-1 items-center font-sans"
                                 />
                              </div>
                              <button onClick={() => handleRemoveItem(childIdx, idx)} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
                           </div>
                         ))}
                      </div>
                   </div>
                 ))}
                 {selectedMenu.items.length === 0 && (
                   <div className="text-center py-20 text-gray-300 font-medium">No links in this menu. Add one to get started.</div>
                 )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-4">
               <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300"><MenuIcon size={32} /></div>
               <h3 className="text-lg font-bold text-charcoal">Select a menu to orchestrate</h3>
               <p className="text-sm text-gray-400 max-w-xs">Manage the structure and flow of your site's navigation from here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
