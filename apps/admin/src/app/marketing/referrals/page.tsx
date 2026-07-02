"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import { Users, UserPlus, Gift, TrendingUp, ShieldCheck, Share2, Loader2, IndianRupee } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function ReferralManagement() {
  const { token } = useAdminAuth();
  const [stats, setStats] = useState<any>({ totalReferrals: 0, activeReferrers: 0, rewardsIssued: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/growth/referrals/stats`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch referral stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Referral Program</h2>
          <p className="text-gray-500 text-sm mt-1">Configure earn-on-purchase rules and monitor viral growth.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-wine/5 text-wine rounded-2xl flex items-center justify-center">
            <UserPlus size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Referrals</p>
            <h4 className="text-3xl font-bold text-charcoal">{stats.totalReferrals}</h4>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Referrers</p>
            <h4 className="text-3xl font-bold text-charcoal">{stats.activeReferrers}</h4>
          </div>
        </div>
        <div className="bg-wine text-ivory rounded-[2rem] p-8 shadow-xl space-y-4">
          <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center">
            <Gift size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Rewards Issued</p>
            <h4 className="text-3xl font-bold flex items-center"><IndianRupee size={24} /> {stats.rewardsIssued.toLocaleString()}</h4>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rules Config */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
          <h3 className="text-xl font-bold text-charcoal flex items-center gap-3">
             <ShieldCheck size={20} className="text-wine" /> Program Rules
          </h3>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Referrer Reward (Credits)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-wine font-bold">₹</span>
                <input type="number" defaultValue={100} className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-8 pr-4 py-4 text-sm font-bold outline-none focus:border-wine" />
              </div>
              <p className="text-[10px] text-gray-400 font-medium italic">Amount credited to the referrer after the referee's first purchase.</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Referee Incentive</label>
              <select className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:border-wine">
                <option>10% OFF Coupon</option>
                <option>₹150 Store Credit</option>
                <option>Free Shipping on First Order</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Minimum Qualifying Purchase</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-wine font-bold">₹</span>
                <input type="number" defaultValue={999} className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-8 pr-4 py-4 text-sm font-bold outline-none focus:border-wine" />
              </div>
            </div>

            <button className="w-full py-4 bg-wine text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-charcoal transition-all shadow-lg shadow-wine/20">
              Save Program Settings
            </button>
          </div>
        </div>

        {/* Abuse Prevention */}
        <div className="space-y-6">
          <div className="bg-charcoal text-white rounded-[2.5rem] p-10 shadow-xl space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <ShieldCheck size={20} className="text-wine" /> Abuse Prevention
            </h3>
            <div className="space-y-4">
               <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="space-y-0.5">
                     <p className="text-xs font-bold">IP/Device Tracking</p>
                     <p className="text-[10px] opacity-40 uppercase tracking-widest">Block multi-account self-referrals</p>
                  </div>
                  <div className="w-10 h-6 bg-wine rounded-full relative">
                     <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
               </div>
               <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="space-y-0.5">
                     <p className="text-xs font-bold">Purchase Lock</p>
                     <p className="text-[10px] opacity-40 uppercase tracking-widest">Delay reward until return window ends (15 days)</p>
                  </div>
                  <div className="w-10 h-6 bg-wine rounded-full relative">
                     <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm flex items-center gap-6">
             <div className="w-16 h-16 bg-beige text-wine rounded-2xl flex items-center justify-center">
                <Share2 size={32} />
             </div>
             <div>
                <h4 className="text-sm font-bold text-charcoal">Viral Loop Performance</h4>
                <p className="text-xs text-gray-500 mt-1">Average of 1.4 referrals per active customer.</p>
                <p className="text-[10px] font-bold text-wine/60 uppercase tracking-widest mt-2">Detailed analytics available in Reports</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
