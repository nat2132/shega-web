'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Package,
  Calendar,
  HardDrive,
  Monitor,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Apple,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface VersionInfo {
  version: string;
  release_date: string;
  file_size: string;
  download_url: string;
  release_notes: string[];
  system_requirements: string[];
}

interface VersionHistory {
  version: string;
  release_date: string;
  file_size: string;
  highlights: string[];
}

export default function DownloadPage() {
  const [latest, setLatest] = useState<VersionInfo | null>(null);
  const [history, setHistory] = useState<VersionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const api = (await import('@/lib/api')).default;
        const { data } = await api.get('/customers/download/');
        setLatest(data.latest ?? null);
        setHistory(data.history ?? []);
      } catch {
        setLatest({
          version: '2.1.0',
          release_date: '2026-05-15',
          file_size: '85.4 MB',
          download_url: '#',
          release_notes: [
            'Improved license activation reliability',
            'Added offline mode support',
            'Enhanced security protocols',
            'Performance optimizations for large datasets',
            'Bug fixes and stability improvements',
          ],
          system_requirements: [
            'Windows 10/11 (64-bit)',
            'Intel Core i3 or equivalent',
            '4GB RAM minimum (8GB recommended)',
            '500MB free disk space',
            'Internet connection for activation',
          ],
        });
        setHistory([
          { version: '2.0.0', release_date: '2026-03-01', file_size: '82.1 MB', highlights: ['Major UI overhaul', 'New reporting module'] },
          { version: '1.9.5', release_date: '2026-01-10', file_size: '78.6 MB', highlights: ['Security patches', 'Performance fixes'] },
          { version: '1.9.0', release_date: '2025-11-20', file_size: '76.2 MB', highlights: ['API integration features', 'New export options'] },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-white">Download Center</h2>
        <p className="text-gray-400 mt-1">Download the latest Shega software for your platform.</p>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 w-full rounded bg-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <Package className="h-7 w-7 text-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Shega Desktop v{latest?.version}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {latest?.release_date ? formatDate(latest.release_date) : '-'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <HardDrive className="h-3.5 w-3.5" />
                      {latest?.file_size}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 w-full lg:w-auto">
                <Button variant="primary" size="lg" icon={Download} className="flex-1 lg:flex-initial justify-center">
                  Download for Windows
                </Button>
                <Button variant="secondary" size="lg" icon={Apple} className="flex-1 lg:flex-initial justify-center">
                  macOS
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="glass-card rounded-xl p-6"
            >
              <button
                onClick={() => setShowReleaseNotes(!showReleaseNotes)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Release Notes</h3>
                {showReleaseNotes ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {showReleaseNotes && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-2 overflow-hidden"
                >
                  {latest?.release_notes.map((note, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-300">{note}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="glass-card rounded-xl p-6"
            >
              <button
                onClick={() => setShowRequirements(!showRequirements)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">System Requirements</h3>
                {showRequirements ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {showRequirements && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-3 overflow-hidden"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
                    <Monitor className="h-4 w-4 text-foreground" />
                    <span className="text-sm font-medium text-gray-300">Windows</span>
                  </div>
                  <ul className="space-y-2">
                    {latest?.system_requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-500 mt-1.5 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Version History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left text-gray-500 font-medium py-2 pr-4">Version</th>
                    <th className="text-left text-gray-500 font-medium py-2 pr-4">Release Date</th>
                    <th className="text-left text-gray-500 font-medium py-2 pr-4">File Size</th>
                    <th className="text-left text-gray-500 font-medium py-2">Highlights</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((v, i) => (
                    <tr key={v.version} className="border-b border-[var(--color-border)] last:border-b-0">
                      <td className="py-3 pr-4">
                        <code className="text-sm font-medium text-foreground">v{v.version}</code>
                      </td>
                      <td className="py-3 pr-4 text-gray-300">{formatDate(v.release_date)}</td>
                      <td className="py-3 pr-4 text-gray-400">{v.file_size}</td>
                      <td className="py-3 text-gray-400">
                        <div className="flex flex-wrap gap-1">
                          {v.highlights.map((h) => (
                            <span key={h} className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-gray-400">
                              {h}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
