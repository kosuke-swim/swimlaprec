import { useState } from 'react';
import type { LapMark, MetaInfo } from '../types';
import { exportVideo } from '../utils/ffmpegExport';
import { serverExport, isServerExportAvailable } from '../utils/serverExport';

interface Props {
  videoFile: File;
  metaInfo: MetaInfo;
  startTime: number;
  laps: LapMark[];
}

export function ExportButton({ videoFile, metaInfo, startTime, laps }: Props) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const useServer = isServerExportAvailable();

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);
    setStatus('');

    try {
      if (useServer) {
        // Server-side export (fast)
        const url = await serverExport({
          videoFile,
          metaInfo,
          startTime,
          laps,
          onProgress: (p, s) => {
            setProgress(p);
            setStatus(s);
          },
        });

        // Download from R2 URL via fetch (cross-origin needs blob conversion)
        setStatus('ダウンロード中...');
        const dlRes = await fetch(url);
        const blob = await dlRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `swimlap_${metaInfo.swimmerName || 'export'}.mp4`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      } else {
        // Client-side export (fallback)
        const blob = await exportVideo({
          videoFile,
          metaInfo,
          startTime,
          laps,
          onProgress: (p, s) => {
            setProgress(p);
            setStatus(s);
          },
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `swimlap_${metaInfo.swimmerName || 'export'}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      setStatus('エクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleExport}
        disabled={exporting}
        className={`
          w-full py-3.5 rounded-xl font-bold text-sm transition-all
          ${exporting
            ? 'bg-slate-200 text-slate-400 cursor-wait'
            : 'bg-gradient-to-r from-blue-500 to-sky-400 hover:from-blue-600 hover:to-sky-500 text-white shadow-sm active:scale-[0.98]'
          }
        `}
      >
        {exporting ? (
          <span className="inline-flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            処理中...
          </span>
        ) : (
          `動画をエクスポート${useServer ? '' : '（端末処理）'}`
        )}
      </button>

      {exporting && (
        <div className="space-y-2">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-sky-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, progress)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 text-center">{status}</p>
        </div>
      )}
    </div>
  );
}
