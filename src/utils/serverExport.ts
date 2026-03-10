import type { LapMark, MetaInfo } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

interface ServerExportOptions {
  videoFile: File;
  metaInfo: MetaInfo;
  startTime: number;
  laps: LapMark[];
  onProgress: (progress: number, status: string) => void;
}

export function isServerExportAvailable(): boolean {
  return API_URL !== '';
}

export async function serverExport(options: ServerExportOptions): Promise<string> {
  const { videoFile, metaInfo, startTime, laps, onProgress } = options;

  onProgress(5, 'アップロード中...');

  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('data', JSON.stringify({ metaInfo, startTime, laps }));

  const response = await fetch(`${API_URL}/api/export`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`サーバーエラー: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('ストリーミングレスポンスがサポートされていません');
  }

  // Stream the newline-delimited JSON response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let downloadUrl = '';

  onProgress(40, 'サーバーで処理中...');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete lines (SSE format: "data: {...}\n\n")
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // keep incomplete last line in buffer

    for (const rawLine of lines) {
      const line = rawLine.startsWith('data: ') ? rawLine.slice(6) : rawLine;
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.url) {
          downloadUrl = msg.url;
        }
        if (msg.progress !== undefined && msg.status) {
          // Map server progress (5-100) to display progress (40-100)
          const displayProgress = 40 + Math.round((msg.progress / 100) * 60);
          onProgress(Math.min(displayProgress, 100), msg.status);
        }
      } catch {
        // skip non-JSON lines
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    const line = buffer.startsWith('data: ') ? buffer.slice(6) : buffer;
    try {
      const msg = JSON.parse(line);
      if (msg.url) downloadUrl = msg.url;
    } catch {
      // skip
    }
  }

  if (!downloadUrl) {
    throw new Error('ダウンロードURLが取得できませんでした');
  }

  onProgress(100, '完了!');
  return downloadUrl;
}
