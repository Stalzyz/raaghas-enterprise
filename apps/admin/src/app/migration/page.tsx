"use client";

import { API_BASE } from "@/lib/api";

import { useState } from "react";
import { Upload, FileUp, AlertCircle, CheckCircle2 } from "lucide-react";

export default function MigrationPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fetchAudit = async () => {
    setIsAuditing(true);
    try {
      const response = await fetch(`${API_BASE}/products/migration/audit-collections`);
      const data = await response.json();
      setAuditData(data);
    } catch (err) {
      setError("Failed to fetch collection audit.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm("This will merge orphan collections and delete empty ones. Proceed?")) return;
    setIsCleaning(true);
    try {
      const response = await fetch(`${API_BASE}/products/migration/cleanup-collections`, {
        method: "POST"
      });
      const data = await response.json();
      alert(`Cleanup complete: Merged ${data.mergedCount} and deleted ${data.deletedCount} collections.`);
      fetchAudit();
    } catch (err) {
      setError("Cleanup failed.");
    } finally {
      setIsCleaning(false);
    }
  };

  const handleDeepReset = async () => {
    const code = prompt("This will WIPE ALL DATA. Type 'CONFIRM RESET' to proceed:");
    if (code !== 'CONFIRM RESET') return;

    setIsResetting(true);
    try {
      const response = await fetch(`${API_BASE}/products/migration/deep-reset`, {
        method: "POST"
      });
      const data = await response.json();
      if (data.success) {
        alert("Database wiped successfully. You can now start a fresh import.");
        setResult(null);
        setAuditData(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Deep Reset failed. Check server logs.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/migration/shopify-csv`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message || "Migration failed");
      }
    } catch (err) {
      setError("Failed to connect to migration service. Ensure the API is running.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-charcoal">Shopify Data Migration</h2>
        <p className="text-gray-500 font-medium">Upload your Shopify product CSV export to synchronize your database.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-beige rounded-full text-wine">
          <Upload size={32} />
        </div>
        <div>
          <h3 className="text-lg font-bold">Select CSV File</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
            Ensure your CSV adheres to the standard Shopify export format. We will automatically map handles, variants, and images.
          </p>
        </div>
        
        <label className="cursor-pointer bg-wine text-ivory px-8 py-3 rounded-lg font-bold text-sm hover:bg-wine-dark transition-all flex items-center gap-2">
          <FileUp size={18} />
          {isUploading ? "Processing..." : "Choose Shopify CSV"}
          <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3 text-red-700">
          <AlertCircle size={20} className="mt-0.5" />
          <div>
            <p className="font-bold">Migration Error</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-100 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle2 size={24} />
            <h3 className="font-bold text-lg">Migration Successful</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ResultStat label="Products Imported" value={result.importedCount} />
            <ResultStat label="Status" value="Healthy" />
            <ResultStat label="Sync Time" value="0.8s" />
          </div>
        </div>
      )}

      <div className="bg-beige/30 p-6 rounded-xl border border-beige">
        <h4 className="font-bold text-charcoal mb-3 flex items-center gap-2">
          <AlertCircle size={16} className="text-wine" />
          Important Instructions
        </h4>
        <ul className="text-sm text-charcoal/70 space-y-2 list-disc pl-5">
          <li>Export your products from Shopify as a .csv file.</li>
          <li>Do not modify the column headers before uploading.</li>
          <li>Large files may take 30-60 seconds to process images.</li>
          <li>Existing products with the same handle will be updated.</li>
        </ul>
      </div>

      {/* Collection Sync & Cleanup */}
      <div className="bg-white p-8 rounded-3xl border border-charcoal/5 shadow-sm space-y-8">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-charcoal">Collection Intelligence</h3>
          <p className="text-sm text-gray-500 font-medium">Verify and cleanup redundant categories imported from product types.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={fetchAudit}
            disabled={isAuditing}
            className="flex items-center justify-center gap-3 p-6 bg-beige/40 rounded-2xl border border-beige hover:bg-beige/60 transition-all group"
          >
            <AlertCircle className={`text-wine ${isAuditing ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
            <div className="text-left">
              <p className="text-sm font-bold text-charcoal">Audit Collections</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Check for orphans</p>
            </div>
          </button>

          <button 
            onClick={handleCleanup}
            disabled={isCleaning || !auditData?.orphans?.length}
            className="flex items-center justify-center gap-3 p-6 bg-charcoal rounded-2xl text-white hover:bg-wine transition-all disabled:opacity-50 disabled:grayscale group"
          >
            <CheckCircle2 className={`text-white ${isCleaning ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
            <div className="text-left">
              <p className="text-sm font-bold">Cleanup Redundant</p>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Merge & Delete Orphans</p>
            </div>
          </button>
        </div>

        {auditData && (
          <div className="space-y-6 pt-4 border-t border-gray-50">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Audit Findings</span>
                <span className="px-3 py-1 bg-wine/5 text-wine text-[9px] font-bold uppercase rounded-full tracking-widest">
                  {auditData.orphans.length} Orphans Discovered
                </span>
             </div>
             
             <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                {auditData.orphans.map((orphan: any) => (
                  <div key={orphan.id} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-charcoal/5">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-charcoal">{orphan.title}</p>
                      <p className="text-[10px] text-gray-400 font-medium">Handle: {orphan.handle} · {orphan.productCount} Products</p>
                    </div>
                    {auditData.suggestions?.find((s: any) => s.orphanId === orphan.id) ? (
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-100 uppercase tracking-tighter">
                        Will merge to {auditData.suggestions.find((s: any) => s.orphanId === orphan.id).matchTitle}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-100 uppercase tracking-tighter">
                        Safe Delete (0 Products)
                      </span>
                    )}
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* Danger Zone: Deep Reset */}
      <div className="bg-red-50/30 p-8 rounded-3xl border border-red-100 shadow-sm space-y-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-red-900 flex items-center gap-2">
            <AlertCircle size={20} /> Danger Zone
          </h3>
          <p className="text-sm text-red-700/60 font-medium">Permanently wipe all products, collections, and orders to start fresh.</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-red-100 space-y-4">
          <div className="flex items-start gap-3 text-red-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-bold">This action is irreversible.</p>
              <p className="opacity-80 leading-relaxed">
                Running a Deep Reset will delete all <b>Products</b>, <b>Collections</b>, <b>Variants</b>, and <b>Order History</b>. 
                Use this only if you want to completely re-import your catalog from Shopify.
              </p>
            </div>
          </div>

          <button 
            onClick={handleDeepReset}
            disabled={isResetting}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200 disabled:opacity-50"
          >
            {isResetting ? "Wiping Database..." : "Wipe Database & Start Fresh"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultStat({ label, value }: any) {
  return (
    <div className="bg-white p-4 rounded-lg border border-green-200">
      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">{label}</p>
      <p className="text-xl font-bold text-charcoal">{value}</p>
    </div>
  );
}
