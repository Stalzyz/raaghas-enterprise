"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { 
  ArrowLeft, Building2, Phone, Mail, MapPin, Loader2,
  TrendingUp, CreditCard, Clock, FileText, CheckCircle2, ClipboardList,
  X, Save, User, Trash2
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function SupplierDashboard() {
  const { id } = useParams() as { id: string };
  const { token } = useAdminAuth();
  const router = useRouter();
  
  const [supplier, setSupplier] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    category: "",
    gstNumber: "",
    address: ""
  });

  useEffect(() => {
    if (token) fetchData();
  }, [id, token]);

  const fetchData = async () => {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/procurement/suppliers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSupplier(data);
        setOrders(data.purchaseOrders || []);
        setFormData({
          name: data.name || "",
          contactPerson: data.contactPerson || "",
          email: data.email || "",
          phone: data.phone || "",
          category: data.category || "",
          gstNumber: data.gstNumber || "",
          address: data.address || ""
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/procurement/suppliers/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err) {
      alert("Failed to update supplier.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/procurement/suppliers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        router.push("/procurement/suppliers");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to delete supplier");
      }
    } catch (err) {
      alert("An error occurred while deleting the supplier");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-wine" size={40} /></div>;
  if (!supplier) return <div className="p-20 text-center text-gray-500">Supplier not found.</div>;

  const totalPurchases = orders.reduce((acc, o) => acc + (Number(o.totalCost) || Number(o.total) || 0), 0);
  const totalPaid = orders.reduce((acc, o) => acc + (Number(o.paid) || 0), 0);
  const outstanding = Math.max(0, totalPurchases - totalPaid);

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 lg:p-8">
       <Link href="/procurement/suppliers" className="inline-flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-gray-400 hover:text-wine mb-4">
         <ArrowLeft size={16} /> Back to Directory
       </Link>

       {/* HEADER */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex items-center gap-6">
             <div className="w-20 h-20 bg-wine text-white rounded-2xl flex items-center justify-center shadow-lg shadow-wine/20">
                <Building2 size={36} />
             </div>
             <div>
                <h1 className="text-3xl font-bold tracking-tight text-charcoal">{supplier.name}</h1>
                <p className="text-sm font-medium text-gray-500">{supplier.category || "General Vendor"}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                   {supplier.email && <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium"><Mail size={14}/> {supplier.email}</span>}
                   {supplier.phone && <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium"><Phone size={14}/> {supplier.phone}</span>}
                   {supplier.contactPerson && <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium"><User size={14}/> {supplier.contactPerson}</span>}
                </div>
             </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <button 
               onClick={handleDelete}
               className="w-full sm:w-auto bg-white border border-red-200 text-red-600 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
             >
                <Trash2 size={16} /> Delete
             </button>
             <button 
               onClick={() => setIsModalOpen(true)}
               className="w-full sm:w-auto bg-charcoal text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-wine transition-all shadow-lg active:scale-95"
             >
                Edit Profile
             </button>
          </div>
       </div>

       {/* KPI METRICS */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-wine/20 transition-all">
             <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><TrendingUp size={18}/></div>
             <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Total Lifetime Purchases</p>
             <p className="text-3xl font-bold text-charcoal mt-1">₹{totalPurchases.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-red-100 transition-all">
             <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Clock size={18}/></div>
             <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Outstanding Payment</p>
             <p className="text-3xl font-bold text-red-600 mt-1">₹{outstanding.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-blue-100 transition-all">
             <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><FileText size={18}/></div>
             <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Ledger Count</p>
             <p className="text-3xl font-bold text-charcoal mt-1">{orders.length} <span className="text-sm font-normal text-gray-400">Orders</span></p>
          </div>
       </div>

       {/* HISTORY */}
       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
             <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-charcoal flex items-center gap-2"><ClipboardList size={16} className="text-wine"/> Purchase History</h3>
             <Link href="/procurement/orders" className="text-xs text-wine font-bold uppercase tracking-widest hover:underline">+ Record New Purchase</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                 <tr className="border-b border-gray-100 text-[10px] uppercase font-bold tracking-widest text-gray-400 bg-gray-50">
                    <th className="py-4 px-6 font-medium">Date</th>
                    <th className="py-4 px-6 font-medium">PO Tag</th>
                    <th className="py-4 px-6 font-medium">Amount</th>
                    <th className="py-4 px-6 font-medium">Paid</th>
                    <th className="py-4 px-6 font-medium">Outstanding</th>
                    <th className="py-4 px-6 font-medium">Status</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {orders.map((o, i) => {
                    const amount = Number(o.totalCost) || Number(o.total) || 0;
                    const paid = Number(o.paid) || 0;
                    const bal = Math.max(0, amount - paid);
                    return (
                      <tr key={o.id || i} className="hover:bg-gray-50/80 transition">
                         <td className="py-4 px-6 text-sm text-charcoal">{new Date(o.createdAt || o.date).toLocaleDateString()}</td>
                         <td className="py-4 px-6 text-sm text-wine font-bold">PO-{(o.id || '').substring(0,6).toUpperCase()}</td>
                         <td className="py-4 px-6 text-sm text-charcoal font-medium">₹{amount.toLocaleString()}</td>
                         <td className="py-4 px-6 text-sm text-gray-500">₹{paid.toLocaleString()}</td>
                         <td className="py-4 px-6 text-sm font-bold text-red-500">₹{bal.toLocaleString()}</td>
                         <td className="py-4 px-6">
                            <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-widest rounded ${o.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                               {o.status}
                            </span>
                         </td>
                      </tr>
                    );
                 })}
                 {orders.length === 0 && (
                    <tr>
                       <td colSpan={6} className="py-12 text-center text-sm text-gray-500">No purchase records found.</td>
                    </tr>
                 )}
              </tbody>
            </table>
          </div>
       </div>

       {/* EDIT MODAL */}
       {isModalOpen && (
         <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div>
                     <h3 className="text-lg font-bold text-charcoal">Edit Supplier Profile</h3>
                     <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Update basic business details</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                     <X size={20} />
                  </button>
               </div>

               <form onSubmit={handleSave} className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Company Name</label>
                        <input 
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-wine/30 transition-all outline-none"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Contact Person</label>
                        <input 
                          value={formData.contactPerson}
                          onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                          className="w-full px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-wine/30 transition-all outline-none"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Category</label>
                        <input 
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-wine/30 transition-all outline-none"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Email Address</label>
                        <input 
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-wine/30 transition-all outline-none"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Phone Number</label>
                        <input 
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-wine/30 transition-all outline-none"
                        />
                     </div>
                     <div className="col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Address</label>
                        <textarea 
                          rows={2}
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-wine/30 transition-all outline-none"
                        />
                     </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button 
                       type="button"
                       onClick={() => setIsModalOpen(false)}
                       className="flex-1 px-6 py-3 border border-gray-100 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-all"
                     >
                        Cancel
                     </button>
                     <button 
                       type="submit"
                       disabled={isSaving}
                       className="flex-1 px-6 py-3 bg-wine text-ivory rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-wine/20 hover:bg-wine-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                        {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        Save Changes
                     </button>
                  </div>
               </form>
            </div>
         </div>
       )}
    </div>
  );
}
