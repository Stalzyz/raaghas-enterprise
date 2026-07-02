"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { Package, Sparkles, CheckCircle2, RotateCw, AlertTriangle, DownloadCloud, Image as ImageIcon, Database } from "lucide-react";



interface MigrationStatus {
  isRunning: boolean;
  totalProducts: number;
  processedCount: number;
  successCount: number;
  skipCount: number;
  errorCount: number;
  currentProduct?: string;
  logs: Array<{
    type: 'info' | 'success' | 'warn' | 'error';
    message: string;
    time: string;
  }>;
}

export default function ShopifyMigrationPage() {
  const [shopUrl, setShopUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Poll migration status every 3 seconds if running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status?.isRunning) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/products/migration/status`, {
            credentials: 'include'
          });
          if (res.ok) {
            const data = await res.json();
            setStatus(data);
          }
        } catch (e) {
          console.error("Failed to poll status", e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [status?.isRunning]);

  const handleStartMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopUrl || !accessToken) return;
    
    setIsStarting(true);
    try {
      const res = await fetch(`${API_BASE}/products/migration/start`, {
        method: "POST",
        credentials: 'include',
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          shopUrl: shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''),
          accessToken 
        }),
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          errMsg += `: ${body.message || JSON.stringify(body)}`;
        } catch {
          errMsg += `: ${await res.text().catch(() => 'No response body')}`;
        }
        alert(`Migration failed — ${errMsg}`);
        return;
      }
      
      const initialStatus = await res.json();
      setStatus(initialStatus);
      
      // Clear form securely
      setAccessToken("");
    } catch (err: any) {
      alert(`Migration network error: ${err.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleDeepReset = async () => {
    if (!confirm("⚠️ DANGER: This will wipe ALL products, collections, and orders from the database. This action cannot be undone. Are you absolutely sure?")) {
      return;
    }
    
    setIsResetting(true);
    try {
      const res = await fetch(`${API_BASE}/products/migration/deep-reset`, {
        method: "POST",
        credentials: 'include'
      });

      if (res.ok) {
        alert("✅ Factory Reset Complete. All data has been wiped.");
        window.location.reload();
      } else {
        alert("Failed to reset database.");
      }
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const progress = status?.totalProducts ? Math.round((status.processedCount / status.totalProducts) * 100) : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <DownloadCloud className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-serif text-charcoal">Shopify Migration Engine</h1>
          <p className="text-gray-500">Mass-import 10,000+ products via Direct Admin API.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CONFIGURATION PANEL */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-wine mb-4 flex items-center gap-2">
              <Database size={18} /> Credentials
            </h2>
            
            <form onSubmit={handleStartMigration} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Shop URL</label>
                <input 
                  type="text" 
                  placeholder="e.g. my-store.myshopify.com" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none transition-all"
                  value={shopUrl}
                  onChange={(e) => setShopUrl(e.target.value)}
                  disabled={status?.isRunning}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Admin API Token</label>
                <input 
                  type="password" 
                  placeholder="shpat_..." 
                  autoComplete="current-password"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none transition-all font-mono text-sm"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  disabled={status?.isRunning}
                />
              </div>

              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100 flex gap-3">
                <Sparkles className="shrink-0 mt-0.5" size={16} />
                <p>Images will be <b>physically downloaded</b> to the server. Existing SKUs will be <b>skipped</b> safely.</p>
              </div>

              <button 
                type="submit"
                disabled={isStarting || status?.isRunning || !shopUrl || !accessToken}
                className="w-full py-3 bg-wine hover:bg-wine-dark text-white font-bold rounded-xl shadow-lg shadow-wine/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {status?.isRunning ? (
                  <><RotateCw className="animate-spin" size={18} /> Migrating...</>
                ) : (
                  <><DownloadCloud size={18} /> Start Mass Import</>
                )}
              </button>
            </form>
          </div>

          {/* DANGER ZONE */}
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
            <h2 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} /> Danger Zone
            </h2>
            <p className="text-xs text-red-600 mb-6 font-medium">
              Wipe all existing products, variants, and orders to start with a completely fresh database.
            </p>
            <button 
              onClick={handleDeepReset}
              disabled={isResetting || status?.isRunning}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isResetting ? <RotateCw className="animate-spin" size={18} /> : <AlertTriangle size={18} />}
              Nuclear Factory Reset
            </button>
          </div>
        </div>

        {/* PROGRESS AND LOGS PANEL */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col">
            <h2 className="text-lg font-bold text-wine mb-6 flex items-center gap-2">
              <RotateCw size={18} className={status?.isRunning ? "animate-spin text-wine" : "text-gray-400"} /> 
              Execution Status
            </h2>

            {status ? (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Found</p>
                    <p className="text-2xl font-bold text-charcoal">{status.totalProducts}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Imported</p>
                    <p className="text-2xl font-bold text-green-700">{status.successCount}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Skipped</p>
                    <p className="text-2xl font-bold text-blue-700">{status.skipCount}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100 mb-0">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Errors</p>
                    <p className="text-2xl font-bold text-red-700">{status.errorCount}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-wine">Overall Progress</span>
                    <span className="text-charcoal">{progress}%</span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-wine transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {status.currentProduct && (
                    <p className="text-xs text-gray-500 italic mt-2 animate-pulse">
                      Processing: {status.currentProduct}
                    </p>
                  )}
                </div>

                <div className="flex-1 bg-gray-900 rounded-xl p-4 overflow-hidden flex flex-col mt-4 min-h-[300px]">
                  <div className="flex items-center gap-2 text-gray-400 mb-3 text-xs font-mono uppercase tracking-wider border-b border-gray-800 pb-2">
                    <CheckCircle2 size={14} /> System Output
                  </div>
                  <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1.5 custom-scrollbar">
                    {status.logs.length === 0 && (
                      <span className="text-gray-600">Waiting for engine startup...</span>
                    )}
                    {status.logs.map((log, i) => (
                      <div key={i} className={`flex gap-3 ${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'success' ? 'text-green-400' :
                        log.type === 'warn' ? 'text-yellow-400' : 'text-gray-300'
                      }`}>
                        <span className="opacity-50 shrink-0">[{log.time}]</span>
                        <span className="break-all">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-gray-200 rounded-xl">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Database className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">Engine Idle</h3>
                <p className="text-gray-500 text-sm max-w-sm">
                  Enter your Shopify credentials securely on the left to initialize the high-throughput migration engine.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
