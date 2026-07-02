"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { 
  RefreshCw, Search, Filter, ChevronRight, AlertCircle,
  Undo2, CheckCircle2, XCircle, Loader2, MoreHorizontal
} from "lucide-react";
import { motion } from "framer-motion";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function ReverseLogisticsPage() {
  const { token } = useAdminAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) fetchReturns();
  }, [token]);

  const fetchReturns = async () => {
    try {
      const baseUrl = `${API_BASE}/api/v1`;
      
      const [res, settingsRes] = await Promise.all([
        fetch(`${baseUrl}/logistics/returns`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${baseUrl}/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const data = await res.json();
      if (Array.isArray(data)) {
        setReturns(data);
      } else {
        setReturns([]);
      }
      
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setPolicy({
          returnWindowDays: settingsData.returnWindowDays ?? 7,
          requireImagesForReturn: settingsData.requireImagesForReturn ?? true,
          autoApproveLowValue: settingsData.autoApproveLowValue ?? false,
        });
      }
    } catch (err) {
      console.error("Failed to fetch returns", err);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this return request? This will automatically restore inventory and record a refund.")) return;
    try {
      const baseUrl = `${API_BASE}/api/v1`;
      const res = await fetch(`${baseUrl}/logistics/admin/returns/${id}/approve`, {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${token}` 
        }
      });
      if (res.ok) {
        alert("Return approved successfully.");
        fetchReturns();
      } else {
        const err = await res.json();
        alert(`Failed to approve return: ${err.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while approving return.");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Please enter the reason for rejection:");
    if (reason === null) return;
    try {
      const baseUrl = `${API_BASE}/api/v1`;
      const res = await fetch(`${baseUrl}/logistics/admin/returns/${id}/reject`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        alert("Return rejected successfully.");
        fetchReturns();
      } else {
        const err = await res.json();
        alert(`Failed to reject return: ${err.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while rejecting return.");
    }
  };

  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policy, setPolicy] = useState({
    returnWindowDays: 7,
    requireImagesForReturn: true,
    autoApproveLowValue: false,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'text-blue-500 bg-blue-50 border-blue-100';
      case 'APPROVED': return 'text-amber-500 bg-amber-50 border-amber-100';
      case 'PICKED': return 'text-indigo-500 bg-indigo-50 border-indigo-100';
      case 'RECEIVED': return 'text-green-500 bg-green-50 border-green-100';
      case 'REFUNDED': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'REJECTED': return 'text-red-500 bg-red-50 border-red-100';
      default: return 'text-gray-500 bg-gray-50 border-gray-100';
    }
  };

  const savePolicy = async () => {
    setSavingPolicy(true);
    try {
      const baseUrl = `${API_BASE}/api/v1`;
      const res = await fetch(`${baseUrl}/settings`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          returnWindowDays: policy.returnWindowDays,
          requireImagesForReturn: policy.requireImagesForReturn,
          autoApproveLowValue: policy.autoApproveLowValue
        })
      });
      if (res.ok) {
        setShowPolicyModal(false);
        alert("Return policy updated successfully.");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to update policy: ${err.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert("Failed to update policy. Check your connection.");
    } finally {
      setSavingPolicy(false);
    }
  };

  if (loading) return (
    <div className="p-12 flex justify-center">
      <Loader2 className="animate-spin text-wine" size={32} />
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-charcoal">Reverse Logistics</h1>
          <p className="text-sm text-gray-500 mt-1 font-sans">Manage return requests, reverse pickups, and quality checks.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowPolicyModal(true)}
            className="bg-white border border-gray-200 text-charcoal px-6 py-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
          >
            Configure Policy
          </button>
        </div>
      </div>

      {showPolicyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-bold text-charcoal mb-6">Return Policy Settings</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Return Window (Days)</label>
                <input 
                  type="number" 
                  value={policy.returnWindowDays}
                  onChange={e => setPolicy({...policy, returnWindowDays: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-wine/20"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-700">Require Proof Image</p>
                  <p className="text-xs text-gray-500 mt-1">Customers must upload an image of the defect.</p>
                </div>
                <div 
                  className={`w-12 h-6 rounded-full cursor-pointer relative transition-colors ${policy.requireImagesForReturn ? 'bg-wine' : 'bg-gray-200'}`}
                  onClick={() => setPolicy({...policy, requireImagesForReturn: !policy.requireImagesForReturn})}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${policy.requireImagesForReturn ? 'left-7' : 'left-1'}`} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-700">Auto-Approve Low Value</p>
                  <p className="text-xs text-gray-500 mt-1">Automatically approve returns under ₹500.</p>
                </div>
                <div 
                  className={`w-12 h-6 rounded-full cursor-pointer relative transition-colors ${policy.autoApproveLowValue ? 'bg-wine' : 'bg-gray-200'}`}
                  onClick={() => setPolicy({...policy, autoApproveLowValue: !policy.autoApproveLowValue})}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${policy.autoApproveLowValue ? 'left-7' : 'left-1'}`} />
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end">
              <button 
                onClick={() => setShowPolicyModal(false)}
                className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 border border-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={savePolicy}
                disabled={savingPolicy}
                className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-wine text-white hover:bg-red-900 disabled:opacity-50"
              >
                {savingPolicy ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex gap-4 items-center bg-gray-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              placeholder="Search by Return ID or Order ID..."
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl text-sm border-gray-100 focus:ring-2 focus:ring-wine/20"
            />
          </div>
          <button className="p-3 bg-white border border-gray-100 text-gray-400 rounded-xl hover:text-wine transition-colors shadow-sm">
            <Filter size={20} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase font-bold tracking-widest text-gray-400 border-b border-gray-50">
                <th className="px-8 py-6 text-left">Return ID</th>
                <th className="px-8 py-6 text-left">Order</th>
                <th className="px-8 py-6 text-left">Reason</th>
                <th className="px-8 py-6 text-left">Status</th>
                <th className="px-8 py-6 text-left">Refund</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-300 gap-4">
                      <Undo2 size={48} />
                      <p className="text-sm font-medium">No return requests found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0 group">
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-charcoal">#{ret.id.slice(-8).toUpperCase()}</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">
                        {new Date(ret.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-charcoal">#{ret.orderId.slice(-8).toUpperCase()}</p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[150px] mt-1">{ret.order?.customerName}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-500" />
                        <p className="text-xs text-charcoal font-medium">{ret.reason}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(ret.status)}`}>
                        {ret.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-charcoal">₹{ret.refundAmount?.toLocaleString() || '0'}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">{ret.refundStatus || 'PENDING'}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        {ret.status === 'REQUESTED' && (
                          <>
                            <button 
                              onClick={() => handleApprove(ret.id)}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                              title="Approve Return"
                            >
                              <CheckCircle2 size={12} /> Approve
                            </button>
                            <button 
                              onClick={() => handleReject(ret.id)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                              title="Reject Return"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        )}
                        <button className="p-2 text-gray-400 hover:text-wine bg-gray-50 rounded-lg">
                           <ChevronRight size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
