import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { unlinkSync, renameSync } from 'fs';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join, extname } from 'path';
import { exportVideo } from './export.js';
import { uploadToR2, getDownloadUrl, deleteFromR2 } from './r2.js';
import type { ExportRequest } from './types.js';

const app = express();
const upload = multer({
  dest: join(tmpdir(), 'swimlaprec-uploads'),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

app.use(cors({ origin: process.env.ALLOWED_ORIGIN ?? '*' }));
app.use(express.json());

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

// Export endpoint - streams progress as newline-delimited JSON
app.post('/api/export', upload.single('video'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: '動画ファイルが必要です' });
    return;
  }

  // Rename uploaded file with original extension so ffprobe can detect format
  const ext = extname(req.file.originalname) || '.mp4';
  const videoPath = req.file.path + ext;
  renameSync(req.file.path, videoPath);
  const outputPath = join(tmpdir(), `swimlaprec-${randomUUID()}.mp4`);

  let data: ExportRequest;
  try {
    data = JSON.parse(req.body.data);
  } catch {
    cleanup(videoPath);
    res.status(400).json({ error: 'リクエストデータが不正です' });
    return;
  }

  // Stream progress using SSE-like format to prevent Cloud Run buffering
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx/proxy buffering
  res.flushHeaders();

  const sendProgress = (progress: number, status: string) => {
    res.write(`data: ${JSON.stringify({ progress, status })}\n\n`);
  };

  console.log('Export request:', {
    videoPath,
    originalName: req.file.originalname,
    size: req.file.size,
    metaInfo: data.metaInfo,
    startTime: data.startTime,
    lapCount: data.laps.length,
  });

  try {
    await exportVideo({
      videoPath,
      metaInfo: data.metaInfo,
      startTime: data.startTime,
      laps: data.laps,
      outputPath,
      onProgress: sendProgress,
    });

    // Upload to R2
    sendProgress(95, 'アップロード中...');
    const key = `exports/${randomUUID()}.mp4`;
    await uploadToR2(outputPath, key);

    const url = await getDownloadUrl(key);
    sendProgress(100, '完了!');
    res.write(`data: ${JSON.stringify({ progress: 100, status: '完了!', url })}\n\n`);
    res.end();

    // Schedule R2 cleanup after 1 hour
    setTimeout(() => deleteFromR2(key), 60 * 60 * 1000);
  } catch (err) {
    console.error('Export failed:', err);
    sendProgress(-1, 'エクスポートに失敗しました');
    res.end();
  } finally {
    cleanup(videoPath);
    cleanup(outputPath);
  }
});

function cleanup(path: string): void {
  try { unlinkSync(path); } catch { /* */ }
}

const PORT = parseInt(process.env.PORT ?? '8080', 10);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
