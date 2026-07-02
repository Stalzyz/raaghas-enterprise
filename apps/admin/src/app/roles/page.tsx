"use client";

import { API_BASE } from "@/lib/api";
import { useState, useEffect } from "react";
import { 
  Users, Shield, Lock, CheckCircle2, Plus, X, 
  LayoutDashboard, Package, Image, ShoppingCart, 
  MessageSquare, Zap, Settings, Truck, BarChart3, 
  FileText, ClipboardList, Info, Trash2, Mail, Key
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

const MODULES = [
  { id: "module:dashboard", label: "Overview", icon: <LayoutDashboard size={16} />, description: "View sales summary and stats" },
  { id: "module:products", label: "Products", icon: <Package size={16} />, description: "Manage items, variants, and collections" },
  { id: "module:media", label: "Images & Videos", icon: <Image size={16} />, description: "Upload and organize photos" },
  { id: "module:orders", label: "Orders", icon: <ShoppingCart size={16} />, description: "View and process customer orders" },
  { id: "module:customers", label: "Customers", icon: <Users size={16} />, description: "Manage customer profiles" },
  { id: "module:reviews", label: "Reviews", icon: <MessageSquare size={16} />, description: "Read and approve product reviews" },
  { id: "module:marketing", label: "Marketing", icon: <Zap size={16} />, description: "Coupons, offers, and campaigns" },
  { id: "module:cms", label: "Website Design", icon: <FileText size={16} />, description: "Design pages and theme" },
  { id: "module:procurement", label: "Suppliers", icon: <ClipboardList size={16} />, description: "Manage suppliers and purchase orders" },
  { id: "module:wholesale", label: "Wholesale", icon: <BarChart3 size={16} />, description: "Price lists and wholesale orders" },
  { id: "module:logistics", label: "Shipping", icon: <Truck size={16} />, description: "Track shipments and handle returns" },
  { id: "module:finance", label: "Finance", icon: <BarChart3 size={16} />, description: "Transactions, invoices, and tax reports" },
  { id: "module:settings", label: "Store Settings", icon: <Settings size={16} />, description: "General settings and connections" },
  { id: "module:roles", label: "Team Permissions", icon: <Shield size={16} />, description: "Manage who can access what" },
];

export default function RolesAndUsersPage() {
  const { token } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<"roles" | "users">("roles");
  const [roles, setRoles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  // Role Form State
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  
  // User Form State
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRoleId, setUserRoleId] = useState("");
  const [userLegacyRole, setUserLegacyRole] = useState("ADMIN");

  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/auth/roles`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (usersRes.ok) setStaff(await usersRes.json());
    } catch (err) {
      console.error("Failed to fetch security data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Role Handlers ---
  const openRoleModal = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setRoleName(role.name.replace(/_/g, ' '));
      setRoleDesc(role.description || "");
      setSelectedPerms(role.permissions?.map((p: any) => p.action) || []);
    } else {
      setEditingRole(null);
      setRoleName("");
      setRoleDesc("");
      setSelectedPerms(["module:dashboard"]);
    }
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleName) return;
    setSaving(true);
    try {
      const url = `${API_BASE}/auth/roles${editingRole ? `/${editingRole.id}` : ''}`;
      const res = await fetch(url, {
        method: editingRole ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: roleName.toUpperCase().replace(/\s+/g, '_'),
          description: roleDesc,
          permissions: selectedPerms
        })
      });
      if (res.ok) {
        setShowRoleModal(false);
        fetchData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || "Failed to save role.");
      }
    } catch (err) { alert("Failed to save role."); }
    finally { setSaving(false); }
  };

  // --- User Handlers ---
  const openUserModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setUserName(user.name || "");
      setUserEmail(user.email);
      setUserPassword("");
      setUserRoleId(user.roleId || "");
      setUserLegacyRole(user.role);
    } else {
      setEditingUser(null);
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      setUserRoleId("");
      setUserLegacyRole("ADMIN");
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userEmail) return;
    setSaving(true);
    try {
      const url = `${API_BASE}/auth/users${editingUser ? `/${editingUser.id}` : ''}`;
      const res = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: userName,
          email: userEmail,
          password: userPassword || undefined,
          role: userLegacyRole,
          roleId: userRoleId || null
        })
      });
      if (res.ok) {
        setShowUserModal(false);
        fetchData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || "Failed to save user.");
      }
    } catch (err) { alert("Failed to save user."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (type: 'role' | 'user', id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/auth/${type}s/${id}`, { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) { alert(`Failed to delete ${type}.`); }
  };

  const togglePermission = (permId: string) => {
    setSelectedPerms(prev => prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[#FDFCFB]">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-wine flex items-center gap-4">
            <Shield className="text-wine animate-pulse" size={32} />
            Team Access
          </h1>
          <div className="flex items-center gap-1 mt-6 bg-wine/5 p-1 rounded-2xl w-fit border border-wine/10">
             <button 
              onClick={() => setActiveTab("roles")}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'roles' ? 'bg-wine text-white shadow-lg' : 'text-wine/60 hover:text-wine'}`}
             >
               Roles
             </button>
             <button 
              onClick={() => setActiveTab("users")}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-wine text-white shadow-lg' : 'text-wine/60 hover:text-wine'}`}
             >
               Team Members
             </button>
          </div>
        </div>
        
        <button 
          onClick={() => activeTab === 'roles' ? openRoleModal() : openUserModal()}
          className="bg-wine text-ivory px-8 py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-wine/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <Plus size={20} />
          {activeTab === 'roles' ? 'Add New Role' : 'Add Team Member'}
        </button>
      </div>

      {loading ? (
        <div className="py-32 text-center">
          <div className="w-16 h-16 border-4 border-wine/20 border-t-wine rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Loading...</p>
        </div>
      ) : activeTab === 'roles' ? (
        /* --- Roles Grid --- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {roles.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-white rounded-[2rem] border border-dashed border-gray-200">
               <Shield className="text-gray-200 mx-auto mb-4" size={64} />
               <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No custom roles defined.</p>
            </div>
          ) : roles.map((role) => (
            <div key={role.id} className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all group relative flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] bg-wine/5 text-wine">{role.name}</div>
                <span className="text-[10px] font-bold text-gray-400">{role._count?.users || 0} Users</span>
              </div>
              <h3 className="text-2xl font-bold text-charcoal mb-3 font-serif">{role.name.replace(/_/g, ' ')}</h3>
              <p className="text-sm text-gray-500 mb-8 flex-1">{role.description || "Custom defined role."}</p>
              <div className="space-y-3 mb-8">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Permissions</div>
                <div className="flex flex-wrap gap-2">
                  {(role.permissions || []).slice(0, 6).map((p: any) => (
                    <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100 text-[10px] font-bold text-gray-600">
                      <CheckCircle2 size={10} className="text-green-500" />
                      <span>{p.action.split(':')[1]?.toUpperCase()}</span>
                    </div>
                  ))}
                  {role.permissions?.length > 6 && <div className="text-[10px] font-bold text-gray-400">+{role.permissions.length - 6} More</div>}
                </div>
              </div>
              <div className="flex gap-3 pt-6 border-t border-gray-50">
                <button onClick={() => openRoleModal(role)} className="flex-1 py-3 bg-charcoal text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-wine transition-colors">Edit</button>
                <button onClick={() => handleDelete('role', role.id)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* --- Users List --- */
        <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              <tr>
                <th className="px-8 py-6 text-left">Team Member</th>
                <th className="px-8 py-6 text-left">Base Role</th>
                <th className="px-8 py-6 text-left">Custom Role</th>
                <th className="px-8 py-6 text-left">Access Level</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-wine/10 text-wine flex items-center justify-center font-bold font-serif">{user.name?.[0] || user.email?.[0].toUpperCase()}</div>
                      <div>
                        <p className="text-sm font-bold text-charcoal">{user.name || "Unnamed Staff"}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">{user.role}</span>
                  </td>
                  <td className="px-8 py-6">
                    {user.roleRef ? (
                      <span className="px-3 py-1 bg-wine/5 text-wine border border-wine/10 rounded-lg text-[10px] font-bold uppercase tracking-widest">{user.roleRef.name}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300 italic uppercase tracking-widest">Global Default</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-1.5 text-xs text-charcoal font-medium">
                      <Shield size={14} className={user.role === 'SUPER_ADMIN' ? 'text-wine' : 'text-blue-400'} />
                      {user.role === 'SUPER_ADMIN' ? 'Unrestricted' : 'Module Restricted'}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openUserModal(user)} className="p-2.5 text-gray-400 hover:text-charcoal hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-all"><Settings size={16} /></button>
                      <button onClick={() => handleDelete('user', user.id)} className="p-2.5 text-red-300 hover:text-red-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Role Modal --- */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-serif font-bold text-charcoal">{editingRole ? 'Edit Role' : 'Create New Role'}</h3>
                <p className="text-xs text-gray-400 mt-1">Choose what this role is allowed to see and do.</p>
              </div>
              <button onClick={() => setShowRoleModal(false)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-charcoal shadow-sm"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5 space-y-8">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-wine mb-3">Role Name</label>
                    <input type="text" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. Manager" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-wine/5" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-wine mb-3">Role Description</label>
                    <textarea rows={4} value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} placeholder="What can this role do?" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-wine/5 resize-none" />
                  </div>
                </div>
                <div className="lg:col-span-7">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-wine mb-4">Permissions</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {MODULES.map((module) => (
                      <div key={module.id} onClick={() => togglePermission(module.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 group ${selectedPerms.includes(module.id) ? 'bg-wine/5 border-wine/20' : 'bg-white border-gray-100'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedPerms.includes(module.id) ? 'bg-wine text-white' : 'bg-gray-50 text-gray-400'}`}>{module.icon}</div>
                        <div className="flex-1">
                          <p className={`text-xs font-bold uppercase tracking-widest ${selectedPerms.includes(module.id) ? 'text-wine' : 'text-charcoal'}`}>{module.label}</p>
                          <p className="text-[9px] text-gray-400 mt-1 leading-tight line-clamp-1">{module.description}</p>
                        </div>
                        {selectedPerms.includes(module.id) && <CheckCircle2 size={16} className="text-green-500" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-gray-100 flex justify-end gap-4">
              <button onClick={() => setShowRoleModal(false)} className="px-8 py-3.5 border border-gray-200 text-charcoal font-bold text-[10px] uppercase tracking-widest rounded-2xl">Cancel</button>
              <button onClick={handleSaveRole} disabled={saving} className="px-12 py-3.5 bg-charcoal text-white font-bold text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:bg-wine transition-all flex items-center gap-2">{saving && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}{editingRole ? 'Save Changes' : 'Create Role'}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- User Modal --- */}
      {showUserModal && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] max-w-xl w-full p-10 shadow-2xl relative">
            <button onClick={() => setShowUserModal(false)} className="absolute top-8 right-8 text-gray-400 hover:text-charcoal"><X size={24}/></button>
            <div className="mb-10 text-center">
               <div className="w-16 h-16 rounded-full bg-wine/10 text-wine flex items-center justify-center mx-auto mb-4"><Users size={32} /></div>
               <h3 className="text-2xl font-serif font-bold text-charcoal">{editingUser ? 'Update Team Member' : 'Add Team Member'}</h3>
               <p className="text-xs text-gray-400 mt-2 font-medium">Assign a role to manage what they can do in the system.</p>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Full Name</label>
                  <div className="relative">
                    <Users size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none" placeholder="John Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none" placeholder="john@raaghas.com" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Password</label>
                <div className="relative">
                  <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none" placeholder={editingUser ? "Leave blank to keep same" : "Set password"} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Base Role</label>
                    <select value={userLegacyRole} onChange={(e) => setUserLegacyRole(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none appearance-none">
                       <option value="SUPER_ADMIN">SUPER ADMIN</option>
                       <option value="ADMIN">ADMIN</option>
                       <option value="OPERATIONS">OPERATIONS</option>
                       <option value="MARKETING">MARKETING</option>
                       <option value="FINANCE">FINANCE</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-wine mb-2">Custom Role</label>
                    <select value={userRoleId} onChange={(e) => setUserRoleId(e.target.value)} className="w-full px-4 py-3 bg-wine/5 border border-wine/10 rounded-xl text-sm font-bold text-wine outline-none appearance-none">
                       <option value="">No Custom Role</option>
                       {roles.map(r => <option key={r.id} value={r.id}>{r.name.replace(/_/g, ' ')}</option>)}
                    </select>
                 </div>
              </div>
            </div>

            <div className="mt-12 flex gap-4">
               <button onClick={() => setShowUserModal(false)} className="flex-1 py-4 border border-gray-200 text-charcoal font-bold text-[10px] uppercase tracking-widest rounded-2xl">Cancel</button>
               <button onClick={handleSaveUser} disabled={saving} className="flex-1 py-4 bg-wine text-white font-bold text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-wine/20 flex items-center justify-center gap-3">
                 {saving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                 {editingUser ? 'Save User' : 'Add Member'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
