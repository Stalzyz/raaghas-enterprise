"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Users, ShoppingBag, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function AnalyticsPage() {
  const { token } = useAdminAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiBase = API_BASE;
        const res = await fetch(`${apiBase}/analytics/executive-overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    if (token) fetchStats();
  }, [token]);

  return (
    <div className="p-8 space-y-8 bg-[#FDFBF7] min-h-screen">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal uppercase tracking-tight">Executive Intelligence</h1>
          <p className="text-sm text-gray-500 mt-2">Verified performance data from your growth engine.</p>
        </div>
        <Link 
          href="/analytics/ledger"
          className="flex items-center gap-2 px-6 py-2.5 bg-wine text-ivory rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-wine/20"
        >
          View Financial Ledger
          <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
           title="Total Revenue" 
           value={loading ? "..." : `₹${Number(stats?.totalRevenue || 0).toLocaleString()}`} 
           change={stats?.revenueChange || "+0%"} 
           icon={<TrendingUp size={20} />} 
        />
        <StatCard 
           title="Active Customers" 
           value={loading ? "..." : stats?.customerCount || "0"} 
           change={stats?.customerChange || "+0%"} 
           icon={<Users size={20} />} 
        />
        <StatCard 
           title="Conversion Rate" 
           value={loading ? "..." : `${stats?.conversionRate || '0.0'}%`} 
           change={stats?.conversionChange || "+0%"} 
           icon={<ShoppingBag size={20} />} 
        />
      </div>

      {!loading && stats?.recentOrders?.length > 0 ? (
         <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
               <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Live Transaction Feed</h3>
               <Link href="/orders" className="text-[10px] font-bold text-wine hover:underline">View All Orders</Link>
            </div>
            <div className="divide-y divide-gray-50">
               {stats.recentOrders.map((order: any) => (
                  <div key={order.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-beige rounded-xl flex items-center justify-center text-wine font-bold text-xs">
                           {order.customerName?.[0] || 'U'}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-charcoal">{order.customerName}</p>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(order.createdAt).toLocaleTimeString()}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-bold text-charcoal">₹{Number(order.totalAmount).toLocaleString()}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${order.status === 'CONFIRMED' ? 'text-green-500' : 'text-yellow-500'}`}>{order.status}</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-20 text-center shadow-sm">
          <div className="w-16 h-16 bg-wine/5 rounded-full flex items-center justify-center mx-auto mb-6 text-wine">
            <BarChart3 size={32} />
          </div>
          <h2 className="text-xl font-serif text-charcoal mb-4">Awaiting Live Traffic</h2>
          <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
            The real-time analytics engine is ready. Once your first orders start flowing, this dashboard will populate with deep insights.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, change, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-50 rounded-lg text-gray-400">{icon}</div>
        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">{change}</span>
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-serif font-bold text-charcoal">{value}</h3>
    </div>
  );
}
