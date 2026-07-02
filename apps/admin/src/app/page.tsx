"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { ArrowUpRight, TrendingUp, Users, ShoppingBag, CreditCard, Building2, Package, Tag, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function Dashboard() {
  const { token } = useAdminAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let from = "";
      const now = new Date();
      if (period === "30d") {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (period === "90d") {
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      } else if (period === "ytd") {
        from = new Date(now.getFullYear(), 0, 1).toISOString();
      }

      const query = from ? `?from=${from}` : "";
      const baseUrl = API_BASE;
      
      const res = await fetch(`${baseUrl}/analytics/executive-overview${query}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Unable to reach the API. Please ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAnalytics();
    }
  }, [period, token]);



  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-wine" size={40} />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading Business Intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center px-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full mb-4">
          <Package size={32} />
        </div>
        <h3 className="text-xl font-bold text-charcoal mb-2">Service Unavailable</h3>
        <p className="text-gray-500 max-w-md mb-6">{error}</p>
        <button 
          onClick={() => fetchAnalytics()}
          className="bg-wine text-white px-6 py-2 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-wine-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Business Summary</h2>
          <p className="text-gray-500 text-sm mt-1">Real-time business intelligence across Retail & Wholesale channels.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-white border border-gray-200 text-sm font-medium px-4 py-2 rounded-xl outline-none focus:border-wine cursor-pointer"
          >
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="ytd">Year to Date</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>


      {/* ─── HIGHLIGHT METRICS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-gray-50 text-charcoal rounded-xl"><TrendingUp size={20} /></div>
            <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md"><ArrowUpRight size={12} className="mr-0.5" /> +14.2%</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Sales</p>
            <h3 className="text-3xl font-bold text-charcoal">₹{(data.revenue.total / 100000).toFixed(1)}L</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Building2 size={20} /></div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Partner Sales</p>
            <h3 className="text-3xl font-bold text-charcoal">₹{(data.revenue.b2b / 100000).toFixed(1)}L</h3>
            <p className="text-xs text-gray-400 mt-1">₹{(data.revenue.b2bUncollected / 100000).toFixed(1)}L Uncollected</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><ShoppingBag size={20} /></div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Orders</p>
            <h3 className="text-3xl font-bold text-charcoal">{data.orders.total}</h3>
            <p className="text-xs text-gray-400 mt-1">{data.orders.b2cCount} Storefront / {data.orders.b2bCount} Partner</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl"><Tag size={20} /></div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Avg. Purchase</p>
            <h3 className="text-3xl font-bold text-charcoal">₹{Math.round(data.orders.aovB2C).toLocaleString()}</h3>
            <p className="text-xs text-gray-400 mt-1">vs B2B Avg ₹{Math.round(data.orders.aovB2B).toLocaleString()}</p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ─── RECHARTS: SALES & PROFIT ANALYTICS ─── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm h-96">
            <h3 className="text-sm font-bold text-charcoal mb-6 uppercase tracking-widest">Sales Trend</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorB2C" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#701A31" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#701A31" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorB2B" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Area type="monotone" dataKey="b2cSales" name="Retail Sales (B2C)" stroke="#701A31" strokeWidth={3} fillOpacity={1} fill="url(#colorB2C)" />
                <Area type="monotone" dataKey="b2bSales" name="Wholesale (B2B)" stroke="#94a3b8" strokeWidth={3} fillOpacity={1} fill="url(#colorB2B)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm h-72">
            <h3 className="text-sm font-bold text-charcoal mb-6 uppercase tracking-widest">Estimated Profit</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Profit']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="profit" name="Profit Margin" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─── RECENT ACTIVITY FEED ─── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-charcoal uppercase tracking-widest">Unified Activity</h3>
            <Link href="/wholesale/orders" className="text-[10px] font-bold text-wine uppercase tracking-widest hover:underline">View All</Link>
          </div>
          
          <div className="space-y-5 flex-1 overflow-y-auto pr-2">
            {data.recentActivity.map((act: any, i: number) => (
              <div key={i} className="flex gap-4 items-start">
                <div className={`p-2 rounded-lg shrink-0 mt-1 ${act.channel === 'WHOLESALE' ? 'bg-wine/10 text-wine' : 'bg-gray-100 text-gray-600'}`}>
                  {act.channel === 'WHOLESALE' ? <Building2 size={16} /> : <Package size={16} />}
                </div>
                <div className="flex-1">
                   <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-charcoal truncate max-w-[120px]">{act.name}</p>
                    <p className="text-sm font-bold text-charcoal">₹{act.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{act.channel} • {act.status}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} /> 
                      {new Date(act.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
