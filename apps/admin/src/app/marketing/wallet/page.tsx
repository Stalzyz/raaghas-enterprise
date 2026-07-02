"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import { Search, IndianRupee, History, ArrowUpRight, ArrowDownLeft, ShieldAlert, Loader2, UserPlus, Download } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function WalletManagement() {
  const { token } = useAdminAuth();
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("CUSTOMER");
  const [adjustment, setAdjustment] = useState({ amount: 0, type: "CREDIT", reason: "MANUAL_ADJUSTMENT", notes: "" });

  const fetchWallets = async () => {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/customers?role=${selectedRole}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const customers = await res.json();
        const customerIds = customers.slice(0, 50).map((c: any) => c.id).join(',');
        
        if (customerIds) {
          const baseUrl = API_BASE;
          const wRes = await fetch(`${baseUrl}/growth/wallet/bulk?userIds=${customerIds}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const walletsData = wRes.ok ? await wRes.json() : [];
          
          const merged = customers.slice(0, 50).map((c: any) => {
            const wallet = walletsData.find((w: any) => w.userId === c.id) || { balance: 0, transactions: [] };
            return { ...c, wallet };
          });
          setWallets(merged);
        } else {
          setWallets([]);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWallets(); }, [token, selectedRole]);

  const handleAdjust = async () => {
    if (!selectedWallet) return;
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/growth/wallet/adjust`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          userId: selectedWallet.id, 
          ...adjustment 
        })
      });
      if (res.ok) {
        fetchWallets();
        setSelectedWallet(null);
        setAdjustment({ amount: 0, type: "CREDIT", reason: "MANUAL_ADJUSTMENT", notes: "" });
      }
    } catch (err) { console.error(err); }
  };

  const handleExportCSV = () => {
    const headers = ["Customer Name", "Email", "Role", "Balance (₹)"];
    const rows = wallets.map(w => [
      `"${(w.name || 'Anonymous').replace(/"/g, '""')}"`,
      `"${w.email}"`,
      w.role,
      Number(w.wallet?.balance || 0).toFixed(2)
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wallet_balances_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Wallets & Credits</h2>
          <p className="text-gray-500 text-sm mt-1">Monitor balances, issue store credits, and track financial goodwill for all roles.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest text-charcoal hover:border-wine hover:text-wine transition-all shadow-sm"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Customer List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-wine"
              />
            </div>
            <select 
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:border-wine"
            >
              <option value="CUSTOMER">Customers</option>
              <option value="ADMIN">Admins</option>
              <option value="OPERATIONS">Operations</option>
              <option value="MARKETING">Marketing</option>
              <option value="FINANCE">Finance</option>
              <option value="ALL">All Roles</option>
            </select>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Details</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Balance</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={3} className="p-10 text-center"><Loader2 className="animate-spin text-wine mx-auto" size={24} /></td></tr>
                ) : wallets.filter(w => w.email.toLowerCase().includes(search.toLowerCase()) || w.name?.toLowerCase().includes(search.toLowerCase())).map(w => (
                  <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <p className="text-sm font-bold text-charcoal">{w.name || 'Anonymous'}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{w.email}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-[9px] font-bold text-gray-500 rounded uppercase tracking-tighter">
                        {w.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-sm font-bold text-wine flex items-center justify-end">
                        <IndianRupee size={12} /> {Number(w.wallet?.balance || 0).toLocaleString()}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => setSelectedWallet(w)}
                        className="text-[10px] font-bold uppercase tracking-widest text-wine border-b border-wine pb-0.5"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Adjustment Panel / History */}
        <div className="space-y-6">
          {selectedWallet ? (
            <div className="bg-white rounded-[2rem] border border-wine/10 p-8 shadow-xl space-y-6 animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-charcoal tracking-tight">Adjust Balance</h3>
                <button onClick={() => setSelectedWallet(null)} className="text-gray-300 hover:text-charcoal">&times;</button>
              </div>
              
              <div className="p-4 bg-wine/5 rounded-2xl border border-wine/10">
                <p className="text-[10px] font-bold text-wine uppercase tracking-widest mb-1">Target Customer</p>
                <p className="text-sm font-bold text-charcoal">{selectedWallet.name || selectedWallet.email}</p>
                <p className="text-xs text-gray-500">Current: ₹{Number(selectedWallet.wallet?.balance || 0).toLocaleString()}</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setAdjustment({...adjustment, type: "CREDIT"})}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${adjustment.type === 'CREDIT' ? 'bg-green-600 text-white' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}
                  >
                    <ArrowUpRight size={14} /> Credit
                  </button>
                  <button 
                    onClick={() => setAdjustment({...adjustment, type: "DEBIT"})}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${adjustment.type === 'DEBIT' ? 'bg-red-600 text-white' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}
                  >
                    <ArrowDownLeft size={14} /> Debit
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Amount</label>
                  <input 
                    type="number"
                    value={adjustment.amount}
                    onChange={e => setAdjustment({...adjustment, amount: parseFloat(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-wine"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Reason</label>
                  <select 
                    value={adjustment.reason}
                    onChange={e => setAdjustment({...adjustment, reason: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-wine"
                  >
                    <option value="MANUAL_ADJUSTMENT">Admin Correction</option>
                    <option value="REFUND">Return Credit</option>
                    <option value="REFERRAL_REWARD">Goodwill/Incentive</option>
                    <option value="LOYALTY_REWARD">Loyalty Reward</option>
                  </select>
                </div>

                <button 
                  onClick={handleAdjust}
                  className="w-full py-4 bg-charcoal text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                >
                  Apply Adjustment
                </button>
              </div>

              {/* Transaction History Section */}
              {selectedWallet.wallet?.transactions && selectedWallet.wallet.transactions.length > 0 && (
                <div className="pt-6 border-t border-gray-100 mt-6 space-y-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Transactions</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedWallet.wallet.transactions.map((tx: any) => (
                      <div key={tx.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="text-xs font-bold text-charcoal">{tx.reason.replace(/_/g, ' ')}</p>
                          <p className="text-[9px] text-gray-400 font-medium mt-0.5">
                            {new Date(tx.createdAt).toLocaleDateString()} &middot; {tx.notes || 'No notes'}
                          </p>
                        </div>
                        <p className={`text-xs font-bold ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'CREDIT' ? '+' : '-'}₹{Number(tx.amount).toFixed(0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gray-200 shadow-sm">
                <History size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400">Select a customer</p>
                <p className="text-[10px] text-gray-300 uppercase font-bold tracking-widest mt-1">to view history or adjust credits</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <ShieldAlert size={14} className="text-wine" /> Wallet Policy
            </h3>
            <ul className="space-y-3">
              <li className="text-[10px] text-gray-500 font-medium leading-relaxed">
                <span className="font-bold text-charcoal">Redemption Cap:</span> Max 50% of order value can be paid via credits.
              </li>
              <li className="text-[10px] text-gray-500 font-medium leading-relaxed">
                <span className="font-bold text-charcoal">Expiry:</span> Credits issued for returns do not expire. Promotional credits expire in 90 days.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
