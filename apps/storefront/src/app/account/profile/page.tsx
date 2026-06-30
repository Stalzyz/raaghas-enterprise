"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Loader2,
  ArrowLeft,
  Shield,
  Save
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";

const MOCK_PROFILE = {
  name: "Alexandra Sterling",
  email: "alexandra.s@luxury.com",
  savedAddresses: [
    { id: "1", type: "Primary Residence", line1: "124 Luxury Lane", city: "London", state: "Greater London", postalCode: "SW1A 1AA" },
    { id: "2", type: "Vogue Studio", line1: "88 Fashion Avenue", city: "Milan", state: "Lombardy", postalCode: "20121" }
  ]
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  
  const { getToken, isAuthenticated, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Form States
  const [name, setName] = useState("");
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);

  useEffect(() => {
    if (isPreview) {
      setProfile(MOCK_PROFILE);
      setName(MOCK_PROFILE.name);
      setAddresses(MOCK_PROFILE.savedAddresses);
      setIsLoading(false);
      return;
    }

    if (!authLoading) {
      if (isAuthenticated) {
        fetchProfile();
      } else {
        window.location.href = "/sign-in";
      }
    }
  }, [authLoading, isAuthenticated, isPreview]);

  const fetchProfile = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6005'}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const user = data.user || data;
      setProfile(user);
      setName(user.name || "");
      setAddresses(user.savedAddresses || []);
    } catch (error) {
       console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (isPreview) return alert("Simulation Mode: Profile updates are read-only.");
    setIsUpdating(true);
    try {
      const token = await getToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6005'}/api/v1/auth/me`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name, savedAddresses: addresses })
      });
      await fetchProfile();
      alert("Profile updated successfully.");
    } catch (error) {
       alert("Failed to update profile.");
    } finally {
       setIsUpdating(false);
    }
  };

  const addAddress = (newAddr: any) => {
    setAddresses([...addresses, { ...newAddr, id: Date.now().toString() }]);
    setShowAddressModal(false);
  };

  const removeAddress = (id: string) => {
    setAddresses(addresses.filter(a => a.id !== id));
  };

  if (authLoading || isLoading) return <div className="h-screen flex items-center justify-center bg-[var(--bg)]"><Loader2 className="animate-spin text-wine" size={32} /></div>;

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-32 pb-32">
       <div className="max-w-4xl mx-auto px-6">
          
          {/* Navigation */}
          <Link href="/account" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-wine transition-colors mb-12 group">
             <div className="p-2 bg-[var(--surface)] rounded-lg border border-[var(--border)] group-hover:border-wine/30 transition-all"><ArrowLeft size={16} className="text-[var(--text-primary)]" /></div>
             Back to Account
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 items-start">
             
             {/* Main Forms */}
             <div className="space-y-12">
                
                {/* Profile Details */}
                <div className="bg-[var(--surface)] p-10 rounded-[40px] border border-[var(--border)] shadow-xl space-y-10">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-wine/10 rounded-2xl flex items-center justify-center text-wine"><User size={24} /></div>
                      <h2 className="text-2xl font-serif text-[var(--text-primary)]">Profile Details</h2>
                   </div>

                   <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] ml-1">Full Name</label>
                            <input 
                              type="text" 
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-6 py-4 text-sm font-medium text-[var(--text-primary)] focus:border-wine/50 outline-none transition-all placeholder:text-[var(--text-secondary)]"
                            />
                         </div>
                         <div className="space-y-2 opacity-60">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] ml-1">Email Address</label>
                            <div className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-6 py-4 text-sm font-medium flex items-center gap-2 text-[var(--text-primary)]">
                               <Mail size={14} className="text-[var(--text-secondary)]" /> {profile?.email}
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="pt-8 border-t border-[var(--border)]">
                      <button 
                        disabled={isUpdating}
                        onClick={handleUpdateProfile}
                        className="bg-wine text-white px-10 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-charcoal transition-all flex items-center gap-2 shadow-lg"
                      >
                         {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                         Save Changes
                      </button>
                   </div>
                </div>

                {/* Saved Addresses */}
                <div className="bg-[var(--surface)] p-10 rounded-[40px] border border-[var(--border)] shadow-xl space-y-10">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-wine/10 rounded-2xl flex items-center justify-center text-wine"><MapPin size={24} /></div>
                         <h2 className="text-2xl font-serif text-[var(--text-primary)]">Addresses</h2>
                      </div>
                      <button 
                        onClick={() => setShowAddressModal(true)}
                        className="p-3 bg-wine text-white rounded-2xl hover:bg-charcoal transition-all shadow-md group"
                      >
                         <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                      </button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {addresses.map((addr: any) => (
                         <div key={addr.id} className="p-6 rounded-[32px] border border-[var(--border)] bg-[var(--bg)] relative group transition-all hover:bg-[var(--surface)] hover:shadow-lg hover:border-wine/20">
                            <h4 className="text-[10px] font-bold text-wine uppercase tracking-[0.2em] mb-4">{addr.type || 'Primary Address'}</h4>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans mb-6">
                               {addr.line1}<br />
                               {addr.line2 && <>Landmark: {addr.line2}<br /></>}
                               {addr.city}, {addr.state} - {addr.postalCode}
                               {addr.phone && <><br />Phone: +91 {addr.phone}</>}
                            </p>
                            <button 
                              onClick={() => removeAddress(addr.id)}
                              className="absolute top-6 right-6 p-2 text-[var(--text-secondary)]/40 hover:text-red-500 transition-colors"
                            >
                               <Trash2 size={14} />
                            </button>
                         </div>
                      ))}
                      {addresses.length === 0 && (
                        <div className="md:col-span-2 py-10 text-center border-2 border-dashed border-[var(--border)] rounded-[32px] space-y-3">
                           <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">No addresses found</p>
                           <button onClick={() => setShowAddressModal(true)} className="text-wine text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">Add First Address</button>
                        </div>
                      )}
                   </div>
                </div>

             </div>

             {/* Sidebar Info */}
             <div className="space-y-10">
                <div className="bg-wine text-white p-8 rounded-[40px] shadow-xl space-y-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                   <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center text-white"><Shield size={20} /></div>
                   <div className="space-y-2">
                      <h3 className="text-sm font-bold text-white">Privacy &amp; Security</h3>
                      <p className="text-[9px] text-white/70 uppercase tracking-widest leading-relaxed">Your data is encrypted and handled securely for maximum protection.</p>
                   </div>
                   <div className="pt-4 border-t border-white/20 space-y-3">
                      <div className="flex items-center gap-2 text-[9px] font-bold text-white uppercase tracking-widest">
                         <CheckCircle2 size={12} className="text-green-300" /> Verified Account
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-white uppercase tracking-widest">
                         <CheckCircle2 size={12} className="text-green-300" /> Secure Payments
                      </div>
                   </div>
                </div>
             </div>

          </div>
       </div>

       {/* Address Modal (Fixed Overlay) */}
       <AnimatePresence>
          {showAddressModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 onClick={() => setShowAddressModal(false)}
                 className="absolute inset-0 bg-charcoal/60 backdrop-blur-md"
               />
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                 className="bg-[var(--surface)] w-full max-w-lg rounded-[48px] p-10 relative z-10 shadow-2xl"
               >
                  <AddressForm onSave={addAddress} onCancel={() => setShowAddressModal(false)} />
               </motion.div>
            </div>
          )}
       </AnimatePresence>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[var(--bg)]"><Loader2 className="animate-spin text-wine" size={32} /></div>}>
      <ProfilePageContent />
    </Suspense>
  );
}

