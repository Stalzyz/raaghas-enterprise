"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { Plus, Trash2, MapPin, Truck, ChevronRight, Save, Loader2, Globe, Map, Ship, Eye, EyeOff, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function ShippingConfigPage() {
  const { token } = useAdminAuth();
  const [zones, setZones] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showShiprocketPass, setShowShiprocketPass] = useState(false);
  const [showDelhiveryToken, setShowDelhiveryToken] = useState(false);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const baseUrl = API_BASE;
      
      const [zonesRes, settingsRes] = await Promise.all([
        fetch(`${baseUrl}/settings/shipping-zones`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/settings`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const zonesData = await zonesRes.json();
      const settingsData = await settingsRes.json();

      if (Array.isArray(zonesData)) setZones(zonesData);
      else setZones([]);

      if (settingsData) setSettings(settingsData);
    } catch (err) {
      console.error("Failed to fetch shipping data", err);
      setZones([]);
    } finally {
      setLoading(false);
    }
  };

  const addZone = () => {
    const newZone = {
      id: `temp-${Date.now()}`,
      name: "New Shipping Zone",
      regions: [],
      methods: [
        { name: "Standard Shipping", baseCost: 0, minOrderValue: 0, maxOrderValue: null }
      ]
    };
    setZones([...zones, newZone]);
  };

  const addRegion = (zoneId: string) => {
    const region = prompt("Enter region name (e.g. Tamil Nadu, UK, California):");
    if (region) {
      setZones(zones.map(z => z.id === zoneId ? { ...z, regions: [...(z.regions || []), region] } : z));
    }
  };

  const addMethod = (zoneId: string) => {
    const name = prompt("Enter method name:", "Express Shipping");
    if (name) {
      const newMethod = { name, baseCost: 100, minOrderValue: 0, maxOrderValue: null };
      setZones(zones.map(z => z.id === zoneId ? { ...z, methods: [...z.methods, newMethod] } : z));
    }
  };

  const deleteZone = async (zoneId: string) => {
    if (!confirm("Are you sure you want to delete this shipping zone?")) return;
    
    // If it's a new unsaved zone, just remove from state
    if (zoneId.startsWith('temp-')) {
      setZones(zones.filter(z => z.id !== zoneId));
      return;
    }

    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/logistics/zones/${zoneId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setZones(zones.filter(z => z.id !== zoneId));
      } else {
        alert("Failed to delete zone from server.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting zone.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const baseUrl = API_BASE;
      
      const [zonesRes, settingsRes] = await Promise.all([
        fetch(`${baseUrl}/settings/shipping-zones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ zones })
        }),
        fetch(`${baseUrl}/settings`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(settings)
        })
      ]);

      if (zonesRes.ok && settingsRes.ok) {
        alert("Shipping settings saved successfully!");
        fetchData();
      } else {
        alert("Failed to save shipping settings.");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-12 flex justify-center">
      <Loader2 className="animate-spin text-wine" size={32} />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-charcoal">Shipping Configuration</h1>
          <p className="text-sm text-gray-500 mt-1 font-sans">Define zones, delivery methods, and dynamic pricing rules.</p>
        </div>
        <button 
          onClick={addZone}
          className="bg-wine text-ivory px-6 py-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-all shadow-lg"
        >
          <Plus size={16} /> Add New Zone
        </button>
      </div>

      {/* Shipping Intelligence Module */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
           <Truck size={120} className="text-wine rotate-12" />
        </div>
        
        <div>
          <h3 className="text-sm font-bold text-wine uppercase tracking-widest flex items-center gap-2 mb-1">
            <Truck size={16} /> Shipping Intelligence & Integrations
          </h3>
          <p className="text-[11px] text-gray-500 font-medium">Automated fulfillment via Shiprocket and Delhivery.</p>
        </div>
        
        <div className="space-y-8 relative z-10">
          <div>
            <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Default Shipping Provider</label>
            <select 
              value={settings.shippingDefaultProvider || "shiprocket"}
              onChange={(e) => setSettings({ ...settings, shippingDefaultProvider: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
            >
              <option value="shiprocket">Shiprocket (Aggregator)</option>
              <option value="delhivery">Delhivery (Direct Carrier)</option>
            </select>
          </div>

          {/* Shiprocket Config */}
          <div className="border border-wine/5 p-6 rounded-2xl bg-wine/[0.02] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ship size={14} className="text-wine" />
                <h4 className="text-sm font-bold text-charcoal">Shiprocket Settings</h4>
              </div>
              <span className="text-[9px] font-bold bg-wine/10 text-wine px-2 py-0.5 rounded-full uppercase tracking-tighter">Recommended</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2">Login Email</label>
                <input 
                  type="email" 
                  value={settings.shiprocketEmail || ""}
                  onChange={(e) => setSettings({ ...settings, shiprocketEmail: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                  placeholder="admin@shiprocket.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2">Login Password</label>
                <div className="relative">
                  <input 
                    type={showShiprocketPass ? "text" : "password"} 
                    value={settings.shiprocketPassword || ""}
                    onChange={(e) => setSettings({ ...settings, shiprocketPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all pr-12"
                    placeholder="••••••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowShiprocketPass(!showShiprocketPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-wine transition-colors"
                  >
                    {showShiprocketPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2">Pickup Location ID</label>
              <input 
                type="text" 
                value={settings.shiprocketPickupLocation || "Primary"}
                onChange={(e) => setSettings({ ...settings, shiprocketPickupLocation: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                placeholder="Primary"
              />
            </div>
          </div>

          {/* Delhivery Config */}
          <div className="border border-gray-100 p-6 rounded-2xl bg-gray-50/50 space-y-4">
            <div className="flex items-center gap-2">
              <Truck size={14} className="text-gray-400" />
              <h4 className="text-sm font-bold text-charcoal">Delhivery Express Settings</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2">API Token</label>
                <div className="relative">
                  <input 
                    type={showDelhiveryToken ? "text" : "password"} 
                    value={settings.delhiveryToken || ""}
                    onChange={(e) => setSettings({ ...settings, delhiveryToken: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all pr-12"
                    placeholder="Token xxxxxxxxxxxxxxxx"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowDelhiveryToken(!showDelhiveryToken)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-wine transition-colors"
                  >
                    {showDelhiveryToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2">Environment</label>
                <select 
                  value={settings.delhiveryEnv || "test"}
                  onChange={(e) => setSettings({ ...settings, delhiveryEnv: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                >
                  <option value="test">Staging / Test</option>
                  <option value="production">Production / Live</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2">Pickup Location Name</label>
              <input 
                type="text" 
                value={settings.delhiveryPickupLocation || "Primary"}
                onChange={(e) => setSettings({ ...settings, delhiveryPickupLocation: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                placeholder="Primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Rules Engine Module */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
           <Truck size={120} className="text-wine rotate-12" />
        </div>
        
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h3 className="text-sm font-bold text-wine uppercase tracking-widest flex items-center gap-2 mb-1">
              <Tag size={16} /> Advanced Shipping Rules
            </h3>
            <p className="text-[11px] text-gray-500 font-medium">Build complex rules (like "Free Shipping over ₹15,000 in India") without any risk.</p>
          </div>
          <button 
            onClick={() => {
              const currentRules = Array.isArray(settings.customShippingRules) ? settings.customShippingRules : [];
              setSettings({
                ...settings,
                customShippingRules: [...currentRules, { 
                  name: 'New Custom Rule', 
                  zones: [], 
                  minCartValue: '', 
                  minItemCount: '', 
                  collection: '', 
                  cost: 0 
                }]
              });
            }}
            className="text-xs font-bold text-wine bg-wine/5 hover:bg-wine/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={14} /> Create Rule
          </button>
        </div>

        <div className="space-y-6 relative z-10">
          {(!settings.customShippingRules || settings.customShippingRules.length === 0) && (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-400 font-medium">No advanced rules configured.</p>
              <p className="text-xs text-gray-400 mt-1">Rules built here will override standard zone costs.</p>
            </div>
          )}
          
          {Array.isArray(settings.customShippingRules) && settings.customShippingRules.map((rule: any, idx: number) => (
            <div key={idx} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm space-y-6 hover:border-wine/30 transition-colors">
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div className="w-full max-w-md">
                   <input 
                     type="text" 
                     value={rule.name}
                     onChange={(e) => {
                       const newRules = [...settings.customShippingRules];
                       newRules[idx].name = e.target.value;
                       setSettings({ ...settings, customShippingRules: newRules });
                     }}
                     className="text-lg font-bold text-charcoal bg-transparent border-none focus:ring-0 p-0 w-full placeholder-gray-300"
                     placeholder="Rule Name (e.g., Summer VIP Shipping)"
                   />
                </div>
                <button 
                  onClick={() => {
                    const newRules = settings.customShippingRules.filter((_: any, i: number) => i !== idx);
                    setSettings({ ...settings, customShippingRules: newRules });
                  }}
                  className="text-gray-300 hover:text-red-500 transition-colors p-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Conditions Column */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Conditions (IF)</h4>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-charcoal uppercase mb-2">Target Zones (Leave empty for all)</label>
                    <div className="flex flex-wrap gap-2">
                      {zones.map(z => {
                        const isSelected = rule.zones && rule.zones.includes(z.name);
                        return (
                          <button
                            key={z.id}
                            onClick={() => {
                              const newRules = [...settings.customShippingRules];
                              const currentZones = newRules[idx].zones || [];
                              if (isSelected) {
                                newRules[idx].zones = currentZones.filter((name: string) => name !== z.name);
                              } else {
                                newRules[idx].zones = [...currentZones, z.name];
                              }
                              setSettings({ ...settings, customShippingRules: newRules });
                            }}
                            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                              isSelected 
                                ? 'bg-wine text-white border-wine' 
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {z.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-charcoal uppercase mb-1">Min Cart Value (₹)</label>
                      <input 
                        type="number" 
                        value={rule.minCartValue}
                        onChange={(e) => {
                          const newRules = [...settings.customShippingRules];
                          newRules[idx].minCartValue = e.target.value;
                          setSettings({ ...settings, customShippingRules: newRules });
                        }}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:border-wine focus:bg-white transition-colors"
                        placeholder="e.g. 15000"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-charcoal uppercase mb-1">Min Item Count</label>
                      <input 
                        type="number" 
                        value={rule.minItemCount}
                        onChange={(e) => {
                          const newRules = [...settings.customShippingRules];
                          newRules[idx].minItemCount = e.target.value;
                          setSettings({ ...settings, customShippingRules: newRules });
                        }}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:border-wine focus:bg-white transition-colors"
                        placeholder="e.g. 5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-charcoal uppercase mb-1">Specific Collection (Optional)</label>
                    <input 
                      type="text" 
                      value={rule.collection}
                      onChange={(e) => {
                        const newRules = [...settings.customShippingRules];
                        newRules[idx].collection = e.target.value;
                        setSettings({ ...settings, customShippingRules: newRules });
                      }}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:border-wine focus:bg-white transition-colors"
                      placeholder="e.g. Bridal Collection"
                    />
                  </div>
                </div>

                {/* Action Column */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-wine uppercase tracking-widest border-b border-wine/10 pb-2">Action (THEN)</h4>
                  
                  <div className="bg-wine/5 border border-wine/10 p-4 rounded-xl space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-wine uppercase mb-2">Base Shipping Cost (₹)</label>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-serif text-wine font-bold">₹</span>
                        <input 
                          type="number" 
                          value={rule.cost}
                          onChange={(e) => {
                            const newRules = [...settings.customShippingRules];
                            newRules[idx].cost = Number(e.target.value);
                            setSettings({ ...settings, customShippingRules: newRules });
                          }}
                          className="w-full px-4 py-3 bg-white border border-wine/20 rounded-xl text-lg font-bold outline-none focus:border-wine shadow-inner"
                          placeholder="0 for Free"
                        />
                      </div>
                      <p className="text-[10px] text-wine/70 font-medium mt-2">
                        If conditions are met, the base cost is overridden to this amount.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-wine/10 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-wine uppercase mb-2">Included Items</label>
                        <input 
                          type="number" 
                          value={rule.baseItemCount || ''}
                          onChange={(e) => {
                            const newRules = [...settings.customShippingRules];
                            newRules[idx].baseItemCount = e.target.value ? Number(e.target.value) : undefined;
                            setSettings({ ...settings, customShippingRules: newRules });
                          }}
                          className="w-full px-3 py-2 bg-white border border-wine/20 rounded-lg text-sm outline-none focus:border-wine"
                          placeholder="e.g. 3"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-wine uppercase mb-2">Extra Cost per Item (₹)</label>
                        <input 
                          type="number" 
                          value={rule.extraItemCost || ''}
                          onChange={(e) => {
                            const newRules = [...settings.customShippingRules];
                            newRules[idx].extraItemCost = e.target.value ? Number(e.target.value) : undefined;
                            setSettings({ ...settings, customShippingRules: newRules });
                          }}
                          className="w-full px-3 py-2 bg-white border border-wine/20 rounded-lg text-sm outline-none focus:border-wine"
                          placeholder="e.g. 50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        {zones.map((zone) => (
          <motion.div 
            key={zone.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-wine/10 text-wine rounded-2xl">
                  {zone.name === 'International' ? <Globe size={20} /> : <Map size={20} />}
                </div>
                <div>
                  <input 
                    className="text-lg font-bold text-charcoal bg-transparent border-none focus:ring-0 p-0"
                    value={zone.name}
                    onChange={(e) => {
                      const newZones = zones.map(z => z.id === zone.id ? { ...z, name: e.target.value } : z);
                      setZones(newZones);
                    }}
                  />
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-0.5">
                    {zone.regions?.length || 0} Regions Covered
                  </p>
                </div>
              </div>
              <button 
                onClick={() => deleteZone(zone.id)}
                className="text-red-400 hover:text-red-600 p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="p-8 grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <MapPin size={14} /> Regional Reach
                </div>
                <div className="flex flex-wrap gap-2">
                  {(zone.regions || []).map((region: string) => (
                    <span key={region} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {region}
                    </span>
                  ))}
                  <button 
                    onClick={() => addRegion(zone.id)}
                    className="px-3 py-1 border border-dashed border-gray-200 text-gray-400 rounded-full text-[10px] font-bold uppercase tracking-wider hover:border-wine hover:text-wine transition-all"
                  >
                    + Add Region
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <Truck size={14} /> Delivery Methods
                </div>
                <div className="space-y-4">
                  {zone.methods.map((method: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center group/method">
                      <div className="flex-1">
                        <input 
                          className="text-sm font-bold text-charcoal bg-transparent border-none focus:ring-0 p-0 w-full"
                          value={method.name}
                          onChange={(e) => {
                            const newZones = zones.map(z => z.id === zone.id ? {
                              ...z,
                              methods: z.methods.map((m: any, mIdx: number) => mIdx === idx ? { ...m, name: e.target.value } : m)
                            } : z);
                            setZones(newZones);
                          }}
                        />
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-medium">Min Cart ₹</span>
                            <input 
                              type="number"
                              className="text-[10px] text-gray-400 font-bold bg-transparent border-b border-gray-200 focus:border-primary focus:ring-0 p-0 w-16"
                              value={method.minOrderValue ?? ''}
                              placeholder="0"
                              onChange={(e) => {
                                const newZones = zones.map(z => z.id === zone.id ? {
                                  ...z,
                                  methods: z.methods.map((m: any, mIdx: number) => mIdx === idx ? { ...m, minOrderValue: e.target.value ? parseFloat(e.target.value) : null } : m)
                                } : z);
                                setZones(newZones);
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-medium">Max Cart ₹</span>
                            <input 
                              type="number"
                              className="text-[10px] text-gray-400 font-bold bg-transparent border-b border-gray-200 focus:border-primary focus:ring-0 p-0 w-16"
                              value={method.maxOrderValue ?? ''}
                              placeholder="∞"
                              onChange={(e) => {
                                const newZones = zones.map(z => z.id === zone.id ? {
                                  ...z,
                                  methods: z.methods.map((m: any, mIdx: number) => mIdx === idx ? { ...m, maxOrderValue: e.target.value ? parseFloat(e.target.value) : null } : m)
                                } : z);
                                setZones(newZones);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div className="flex items-center gap-1">
                           <span className="text-sm font-bold text-wine">₹</span>
                           <input 
                             type="number"
                             className="text-sm font-bold text-wine bg-transparent border-none focus:ring-0 p-0 w-16 text-right"
                             value={method.baseCost}
                             onChange={(e) => {
                               const newZones = zones.map(z => z.id === zone.id ? {
                                 ...z,
                                 methods: z.methods.map((m: any, mIdx: number) => mIdx === idx ? { ...m, baseCost: parseFloat(e.target.value) || 0 } : m)
                               } : z);
                               setZones(newZones);
                             }}
                           />
                        </div>
                        <button 
                          onClick={() => {
                            const newZones = zones.map(z => z.id === zone.id ? {
                              ...z,
                              methods: z.methods.filter((_: any, mIdx: number) => mIdx !== idx)
                            } : z);
                            setZones(newZones);
                          }}
                          className="opacity-0 group-hover/method:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => addMethod(zone.id)}
                    className="w-full py-3 border border-dashed border-gray-200 text-gray-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:border-wine hover:text-wine transition-all"
                  >
                    + Add Method
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-end pt-8">
        <button 
          onClick={handleSave}
          className="bg-charcoal text-ivory px-10 py-4 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest hover:bg-wine transition-all shadow-xl disabled:opacity-50"
          disabled={saving}
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save Shipping Policy
        </button>
      </div>
    </div>
  );
}
