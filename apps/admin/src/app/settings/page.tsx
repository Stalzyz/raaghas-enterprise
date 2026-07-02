"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { Save, Globe, Phone, Mail, Link2, Share2, Loader2, CheckCircle2, MessageSquare, Shield, Eye, EyeOff, CreditCard, Receipt, MapPin, Landmark, Percent, ShieldCheck, Target, BarChart3, Sparkles, Hash } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function SettingsPage() {
  const { token } = useAdminAuth();
  const [settings, setSettings] = useState<any>({
    storeName: "",
    supportPhone: "",
    supportEmail: "",
    instagramUrl: "",
    facebookUrl: "",
    whatsappApiUrl: "https://api.grafty.pro/v1",
    whatsappApiKey: "",
    whatsappAppId: "",
    // Financial Fields
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    accountName: "",
    gstNumber: "",
    businessAddress: "",
    businessState: "Tamil Nadu",
    defaultGstRate: 5.0,
    // Payment Gateways
    activePaymentGateway: "BOTH",
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayWebhookSecret: "",
    phonepeMerchantId: "",
    phonepeMerchantUserId: "",
    phonepeSaltKey: "",
    phonepeSaltIndex: "1",
    // Marketing & Tracking
    metaPixelId: "",
    metaCapiToken: "",
    // Growth & Rewards Control
    referralRewardPercent: 10.00,
    welcomeDiscountPercent: 10.00,
    maxCreditUsagePercent: 50.00,
    loyaltyMinOrderValue: 2000.00,
    loyaltyPointsRate: 1.00,
    // Security & 2FA
    googleAuthSecret: "",
    googleClientId: "",
    googleClientSecret: "",
    // Shipping Providers
    shippingDefaultProvider: "shiprocket",
    shiprocketEmail: "",
    shiprocketPassword: "",
    shiprocketPickupLocation: "Primary",
    delhiveryToken: "",
    delhiveryEnv: "test",
    delhiveryPickupLocation: "Primary",
    aiAssistantEnabled: true,
    openAiApiKey: "",
    // SMTP Settings
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpSecure: false,
    // Order Formatting
    orderPrefix: "RGH-",
    orderSuffix: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [showRazorpayWebhookSecret, setShowRazorpayWebhookSecret] = useState(false);
  const [showPhonepeSalt, setShowPhonepeSalt] = useState(false);
  const [showMetaCapi, setShowMetaCapi] = useState(false);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showGoogleClientSecret, setShowGoogleClientSecret] = useState(false);
  const [showShiprocketPass, setShowShiprocketPass] = useState(false);
  const [showDelhiveryToken, setShowDelhiveryToken] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [token]);

  const fetchSettings = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/settings`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        console.error("Auth: Session expired or invalid");
        return;
      }
      const data = await res.json();
      setSettings(prev => ({
        ...prev,
        ...data,
        whatsappApiUrl: data.whatsappApiUrl || "https://api.grafty.pro/v1"
      }));
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token) {
       alert("Session expired. Please login again.");
       return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      // 🛡️ Atomic Cleaning: Strip internal and computed fields
      const { 
        id, createdAt, updatedAt, 
        _count, ...cleanSettings 
      } = settings;

      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(cleanSettings)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Unknown server error" }));
        const errorMessage = errorData.message || errorData.errorMessage || "Failed to update settings";
        console.error("Atomic Error Detail:", errorData);
        throw new Error(errorMessage);
      }

      setMessage("Settings updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-wine" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-charcoal">Store Settings</h2>
        <p className="text-gray-500 font-medium font-sans text-sm mt-1">Manage your brand identity, support channels, and AI integrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Contact Intelligence */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Email (SMTP) Configuration */}
          <div className="bg-white p-8 rounded-3xl border-2 border-blue-500/10 shadow-sm space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
               <Mail size={120} className="text-blue-500 rotate-12" />
            </div>
            
            <div>
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-1">
                <Mail size={16} /> Email Automation (SMTP)
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">Configure your primary mail server for order receipts and notifications.</p>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">SMTP Host</label>
                  <input 
                    type="text" 
                    value={settings.smtpHost || ""}
                    onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-blue-500 transition-all"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">SMTP Port</label>
                  <input 
                    type="number" 
                    value={settings.smtpPort || 587}
                    onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">SMTP User</label>
                  <input 
                    type="text" 
                    value={settings.smtpUser || ""}
                    onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-blue-500 transition-all"
                    placeholder="notifications@raaghas.in"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">SMTP Password</label>
                  <div className="relative">
                    <input 
                      type={showSmtpPass ? "text" : "password"} 
                      value={settings.smtpPass || ""}
                      onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-blue-500 transition-all pr-12"
                      placeholder="••••••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl items-start md:items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-blue-600" />
                  <p className="text-[10px] text-blue-800 font-medium leading-relaxed">
                    The system uses TLS/SSL automatically based on the port provided. For Gmail/Outlook, use port 587.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                   <input 
                    type="checkbox" 
                    id="smtpSecure"
                    checked={settings.smtpSecure || false}
                    onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                   />
                   <label htmlFor="smtpSecure" className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">Use SSL/TLS</label>
                </div>
              </div>
            </div>
          </div>
          
          {/* WhatsApp Autopilot Bridge (Grafty.pro) */}
          <div className="bg-white p-8 rounded-3xl border-2 border-wine/10 shadow-sm space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
               <MessageSquare size={120} className="text-wine rotate-12" />
            </div>
            
            <div>
              <h3 className="text-sm font-bold text-wine uppercase tracking-widest flex items-center gap-2 mb-1">
                <MessageSquare size={16} /> WhatsApp Autopilot (Grafty.pro)
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">Boutique-level automation for retail orders and marketing.</p>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Grafty API URL <span className="text-wine">*</span></label>
                  <input 
                    type="text" 
                    value={settings.whatsappApiUrl || ""}
                    onChange={(e) => setSettings({ ...settings, whatsappApiUrl: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                    placeholder="https://api.grafty.pro/v1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Grafty App ID <span className="text-wine">*</span></label>
                  <input 
                    type="text" 
                    value={settings.whatsappAppId || ""}
                    onChange={(e) => setSettings({ ...settings, whatsappAppId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                    placeholder="raaghas_main_01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Shield size={12} className="text-wine" /> Grafty API Key <span className="text-wine">*</span>
                </label>
                <div className="relative">
                  <input 
                    type={showApiKey ? "text" : "password"} 
                    value={settings.whatsappApiKey || ""}
                    onChange={(e) => setSettings({ ...settings, whatsappApiKey: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all pr-12"
                    placeholder="gr_live_xxxxxxxxxxxxxxxx"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-wine transition-colors"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium italic">Credentials are masked for security. This key enables automated order confirmations.</p>
              </div>

              {/* Nudge Schedule Status */}
              <div className="bg-wine/5 border border-wine/10 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  </div>
                  <h4 className="text-[10px] font-bold text-wine uppercase tracking-widest">Nudge Engine Active</h4>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed font-sans">
                  Automated cart recovery crons are active. Once credentials are saved, the system will trigger:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-2.5 rounded-xl border border-wine/5">
                    <p className="text-[9px] font-bold text-charcoal uppercase tracking-tighter mb-1">Nudge #1</p>
                    <p className="text-[11px] font-bold text-wine">Every 30 Min</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-wine/5">
                    <p className="text-[9px] font-bold text-charcoal uppercase tracking-tighter mb-1">Nudge #2</p>
                    <p className="text-[11px] font-bold text-wine">Every 1 Hour</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Landmark size={14} /> Settlement & Logistics
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Accounting Name</label>
                  <input 
                    type="text" 
                    value={settings.accountName || ""}
                    onChange={(e) => setSettings({ ...settings, accountName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                    placeholder="Raaghas Pvt Ltd"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Business GSTIN</label>
                  <input 
                    type="text" 
                    value={settings.gstNumber || ""}
                    onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all uppercase"
                    placeholder="33AABCU9603R1ZX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Bank Name</label>
                  <input 
                    type="text" 
                    value={settings.bankName || ""}
                    onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                    placeholder="HDFC Bank, Chennai"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">IFSC Code</label>
                  <input 
                    type="text" 
                    value={settings.ifscCode || ""}
                    onChange={(e) => setSettings({ ...settings, ifscCode: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all uppercase"
                    placeholder="HDFC0001234"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Account Number</label>
                <div className="relative">
                  <CreditCard size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input 
                    type="text" 
                    value={settings.accountNumber || ""}
                    onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                    placeholder="50200012345678"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Base State (for GST)</label>
                    <select 
                      value={settings.businessState || "Tamil Nadu"}
                      onChange={(e) => setSettings({ ...settings, businessState: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all appearance-none"
                    >
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Telangana">Telangana</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Delhi">Delhi</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Percent size={12} className="text-wine" /> Default Wholesale GST
                    </label>
                    <input 
                      type="number" 
                      value={settings.defaultGstRate || 5}
                      onChange={(e) => setSettings({ ...settings, defaultGstRate: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                    />
                 </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2 flex items-center gap-2">
                  <MapPin size={12} className="text-wine" /> Registered Business Address
                </label>
                <textarea 
                  value={settings.businessAddress || ""}
                  onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                  placeholder="Street, City, Zip"
                ></textarea>
              </div>
              
              <div className="pt-6 border-t border-gray-100 space-y-6">
                <h4 className="text-[10px] font-bold text-wine uppercase tracking-[0.2em]">Order Number Formatting</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Hash size={12} className="text-wine" /> Order Prefix
                    </label>
                    <input 
                      type="text" 
                      value={settings.orderPrefix || ""}
                      onChange={(e) => setSettings({ ...settings, orderPrefix: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                      placeholder="RGH-"
                    />
                    <p className="text-[10px] text-gray-400 mt-2 font-medium italic">Example: RGH- (Result: RGH-1024)</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Hash size={12} className="text-wine" /> Order Suffix
                    </label>
                    <input 
                      type="text" 
                      value={settings.orderSuffix || ""}
                      onChange={(e) => setSettings({ ...settings, orderSuffix: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                      placeholder="-ON"
                    />
                    <p className="text-[10px] text-gray-400 mt-2 font-medium italic">Example: -ON (Result: 1024-ON)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>



          <div className="bg-white p-8 rounded-3xl border-2 border-wine/10 shadow-sm space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
               <Sparkles size={120} className="text-wine rotate-12" />
            </div>
            
            <div>
              <h3 className="text-sm font-bold text-wine uppercase tracking-widest flex items-center gap-2 mb-1">
                <Sparkles size={16} /> Growth & Rewards Control
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">Configure automated referral rewards and customer credit limits.</p>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2 flex items-center gap-2">
                    Referral Reward (%)
                  </label>
                  <div className="relative">
                    <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="number" 
                      value={settings.referralRewardPercent || 10}
                      onChange={(e) => setSettings({ ...settings, referralRewardPercent: parseFloat(e.target.value) })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                      placeholder="10"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">% of order total awarded to the referrer.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2 flex items-center gap-2">
                    Welcome Discount (%)
                  </label>
                  <div className="relative">
                    <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="number" 
                      value={settings.welcomeDiscountPercent || 10}
                      onChange={(e) => setSettings({ ...settings, welcomeDiscountPercent: parseFloat(e.target.value) })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                      placeholder="10"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">Value of the automated welcome coupon.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2 flex items-center gap-2">
                    Max Credit Usage (%)
                  </label>
                  <div className="relative">
                    <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="number" 
                      value={settings.maxCreditUsagePercent || 50}
                      onChange={(e) => setSettings({ ...settings, maxCreditUsagePercent: parseFloat(e.target.value) })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                      placeholder="50"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">Maximum % of an order total payable via wallet.</p>
                </div>
              </div>

              <div className="pt-6 border-t border-wine/5 space-y-6">
                <h4 className="text-[10px] font-bold text-wine uppercase tracking-[0.2em] mb-4">Loyalty & Store Credit System</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2 flex items-center gap-2">
                      Min. Cart Value for Points (₹)
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={settings.loyaltyMinOrderValue || 2000}
                        onChange={(e) => setSettings({ ...settings, loyaltyMinOrderValue: parseFloat(e.target.value) })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                        placeholder="2000"
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1">Orders below this amount will not earn loyalty points.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2 flex items-center gap-2">
                      Points Conversion Rate
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={settings.loyaltyPointsRate || 1}
                        onChange={(e) => setSettings({ ...settings, loyaltyPointsRate: parseFloat(e.target.value) })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                        placeholder="1"
                        step="0.1"
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1">Number of points earned per ₹100 spent (e.g., 1 point = 1%).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Target size={14} className="text-wine" /> Marketing & Tracking (Meta / Pixels)
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Meta Pixel ID</label>
                <input 
                  type="text" 
                  value={settings.metaPixelId || ""}
                  onChange={(e) => setSettings({ ...settings, metaPixelId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                  placeholder="123456789012345"
                />
                <p className="text-[10px] text-gray-400 mt-2">Essential for tracking PageViews, AddToCart, and Purchases.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2 flex items-center gap-2">
                   Meta Conversion API (CAPI) Token
                </label>
                <div className="relative">
                  <input 
                    type={showMetaCapi ? "text" : "password"} 
                    value={settings.metaCapiToken || ""}
                    onChange={(e) => setSettings({ ...settings, metaCapiToken: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all pr-12"
                    placeholder="EAAGxxxxxxxxxxxx..."
                  />
                  <button 
                    type="button"
                    onClick={() => setShowMetaCapi(!showMetaCapi)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-wine transition-colors"
                  >
                    {showMetaCapi ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium italic">Server-side events bypass browser ad-blockers for 100% accurate tracking.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border-2 border-wine/10 shadow-sm space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
               <ShieldCheck size={120} className="text-wine rotate-12" />
            </div>
            
            <div>
              <h3 className="text-sm font-bold text-wine uppercase tracking-widest flex items-center gap-2 mb-1">
                <ShieldCheck size={16} /> Security & 2FA Authenticator
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">Site-wide secondary credential for Google Authenticator.</p>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2 flex items-center gap-2">
                   Google Authenticator Secret
                </label>
                <div className="relative">
                  <input 
                    type={showGoogleSecret ? "text" : "password"} 
                    value={settings.googleAuthSecret || ""}
                    onChange={(e) => setSettings({ ...settings, googleAuthSecret: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all pr-12"
                    placeholder="JBSWY3DPEHPK3PXP"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-wine transition-colors"
                  >
                    {showGoogleSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium italic">Store this secret in your Google Authenticator app. Used for critical admin overrides.</p>
              </div>

              <div className="pt-6 border-t border-wine/5 space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-wine uppercase tracking-[0.2em] mb-4">Google Social Login (OAuth)</h4>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Google Client ID</label>
                  <input 
                    type="text" 
                    value={settings.googleClientId || ""}
                    onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                    placeholder="1234567890-xxxxxxxxxxxx.apps.googleusercontent.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Google Client Secret</label>
                  <div className="relative">
                    <input 
                      type={showGoogleClientSecret ? "text" : "password"} 
                      value={settings.googleClientSecret || ""}
                      onChange={(e) => setSettings({ ...settings, googleClientSecret: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all pr-12"
                      placeholder="GOCSPX-xxxxxxxxxxxx"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowGoogleClientSecret(!showGoogleClientSecret)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-wine transition-colors"
                    >
                      {showGoogleClientSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 font-medium italic">Required for the "Sign in with Google" feature on the storefront.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Eye size={14} /> Custom Scripts & Styles
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Custom Head HTML</label>
                <textarea 
                  value={settings.customHeadHtml || ""}
                  onChange={(e) => setSettings({ ...settings, customHeadHtml: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-mono outline-none focus:border-wine transition-all"
                  placeholder="<script>...</script> (Injected into <head>)"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Custom Global CSS</label>
                <textarea 
                  value={settings.customGlobalCss || ""}
                  onChange={(e) => setSettings({ ...settings, customGlobalCss: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-mono outline-none focus:border-wine transition-all"
                  placeholder="body { background: #... } (Injected globally)"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Custom Footer HTML</label>
                <textarea 
                  value={settings.customFooterHtml || ""}
                  onChange={(e) => setSettings({ ...settings, customFooterHtml: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-mono outline-none focus:border-wine transition-all"
                  placeholder="<div>...</div> (Rendered above footer copyright)"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">

            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Phone size={14} /> Support Channel
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">WhatsApp / Support Phone</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">+91</span>
                  <input 
                    type="text" 
                    value={settings.supportPhone || ""}
                    onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Support Email</label>
                <input 
                  type="email" 
                  value={settings.supportEmail || ""}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                  placeholder="care@raaghas.com"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Globe size={14} /> Global Identity
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Legal Store Name</label>
                <input 
                  type="text" 
                  value={settings.storeName || ""}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                  placeholder="Raaghas"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Brand Tagline</label>
                <input 
                  type="text" 
                  value={settings.tagline || ""}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                  placeholder="Luxury ethnic wear crafted for the moments that matter most."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Footer Copyright Notice</label>
                <input 
                  type="text" 
                  value={settings.footerCopyright || ""}
                  onChange={(e) => setSettings({ ...settings, footerCopyright: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                  placeholder="© 2026 Raaghas. All rights reserved."
                />
              </div>
            </div>
          </div>

          {/* Payment Gateways Module */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <CreditCard size={14} /> Payment Gateways
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Active Payment Gateway</label>
                <select 
                  value={settings.activePaymentGateway || "BOTH"}
                  onChange={(e) => setSettings({ ...settings, activePaymentGateway: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                >
                  <option value="BOTH">Razorpay & PhonePe (Dual Engine)</option>
                  <option value="RAZORPAY">Razorpay Only</option>
                  <option value="PHONEPE">PhonePe Only</option>
                </select>
              </div>

              {/* Razorpay Config */}
              <div className="border border-gray-100 p-6 rounded-2xl bg-gray-50/50 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <h4 className="text-sm font-bold text-charcoal">Razorpay Configuration</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2 text-wine">Key ID</label>
                    <input 
                      type="text" 
                      value={settings.razorpayKeyId || ""}
                      onChange={(e) => setSettings({ ...settings, razorpayKeyId: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                      placeholder="rzp_live_xxx..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2 text-wine">Key Secret</label>
                    <div className="relative">
                      <input 
                        type={showRazorpaySecret ? "text" : "password"} 
                        value={settings.razorpayKeySecret || ""}
                        onChange={(e) => setSettings({ ...settings, razorpayKeySecret: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all pr-12"
                        placeholder="•••••••••••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-wine transition-colors"
                      >
                        {showRazorpaySecret ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2 text-wine">Webhook Secret</label>
                  <div className="relative">
                    <input 
                      type={showRazorpayWebhookSecret ? "text" : "password"} 
                      value={settings.razorpayWebhookSecret || ""}
                      onChange={(e) => setSettings({ ...settings, razorpayWebhookSecret: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all pr-12"
                      placeholder="•••••••••••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowRazorpayWebhookSecret(!showRazorpayWebhookSecret)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-wine transition-colors"
                    >
                      {showRazorpayWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Required to verify incoming payment webhooks from Razorpay.</p>
                </div>
              </div>

              {/* PhonePe Config */}
              <div className="border border-gray-100 p-6 rounded-2xl bg-gray-50/50 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <h4 className="text-sm font-bold text-charcoal">PhonePe Integration (S2S)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2">Merchant ID</label>
                    <input 
                      type="text" 
                      value={settings.phonepeMerchantId || ""}
                      onChange={(e) => setSettings({ ...settings, phonepeMerchantId: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                      placeholder="M23061604832206"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2">Merchant User ID</label>
                    <input 
                      type="text" 
                      value={settings.phonepeMerchantUserId || ""}
                      onChange={(e) => setSettings({ ...settings, phonepeMerchantUserId: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                      placeholder="MUIDxxxxxx"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2">Salt Key</label>
                    <div className="relative">
                      <input 
                        type={showPhonepeSalt ? "text" : "password"} 
                        value={settings.phonepeSaltKey || ""}
                        onChange={(e) => setSettings({ ...settings, phonepeSaltKey: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all pr-12"
                        placeholder="•••••••••••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPhonepeSalt(!showPhonepeSalt)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-wine transition-colors"
                      >
                        {showPhonepeSalt ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-charcoal uppercase tracking-widest mb-2">Salt Index</label>
                    <input 
                      type="text" 
                      value={settings.phonepeSaltIndex || "1"}
                      onChange={(e) => setSettings({ ...settings, phonepeSaltIndex: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Social Presence */}
        <div className="space-y-6">
          {/* AI Assistant Configuration */}
          <div className="bg-white p-8 rounded-3xl border-2 border-wine/10 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-wine uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={16} /> AI Muse Config
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.aiAssistantEnabled} 
                  onChange={(e) => setSettings({ ...settings, aiAssistantEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-wine"></div>
              </label>
            </div>
            <p className="text-[10px] text-gray-500 font-medium">Enable or disable the "Raaga Muse" AI assistant on the storefront.</p>
            
            <div className="pt-4 border-t border-gray-100">
              <label className="flex items-center gap-2 text-xs font-bold text-charcoal uppercase tracking-widest mb-2">
                OpenAI API Key
              </label>
              <div className="relative">
                <input 
                  type={showOpenAiKey ? "text" : "password"} 
                  value={settings.openAiApiKey || ""}
                  onChange={(e) => setSettings({ ...settings, openAiApiKey: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all pr-12"
                  placeholder="sk-proj-..."
                />
                <button 
                  type="button"
                  onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-wine transition-colors"
                >
                  {showOpenAiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Required for AI search capabilities. Get this from your OpenAI dashboard.</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
               Social Ecosystem
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-charcoal uppercase tracking-widest mb-2">
                  <Link2 size={14} /> Instagram
                </label>
                <input 
                  type="text" 
                  value={settings.instagramUrl || ""}
                  onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                  placeholder="instagram.com/raaghas"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-charcoal uppercase tracking-widest mb-2">
                  <Share2 size={14} /> Facebook
                </label>
                <input 
                  type="text" 
                  value={settings.facebookUrl || ""}
                  onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans outline-none focus:border-wine transition-all"
                  placeholder="facebook.com/raaghas"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-3 bg-wine text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-wine/90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isSaving ? "Syncing..." : "Save Changes"}
            </button>
            {message && (
              <div className="flex items-center justify-center gap-2 mt-4 text-green-600 font-bold text-xs uppercase tracking-widest animate-bounce">
                <CheckCircle2 size={14} /> {message}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