function AddressForm({ onSave, onCancel }: { onSave: (a: any) => void, onCancel: () => void }) {
   const [formData, setFormData] = useState({
      type: "Home",
      line1: "",
      line2: "", // landmark
      city: "",
      state: "",
      postalCode: "",
      phone: ""
   });

   const handlePincodeChange = async (val: string) => {
     const cleaned = val.replace(/\D/g, "").slice(0, 6);
     setFormData(prev => ({ ...prev, postalCode: cleaned }));
     
     if (cleaned.length === 6) {
       try {
         const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
         const data = await res.json();
         if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
           const info = data[0].PostOffice[0];
           const matchedState = INDIAN_STATES.find(s => s.toLowerCase().replace(/\s/g, "") === info.State.toLowerCase().replace(/\s/g, "")) || info.State;
           setFormData(prev => ({ 
             ...prev, 
             city: info.District, 
             state: matchedState
           }));
         }
       } catch (err) {
         console.error("Failed to auto-fill address from pincode:", err);
       }
     }
   };

   const handleSave = () => {
     if (!formData.line1.trim() || !formData.city.trim() || !formData.state.trim() || !formData.postalCode.trim() || !formData.phone.trim()) {
       alert("Please fill in all required fields (Street Address, PIN Code, Phone, City, State)");
       return;
     }
     if (formData.phone.replace(/\D/g, "").length !== 10) {
       alert("Phone number must be strictly 10 digits");
       return;
     }
     onSave(formData);
   };

   return (
      <div className="space-y-8">
         <div className="space-y-1">
            <h3 className="text-2xl font-serif text-[var(--text-primary)] tracking-tight">Add Address</h3>
            <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">Save your address for faster checkout.</p>
         </div>

         <div className="space-y-4">
            <input 
              placeholder="Address Type (Home, Work, etc.)"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-6 py-4 text-sm text-[var(--text-primary)] outline-none focus:border-wine/50 transition-all font-bold uppercase tracking-widest placeholder:text-[var(--text-secondary)]"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            />
            <input 
              placeholder="Street Address, Area"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-6 py-4 text-sm text-[var(--text-primary)] outline-none focus:border-wine/50 transition-all font-medium placeholder:text-[var(--text-secondary)]"
              value={formData.line1}
              onChange={e => setFormData({ ...formData, line1: e.target.value })}
            />
            <input 
              placeholder="Landmark"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-6 py-4 text-sm text-[var(--text-primary)] outline-none focus:border-wine/50 transition-all font-medium placeholder:text-[var(--text-secondary)]"
              value={formData.line2}
              onChange={e => setFormData({ ...formData, line2: e.target.value })}
            />
            
            <div className="grid grid-cols-2 gap-4">
               <input 
                 placeholder="PIN Code"
                 maxLength={6}
                 className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-6 py-4 text-sm text-[var(--text-primary)] outline-none focus:border-wine/50 transition-all font-medium placeholder:text-[var(--text-secondary)]"
                 value={formData.postalCode}
                 onChange={e => handlePincodeChange(e.target.value)}
               />
               <div className="flex border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--bg)] focus-within:border-wine/50">
                 <span className="bg-[var(--surface)] px-3 py-4 text-sm text-[var(--text-secondary)] select-none flex items-center border-r border-[var(--border)] font-medium">+91</span>
                 <input 
                   type="tel" 
                   placeholder="Phone" 
                   maxLength={10} 
                   className="w-full bg-transparent px-4 py-4 text-sm text-[var(--text-primary)] outline-none transition-all font-medium placeholder:text-[var(--text-secondary)]"
                   value={formData.phone}
                   onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                 />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <input 
                 placeholder="City"
                 className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-6 py-4 text-sm text-[var(--text-primary)] outline-none focus:border-wine/50 transition-all font-medium placeholder:text-[var(--text-secondary)]"
                 value={formData.city}
                 onChange={e => setFormData({ ...formData, city: e.target.value })}
               />
               <select 
                 value={formData.state} 
                 onChange={e => setFormData({ ...formData, state: e.target.value })} 
                 className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-6 py-4 text-sm text-[var(--text-primary)] outline-none focus:border-wine/50 transition-all font-medium"
               >
                 <option value="">Select State</option>
                 {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
         </div>

         <div className="flex gap-4">
            <button onClick={onCancel} className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] bg-[var(--bg)] border border-[var(--border)] rounded-2xl hover:border-wine/30 transition-colors">Cancel</button>
            <button 
              onClick={handleSave}
              className="flex-1 bg-wine text-white px-10 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-charcoal transition-all"
            >
               Save Address
            </button>
         </div>
      </div>
   );
}
