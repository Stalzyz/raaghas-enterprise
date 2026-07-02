"use client";

import { API_BASE } from "@/lib/api";

import { useState } from "react";
import { User, Mail, Shield, Lock, Key, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function ProfilePage() {
  const { user, token } = useAdminAuth();
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [info, setInfo] = useState({ name: user?.name || "", email: user?.email || "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(info)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
      }

      setMessage({ text: "Profile updated successfully!", type: "success" });
      setIsEditingInfo(false);
      // We might need to refresh the auth context here if it doesn't auto-update
      window.location.reload(); 
    } catch (error: any) {
      setMessage({ text: error.message, type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ text: "New passwords do not match", type: "error" });
      return;
    }

    setIsUpdating(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to change password");
      }

      setMessage({ text: "Password updated successfully!", type: "success" });
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      setMessage({ text: error.message, type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1 font-medium font-sans">Manage your personal details and account security.</p>
        </div>
        {message.text && (
          <div className={`px-4 py-2 rounded-xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* User Info Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6 relative overflow-hidden">
          <div className="w-20 h-20 rounded-full bg-wine text-ivory flex items-center justify-center text-2xl font-bold font-serif shadow-xl mx-auto relative z-10">
            {user?.name?.[0] || user?.email?.[0]?.toUpperCase()}
          </div>
          
          <div className="space-y-4">
            {isEditingInfo ? (
              <form onSubmit={handleInfoUpdate} className="space-y-3">
                <input 
                  type="text"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none focus:border-wine/30"
                  value={info.name}
                  onChange={(e) => setInfo({...info, name: e.target.value})}
                  placeholder="Full Name"
                />
                <input 
                  type="email"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none focus:border-wine/30"
                  value={info.email}
                  onChange={(e) => setInfo({...info, email: e.target.value})}
                  placeholder="Email Address"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-2 bg-wine text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">Save</button>
                  <button type="button" onClick={() => setIsEditingInfo(false)} className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold uppercase tracking-widest">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-charcoal">{user?.name || 'Admin User'}</h2>
                <p className="text-sm text-gray-400 font-medium">{user?.email}</p>
                <button 
                  onClick={() => setIsEditingInfo(true)}
                  className="text-[10px] font-bold text-wine uppercase tracking-widest hover:underline mt-2"
                >
                  Edit Information
                </button>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-50 space-y-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Shield size={16} className="text-wine" />
              <span className="font-bold uppercase tracking-widest text-[10px]">{user?.role}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <CheckCircle2 size={16} className="text-green-500" />
              <span>Verified Account</span>
            </div>
          </div>
        </div>

        {/* Password Reset Card */}
        <div className="md:col-span-2 bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
          <h3 className="text-lg font-bold text-charcoal flex items-center gap-2 mb-6">
            <Lock size={18} className="text-wine" />
            Security & Password
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Current Password</label>
              <input 
                type="password"
                required
                value={passwords.current}
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-wine/10 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">New Password</label>
                <input 
                  type="password"
                  required
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-wine/10 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Confirm New Password</label>
                <input 
                  type="password"
                  required
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-wine/10 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={isUpdating}
                className="flex items-center gap-2 bg-wine text-ivory px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <Key size={18} />}
                Update Security Credentials
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
