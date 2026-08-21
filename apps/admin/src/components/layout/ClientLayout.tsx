"use client";

import { Sidebar } from "@/components/Sidebar";
import { usePathname } from "next/navigation";
import { AuthProvider, useAdminAuth } from "@/components/providers/AuthProvider";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";

function AuthGuard({ children, isAuthPage }: { children: React.ReactNode, isAuthPage: boolean }) {
  const { token, isLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token && !isAuthPage) {
      window.location.href = '/login';
    }
  }, [isLoading, token, isAuthPage]);

  if (isLoading && !isAuthPage) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-wine"></div>
      </div>
    );
  }

  if (!token && !isAuthPage) {
    return null;
  }

  return <>{children}</>;
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname?.startsWith("/login/") || false;
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Automatically collapse sidebar on tablet and iPad screens (< 1280px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1280) {
        setIsCollapsed(true);
      } else if (window.innerWidth >= 1280) {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <AuthProvider>
        <AuthGuard isAuthPage={isAuthPage}>
          {isAuthPage ? (
            <div className="flex-1 overflow-y-auto w-full">
              {children}
            </div>
          ) : (
            <div className="flex h-screen w-full overflow-hidden bg-[var(--bg)]">
              <Sidebar 
                isCollapsed={isCollapsed} 
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                isMobileOpen={isMobileOpen}
                onCloseMobile={() => setIsMobileOpen(false)}
              />

              <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-4 md:px-6 lg:px-8 z-10 shadow-xs">
                  <div className="flex items-center gap-3">
                    {/* Mobile Hamburger Toggle */}
                    <button
                      onClick={() => setIsMobileOpen(!isMobileOpen)}
                      className="md:hidden p-2 rounded-lg text-gray-600 hover:text-wine hover:bg-gray-100 transition-colors"
                      title="Toggle Menu"
                    >
                      <Menu size={20} />
                    </button>

                    {/* Tablet/Desktop Sidebar Expand/Collapse Toggle Button */}
                    <button
                      onClick={() => setIsCollapsed(!isCollapsed)}
                      className="hidden md:flex p-2 rounded-lg text-gray-600 hover:text-wine hover:bg-gray-100 transition-colors"
                      title={isCollapsed ? "Expand Navigation" : "Collapse Navigation"}
                    >
                      {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    </button>

                    <h1 className="text-xs md:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] md:tracking-[0.2em] truncate">
                      System Overview
                    </h1>
                  </div>

                  <div className="flex items-center gap-3">
                    <a 
                      href="https://raaghas.in" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-wine text-ivory px-4 md:px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-wine-dark hover:shadow-lg hover:shadow-wine/20 transition-all active:scale-95 whitespace-nowrap"
                    >
                      View Live Store
                    </a>
                  </div>
                </header>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar bg-[var(--bg)]">
                  {children}
                </div>

                <FloatingActionButton />
              </main>
            </div>
          )}
        </AuthGuard>
      </AuthProvider>
    </>
  );
}

