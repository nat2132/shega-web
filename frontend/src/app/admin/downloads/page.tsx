"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, ExternalLink, Copy, Check } from "lucide-react";
import api from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { PaginatedResponse } from "@/lib/types";

interface AppVersion {
  id: number;
  platform: string;
  version: string;
  min_version: string;
  is_force_update: boolean;
  release_notes: string;
  download_url: string;
  created_at: string;
}

export default function DownloadsPage() {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function load() {
    try {
      const { data } = await api.get<PaginatedResponse<AppVersion>>("/admin/app-versions/", { params: { page_size: 100 } });
      setVersions(data.results ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function copy(url: string, id: number) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Downloads</h1>
        <p className="mt-1 text-sm text-gray-500">App downloads and release links</p>
      </div>

      <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-5 py-4 text-left font-medium">Platform</th>
                <th className="px-5 py-4 text-left font-medium">Version</th>
                <th className="px-5 py-4 text-left font-medium">Min Version</th>
                <th className="px-5 py-4 text-left font-medium">Force Update</th>
                <th className="px-5 py-4 text-left font-medium">Release Notes</th>
                <th className="px-5 py-4 text-left font-medium">Added</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
                </td></tr>
              ) : versions.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-gray-500">No app versions published.</td></tr>
              ) : (
                versions.map((v) => (
                  <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-white/[0.06] text-gray-300")}>
                        <Download className="h-3 w-3 mr-1" /> {v.platform}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-200">v{v.version}</td>
                    <td className="px-5 py-4 text-gray-400">{v.min_version || "—"}</td>
                    <td className="px-5 py-4">
                      <Badge variant={v.is_force_update ? "danger" : "default"} size="sm">{v.is_force_update ? "Yes" : "No"}</Badge>
                    </td>
                    <td className="px-5 py-4 text-gray-400 max-w-[240px] truncate">{v.release_notes || "—"}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatDate(v.created_at, { hideTime: true })}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {v.download_url && (
                          <>
                            <button onClick={() => copy(v.download_url, v.id)} title="Copy link" className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all">
                              {copiedId === v.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <a href={v.download_url} target="_blank" rel="noreferrer" title="Open link" className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}