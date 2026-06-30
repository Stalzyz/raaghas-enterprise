"use client";

import { useState, useEffect, Suspense } from "react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import { 
  ShoppingBag, 
  Heart, 
  Settings, 
  ChevronRight, 
  Clock, 
  Truck, 
  CheckCircle2, 
  ShieldCheck,
  Award,
  Package,
  ArrowRight,
  Loader2,
  LogOut,
  Star
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

const TIER_CONFIG: Record<string, any> = {
  BRONZE: { label: "Bronze Member", icon: <Award className="text-orange-400" />, color: "text-orange-600", bg: "bg-orange-50", desc: "Your journey with Raaghas has begun." },
  SILVER: { label: "Silver Elite", icon: <ShieldCheck className="text-gray-400" />, color: "text-gray-600", bg: "bg-gray-50", desc: "Enjoy priority customer support." },
  GOLD: { label: "Gold Sovereign", icon: <Star className="text-yellow-500" />, color: "text-yellow-600", bg: "bg-yellow-50", desc: "Exclusive early access to new collections." },
  PLATINUM: { label: "Platinum Royal", icon: <Award className="text-wine" />, color: "text-wine", bg: "bg-beige", desc: "Complimentary personal styling sessions." },
};

const MOCK_PROFILE = {
  name: "Alexandra Sterling",
  tier: "PLATINUM",
  lifetimeSpend: 450000,
  orderCount: 12,
  points: 2500,
  orders: [
    {
      id: "ord_mock_123456",
      status: "SHIPPED",
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        { variant: { product: { images: [{ url: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80" }] } } }
      ]
    }
  ]
};

function AccountDashboardContent() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  
  const { getToken, user: authUser, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isPreview) {
      setProfile(MOCK_PROFILE);
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
      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProfile(data.user ? data.user : data);
    } catch (error) {
       console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[var(--bg)]">
       <Loader2 className="animate-spin text-wine" size={32} />
       <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/20">Opening your wardrobe...</p>
    </div>
  );

  const tier = TIER_CONFIG[profile?.tier || 'BRONZE'];
  const recentOrder = profile?.orders?.[0];

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-32">
       
       {/* ─── ELITE WELCOME HERO ─── */}
       <div className="pb-20 px-6 md:px-12 bg-[var(--surface)] border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
             <div className="flex items-center gap-8">
                <div className="w-24 h-24 rounded-full border-4 border-ivory shadow-lg overflow-hidden shrink-0 bg-wine flex items-center justify-center text-ivory text-3xl font-serif">
                   {authUser?.email?.[0].toUpperCase() || 'P'}
                </div>
                <div className="space-y-2 text-center md:text-left">
                   <h1 className="text-4xl md:text-5xl font-serif text-theme-text tracking-tight">
                     {profile?.name || authUser?.name || 'Hello, Friend'}
                   </h1>
                   <p className="text-sm text-theme-text-muted font-medium">
                     {profile?.email || authUser?.email || 'No email provided'}
                   </p>
                   <div className="flex items-center justify-center md:justify-start gap-2">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 border border-charcoal/5 ${tier.bg} ${tier.color}`}>
                         {tier.icon} {tier.label}
                      </span>
                   </div>
                </div>
             </div>

             <div className="hidden lg:flex gap-12 text-center">
                <div className="space-y-1">
                   <p className="text-[9px] font-bold text-theme-text/30 uppercase tracking-widest">Lifetime Pulse</p>
                   <p className="text-2xl font-bold text-theme-text font-sans">₹{(profile?.lifetimeSpend || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-bold text-theme-text/30 uppercase tracking-widest">Pieces Sourced</p>
                   <p className="text-2xl font-bold text-theme-text font-sans">{profile?.orderCount || 0}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-bold text-theme-text/30 uppercase tracking-widest">Points Loyalty</p>
                   <p className="text-2xl font-bold text-wine font-sans">{profile?.points || 0}</p>
                </div>
                <div className="space-y-1 pl-6 border-l border-[var(--border)]">
                   <p className="text-[9px] font-bold text-green-600/70 uppercase tracking-widest">Wallet Credit</p>
                   <p className="text-2xl font-bold text-green-600 font-sans">₹{(profile?.walletBalance || 0).toLocaleString()}</p>
                </div>
             </div>
             
             {/* Mobile Stats & Wallet Highlights */}
             <div className="flex lg:hidden flex-wrap justify-center gap-6 mt-8 p-6 bg-gradient-to-br from-green-50 to-emerald-100/50 dark:from-green-900/20 dark:to-emerald-900/10 rounded-3xl border-2 border-green-400/50 shadow-[0_0_20px_rgba(74,222,128,0.2)]">
                <div className="w-full text-center space-y-1 pb-4 border-b border-green-300/30 dark:border-green-700/50">
                   <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-widest flex items-center justify-center gap-2">
                     <Award size={14} className="text-green-600 dark:text-green-400 animate-pulse" /> Raaghas Wallet Credit
                   </p>
                   <p className="text-4xl font-extrabold text-green-800 dark:text-green-300 font-sans tracking-tight">₹{(profile?.walletBalance || 0).toLocaleString()}</p>
                   <p className="text-[9px] text-green-600/80 dark:text-green-400/80 uppercase tracking-widest mt-2 font-bold bg-green-200/50 dark:bg-green-800/30 inline-block px-3 py-1 rounded-full">Available for your next order</p>
                </div>
                <div className="flex justify-between w-full">
                  <div className="text-center space-y-1 flex-1">
                     <p className="text-[9px] font-bold text-theme-text/50 uppercase tracking-widest">Points</p>
                     <p className="text-lg font-bold text-wine font-sans">{profile?.points || 0}</p>
                  </div>
                  <div className="text-center space-y-1 flex-1 border-l border-green-300/30 dark:border-green-700/50">
                     <p className="text-[9px] font-bold text-theme-text/50 uppercase tracking-widest">Orders</p>
                     <p className="text-lg font-bold text-theme-text font-sans">{profile?.orderCount || 0}</p>
                  </div>
                </div>
             </div>
          </div>
       </div>

       <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* ─── ACTIVE TRACKING (Main) ─── */}
          <div className="lg:col-span-8 space-y-10">
             
             {profile?.orders && profile.orders.length > 0 ? (
               <div className="space-y-6">
                 {profile.orders.map((order: any) => (
                   <div key={order.id} className="bg-[var(--surface)] rounded-[40px] border border-[var(--border)] shadow-xl overflow-hidden group">
                      <div className="p-8 md:p-12 space-y-8">
                         <div className="flex justify-between items-start">
                            <div className="space-y-1">
                               {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                                 <span className="text-[9px] font-bold text-wine tracking-widest uppercase flex items-center gap-2 outline-none mb-2">
                                    <div className="w-1.5 h-1.5 bg-wine rounded-full animate-ping" /> Active Order
                                 </span>
                               )}
                               <h3 className="text-2xl font-bold text-theme-text">
                                 {order.formattedOrderNumber || (order.orderNumber != null ? `RGS-${order.orderNumber + 1000}` : order.id.slice(-8).toUpperCase())}
                               </h3>
                               <p className="text-[10px] text-theme-text/50 font-medium uppercase tracking-widest mt-1">Status: {order.status}</p>
                            </div>
                            <Link href={`/account/orders/${order.id}`} className="text-[9px] font-bold uppercase tracking-widest text-theme-text/40 hover:text-wine transition-colors flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                               View Details <ChevronRight size={14} />
                            </Link>
                         </div>

                         {/* Tracker Visual */}
                         <div className="relative pt-6 pb-2">
                            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-50 -translate-y-1/2" />
                            <div className="absolute top-1/2 left-0 h-0.5 bg-wine -translate-y-1/2 transition-all duration-1000" style={{ 
                              width: order.status === 'PENDING' ? '12%' :
                                     order.status === 'CONFIRMED' ? '37%' :
                                     order.status === 'SHIPPED' ? '62%' : '100%'
                            }} />
                            
                            <div className="flex justify-between relative">
                               {[
                                   { label: "Sourced", key: 'PENDING', icon: <Package size={14} /> },
                                   { label: "Crafted", key: 'CONFIRMED', icon: <ShieldCheck size={14} /> },
                                   { label: "Transit", key: 'SHIPPED', icon: <Truck size={14} /> },
                                   { label: "Home", key: 'DELIVERED', icon: <CheckCircle2 size={14} /> }
                               ].map((step, idx) => {
                                  const active = order.status === step.key || (idx === 0 && order.status !== 'PENDING') || (idx === 1 && (order.status === 'SHIPPED' || order.status === 'DELIVERED')) || (idx === 2 && order.status === 'DELIVERED');
                                  return (
                                    <div key={idx} className="flex flex-col items-center gap-3">
                                       <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${active ? 'bg-wine text-white shadow-lg' : 'bg-[var(--surface)] border text-theme-text/20'}`}>
                                          {step.icon}
                                       </div>
                                       <span className={`text-[8px] font-bold uppercase tracking-widest ${active ? 'text-theme-text' : 'text-theme-text/20'}`}>{step.label}</span>
                                    </div>
                                  )
                               })}
                            </div>
                         </div>
                      </div>
                      <div className="bg-theme-text/5 p-6 flex justify-between items-center px-12">
                         <p className="text-[9px] text-theme-text/50 font-medium uppercase tracking-widest">
                           {order.estimatedDelivery ? `Est. Arrival: ${new Date(order.estimatedDelivery).toLocaleDateString()}` : `Ordered on: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}`}
                         </p>
                         <div className="flex -space-x-3">
                            {order.items?.slice(0, 3).map((item: any, i: number) => (
                               <img key={i} src={item.variant?.product?.images?.[0]?.url} className="w-8 h-8 rounded-full border-2 border-[var(--surface)] object-cover" />
                            ))}
                            {order.items?.length > 3 && (
                               <div className="w-8 h-8 rounded-full border-2 border-[var(--surface)] bg-white flex items-center justify-center text-[8px] font-bold">
                                 +{order.items.length - 3}
                               </div>
                            )}
                         </div>
                      </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="bg-[var(--surface)] p-12 rounded-[40px] border border-[var(--border)] shadow-sm text-center space-y-6">
                  <div className="w-16 h-16 bg-beige rounded-3xl flex items-center justify-center mx-auto text-wine rotate-3">
                     <ShoppingBag size={32} />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-xl font-bold text-theme-text font-serif">Your Wardrobe Awaits</h3>
                     <p className="text-xs text-theme-text/50 max-w-xs mx-auto">No active pursuits at the moment. Explore our latest masterworks.</p>
                  </div>
                  <Link href="/collections/all" className="inline-block border border-theme-text px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-theme-text hover:text-[var(--bg)] transition-all">
                     Pulse Collection
                  </Link>
               </div>
             )}

             {/* Wardrobe Quick Action Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Link href="/account/orders" className="group">
                   <div className="bg-[var(--surface)] p-8 rounded-[32px] border border-[var(--border)] hover:border-wine/20 transition-all space-y-6 hover:shadow-xl">
                      <div className="flex justify-between items-center">
                         <div className="w-12 h-12 bg-theme-text/5 rounded-2xl flex items-center justify-center text-theme-text/40 group-hover:text-wine group-hover:bg-wine/5 transition-all">
                            <Clock size={24} />
                         </div>
                         <ArrowRight size={20} className="text-theme-text/10 group-hover:text-wine group-hover:translate-x-1 transition-all" />
                      </div>
                      <div className="space-y-1">
                         <h4 className="text-lg font-bold text-theme-text">Order History</h4>
                         <p className="text-[10px] text-theme-text/40 uppercase font-bold tracking-widest">Archive of your style journey</p>
                      </div>
                   </div>
                </Link>

                <Link href="/wishlist" className="group">
                   <div className="bg-[var(--surface)] p-8 rounded-[32px] border border-[var(--border)] hover:border-wine/20 transition-all space-y-6 hover:shadow-xl">
                      <div className="flex justify-between items-center">
                         <div className="w-12 h-12 bg-theme-text/5 rounded-2xl flex items-center justify-center text-theme-text/40 group-hover:text-wine group-hover:bg-wine/5 transition-all">
                            <Heart size={24} />
                         </div>
                         <ArrowRight size={20} className="text-theme-text/10 group-hover:text-wine group-hover:translate-x-1 transition-all" />
                      </div>
                      <div className="space-y-1">
                         <h4 className="text-lg font-bold text-theme-text">My Wishlist</h4>
                         <p className="text-[10px] text-theme-text/40 uppercase font-bold tracking-widest">Future additions to your wardrobe</p>
                      </div>
                   </div>
                </Link>
             </div>
          </div>

          {/* ─── SIDEBAR (Elite Status & Settings) ─── */}
          <div className="lg:col-span-4 space-y-10">
             
             {/* Elite Benefits Card */}
             <div className="bg-[#1A1A1A] text-[#FDFCFB] p-10 rounded-[40px] shadow-2xl space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#701A31]/40 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="space-y-2">
                   <span className="text-[9px] font-bold text-[#D04055] tracking-widest uppercase">Member Privilege</span>
                   <h3 className="text-2xl font-serif text-white">{tier.label}</h3>
                   <p className="text-xs text-[#FDFCFB]/60 leading-relaxed font-sans">{tier.desc}</p>
                </div>

                <div className="space-y-6">
                   <div className="flex items-center gap-4 group">
                      <div className="w-1 h-1 bg-[#D04055] rounded-full" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#FDFCFB]/80">Early Access to Sales</p>
                      {profile?.tier === 'GOLD' || profile?.tier === 'PLATINUM' ? <CheckCircle2 size={12} className="text-[#D04055]" /> : <Lock size={12} className="text-[#FDFCFB]/30" />}
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-1 h-1 bg-[#D04055] rounded-full" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#FDFCFB]/80">Complimentary Alterations</p>
                      {profile?.tier === 'PLATINUM' ? <CheckCircle2 size={12} className="text-[#D04055]" /> : <Lock size={12} className="text-[#FDFCFB]/30" />}
                   </div>
                </div>

                <button className="w-full bg-[#FDFCFB] text-[#1A1A1A] py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#701A31] hover:text-white transition-all shadow-lg">
                   Upgrade Pulse
                </button>
             </div>

             {/* Personal Command */}
             <div className="bg-[var(--surface)] p-8 rounded-[32px] border border-[var(--border)] space-y-8">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-theme-text/40">Account Settings</h3>
                <div className="space-y-4">
                   <Link href="/account/profile" className="flex items-center gap-4 p-4 hover:bg-theme-text/5 rounded-2xl transition-all group">
                      <Settings size={20} className="text-theme-text/20 group-hover:text-wine group-hover:rotate-45 transition-all" />
                      <span className="text-sm font-bold text-theme-text">Account Settings</span>
                   </Link>
                   <Link href="/support" className="flex items-center gap-4 p-4 hover:bg-theme-text/5 rounded-2xl transition-all group">
                      <CheckCircle2 size={20} className="text-theme-text/20 group-hover:text-wine transition-all" />
                      <span className="text-sm font-bold text-theme-text">Help & Support</span>
                   </Link>
                   <button onClick={logout} className="w-full flex items-center gap-4 p-4 hover:bg-red-500/10 rounded-2xl transition-all group text-left">
                      <LogOut size={20} className="text-red-500/50 group-hover:text-red-600 transition-all" />
                      <span className="text-sm font-bold text-red-500">Sign Out</span>
                   </button>
                </div>
             </div>

          </div>

       </div>
    </div>
  );
}

export default function AccountDashboard() {
  return (
    <Suspense fallback={
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[var(--bg)]">
        <Loader2 className="animate-spin text-wine" size={32} />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/20">Loading Dashboard...</p>
      </div>
    }>
      <AccountDashboardContent />
    </Suspense>
  );
}

function Lock({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} height={size} 
      viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
      className={className}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
