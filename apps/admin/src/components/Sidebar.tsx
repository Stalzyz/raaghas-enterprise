"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart, Users, MessageSquare, BarChart3, MessageCircle,
  Truck, ClipboardList, Sparkles, LayoutDashboard, Package, Image, Settings, Zap,
  LogOut, Wallet, FileText, Landmark, RefreshCw, LayoutGrid, Mail, HardDrive
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  roles?: string[]; // Optional: restrict to specific roles (legacy)
  permission?: string; // Optional: restrict to specific permission
  isCollapsed?: boolean;
  onLinkClick?: () => void;
}

function SidebarLink({ href, icon, label, roles, permission, isCollapsed, onLinkClick }: SidebarLinkProps) {
  const pathname = usePathname();
  const { user, isLoading } = useAdminAuth();
  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));

  // If roles are specified, check if user has one of them
  // Hide if loading or if user doesn't have the role
  // 1. Check Granular Permissions (Priority)
  if (permission) {
    if (isLoading) return null;
    if (!user) return null;
    
    // Admins have bypass
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
    const hasPermission = user.permissions?.includes(permission);
    
    if (!isAdmin && !hasPermission && !['OPERATIONS', 'MARKETING', 'FINANCE'].includes(user.role)) {
      return null;
    }
  }

  // 2. Check Legacy Roles (Fallback)
  if (roles && !permission) {
    if (isLoading) return null;
    if (!user || !roles.includes(user.role)) return null;
  }

  return (
    <Link 
      href={href} 
      onClick={onLinkClick}
      title={isCollapsed ? label : undefined}
      className={`relative flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'} rounded-lg text-sm font-medium transition-all duration-200 group ${
        isActive 
          ? "bg-wine text-ivory shadow-lg shadow-wine/20" 
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <div className={`${isActive ? "text-ivory" : "text-gray-400 group-hover:text-wine"} transition-colors flex items-center justify-center`}>
        {icon}
      </div>
      {!isCollapsed && <span>{label}</span>}
      
      {/* Floating Tooltip when Collapsed */}
      {isCollapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50">
          {label}
        </div>
      )}
    </Link>
  );
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggleCollapse, isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAdminAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside className={`bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-300 flex-shrink-0 ${
        // Mobile Drawer behavior (< 768px)
        isMobileOpen 
          ? "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-64 max-md:shadow-2xl max-md:translate-x-0" 
          : "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-64 max-md:-translate-x-full"
      } ${
        // Tablet & Desktop Collapsed vs Expanded (>= 768px)
        isCollapsed ? "md:w-20" : "md:w-64"
      }`}>
        {/* Header */}
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-6'} border-b border-gray-100`}>
          {!isCollapsed ? (
            <div className="flex items-center">
              <span className="text-xl font-bold tracking-tight text-wine">RAAGHAS</span>
              <span className="ml-2 px-1.5 py-0.5 bg-beige text-[10px] uppercase font-bold text-wine rounded leading-none">Admin</span>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-wine text-ivory flex items-center justify-center font-bold text-lg shadow-sm">
              R
            </div>
          )}

          {/* Toggle Button for Desktop/Tablet */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-wine hover:bg-gray-100 transition-colors"
            >
              {isCollapsed ? <LayoutGrid size={18} /> : <Zap size={18} />}
            </button>
          )}
        </div>
        
        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          <SidebarLink href="/" icon={<LayoutDashboard size={18} />} label="Overview" permission="module:dashboard" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/products" icon={<Package size={18} />} label="Products" permission="module:products" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/products/size-guides" icon={<Settings size={18} />} label="Size Guides" permission="module:products" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/products/collections" icon={<LayoutGrid size={18} />} label="Collections" permission="module:products" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/products/shopify" icon={<Sparkles size={18} />} label="Import Products" permission="module:products" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/media" icon={<Image size={18} />} label="Images & Videos" permission="module:media" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/orders" icon={<ShoppingCart size={18} />} label="Orders" permission="module:orders" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/customers" icon={<Users size={18} />} label="Customers" permission="module:customers" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/reviews" icon={<MessageSquare size={18} />} label="Reviews" permission="module:reviews" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          
          {/* Section Divider */}
          {!isCollapsed ? (
            <div className="pt-5 pb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400/60">Marketing</div>
          ) : (
            <div className="my-3 border-t border-gray-100" />
          )}

          <SidebarLink href="/marketing/coupons" icon={<Sparkles size={18} />} label="Coupons & Offers" permission="module:marketing" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/marketing/wallet" icon={<ClipboardList size={18} />} label="Store Credits" permission="module:marketing" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/marketing/referrals" icon={<Users size={18} />} label="Referrals" permission="module:marketing" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/marketing" icon={<MessageCircle size={18} />} label="Campaigns" permission="module:marketing" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />

          {!isCollapsed ? (
            <div className="pt-4 pb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400/60">Design</div>
          ) : (
            <div className="my-3 border-t border-gray-100" />
          )}
          <SidebarLink href="/cms" icon={<Settings size={18} />} label="Website Design" permission="module:cms" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/cms/pages" icon={<FileText size={18} />} label="Pages" permission="module:cms" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />

          {!isCollapsed ? (
            <div className="pt-4 pb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400/60">Supply Partners</div>
          ) : (
            <div className="my-3 border-t border-gray-100" />
          )}
          <SidebarLink href="/procurement/suppliers" icon={<Users size={18} />} label="Partners List" permission="module:procurement" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/procurement/orders" icon={<ClipboardList size={18} />} label="Stock Orders" permission="module:procurement" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />

          {!isCollapsed ? (
            <div className="pt-4 pb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400/60">Partner Channels</div>
          ) : (
            <div className="my-3 border-t border-gray-100" />
          )}
          <SidebarLink href="/wholesale/retailers" icon={<Users size={18} />} label="Store Partners" permission="module:wholesale" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/wholesale/price-lists" icon={<BarChart3 size={18} />} label="Price Settings" permission="module:wholesale" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/wholesale/orders" icon={<ShoppingCart size={18} />} label="Partner Orders" permission="module:wholesale" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          
          {!isCollapsed ? (
            <div className="pt-4 pb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400/60">Shipping</div>
          ) : (
            <div className="my-3 border-t border-gray-100" />
          )}
          <SidebarLink href="/logistics/fulfillment" icon={<ClipboardList size={18} />} label="Shipping Desk" permission="module:logistics" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/logistics/shipments" icon={<Truck size={18} />} label="Track Shipments" permission="module:logistics" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/logistics/returns" icon={<RefreshCw size={18} />} label="Returns" permission="module:logistics" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/logistics/shipping" icon={<Settings size={18} />} label="Shipping Settings" permission="module:logistics" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />

          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'OPERATIONS' || user?.role === 'ACCOUNTANT' || user?.role === 'FINANCE' || user?.permissions?.includes('module:finance')) && (
            <>
              {!isCollapsed ? (
                <div className="pt-4 pb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400/60">Finance</div>
              ) : (
                <div className="my-3 border-t border-gray-100" />
              )}
              <SidebarLink href="/analytics" icon={<BarChart3 size={18} />} label="Sales Reports" permission="module:finance" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
              <SidebarLink href="/analytics/ledger" icon={<Landmark size={18} />} label="Transactions" permission="module:finance" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
              <SidebarLink href="/invoices/history" icon={<FileText size={18} />} label="Invoices" permission="module:finance" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
              <SidebarLink href="/analytics/tax-reports" icon={<ClipboardList size={18} />} label="Tax Reports" permission="module:finance" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
              <SidebarLink href="/reconciliation" icon={<RefreshCw size={18} />} label="Reconciliation" permission="module:finance" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
            </>
          )}
          
          {!isCollapsed ? (
            <div className="pt-4 pb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400/60">Configuration</div>
          ) : (
            <div className="my-3 border-t border-gray-100" />
          )}
          <SidebarLink href="/roles" icon={<Users size={18} />} label="Team Access" permission="module:roles" roles={['SUPER_ADMIN']} isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/settings" icon={<Settings size={18} />} label="Store Settings" permission="module:settings" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/settings/email-templates" icon={<Mail size={18} />} label="Email Templates" permission="module:settings" isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
          <SidebarLink href="/settings/backups" icon={<HardDrive size={18} />} label="Backups" roles={['SUPER_ADMIN', 'ADMIN']} isCollapsed={isCollapsed} onLinkClick={onCloseMobile} />
        </nav>

        {/* Footer Profile & Logout */}
        <div className={`p-3 border-t border-gray-100 space-y-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
           <Link 
            href="/profile" 
            onClick={onCloseMobile}
            title={isCollapsed ? (user?.name || 'Profile') : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'} cursor-pointer hover:bg-gray-50 rounded-xl transition-all group`}
           >
             <div className="w-9 h-9 rounded-full bg-wine text-ivory flex items-center justify-center text-xs font-bold font-serif shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
               {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
             </div>
             {!isCollapsed && (
               <div className="flex-1 overflow-hidden">
                 <p className="text-xs font-bold text-charcoal truncate">{user?.name || 'Admin User'}</p>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{user?.email || 'Super Admin'}</p>
               </div>
             )}
           </Link>
           
           <button 
            onClick={logout}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center p-2.5 w-auto' : 'w-full gap-3 px-4 py-2.5'} rounded-xl text-xs font-bold uppercase tracking-[0.15em] text-red-600 hover:bg-red-50 hover:text-red-700 transition-all active:scale-[0.98]`}
           >
             <LogOut size={16} />
             {!isCollapsed && <span>Sign Out</span>}
           </button>
        </div>
      </aside>
    </>
  );
}

