import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import type { LapMark, MetaInfo } from '../types';
import { OUT_W, OUT_H, calcVideoArea, seekTo, drawFrame } from './drawOverlay';

interface ExportOptions {
  videoFile: File;
  metaInfo: MetaInfo;
  startTime: number;
  laps: LapMark[];
  fps?: number;
  onProgress: (progress: number, status: string) => void;
}

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;
  ffmpeg = new FFmpeg();
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  return ffmpeg;
}

function canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve) => {
    canvas.toBlob(
      async (blob) => {
        const buf = await blob!.arrayBuffer();
        resolve(new Uint8Array(buf));
      },
      'image/jpeg',
      quality,
    );
  });
}

export async function exportVideo(options: ExportOptions): Promise<Blob> {
  const { videoFile, metaInfo, startTime, laps, onProgress } = options;
  const fps = options.fps ?? 30;

  // --- 1. Load FFmpeg & extract audio ---
  onProgress(0, 'FFmpegを読み込み中...');
  const ff = await getFFmpeg();

  onProgress(5, '音声を抽出中...');
  const videoBytes = new Uint8Array(await videoFile.arrayBuffer());
  await ff.writeFile('src_video', videoBytes);

  let hasAudio = true;
  try {
    await ff.exec([
      '-i', 'src_video',
      '-vn', '-c:a', 'aac', '-b:a', '128k',
      '-y', 'audio.m4a',
    ]);
  } catch {
    hasAudio = false;
  }
  // Free original from FFmpeg FS immediately
  try { await ff.deleteFile('src_video'); } catch { /* */ }

  // --- 2. Setup video element & canvas ---
  onProgress(8, 'フレームを生成中...');
  const video = document.createElement('video');
  const videoUrl = URL.createObjectURL(videoFile);
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('動画の読み込みに失敗'));
  });

  const duration = video.duration;
  const videoArea = calcVideoArea(video.videoWidth, video.videoHeight, laps.length);

  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d')!;

  // --- 3. Frame-by-frame render → JPEG → FFmpeg FS ---
  const totalFrames = Math.ceil(duration * fps);

  for (let i = 0; i < totalFrames; i++) {
    const t = Math.min(i / fps, duration);

    await seekTo(video, t);
    drawFrame(ctx, video, videoArea, metaInfo, startTime, laps, t);

    const jpegBytes = await canvasToJpegBytes(canvas, 0.75);
    await ff.writeFile(`f${String(i).padStart(6, '0')}.jpg`, jpegBytes);

    // Update progress every ~1 second of video
    if (i % fps === 0) {
      const prog = 10 + (i / totalFrames) * 60;
      onProgress(prog, `フレーム生成中... ${Math.round((i / totalFrames) * 100)}%`);
    }
  }

  URL.revokeObjectURL(videoUrl);

  // --- 4. Encode image sequence + audio → MP4 ---
  onProgress(72, 'MP4にエンコード中...');

  const ffArgs = [
    '-framerate', `${fps}`,
    '-i', 'f%06d.jpg',
    ...(hasAudio ? ['-i', 'audio.m4a'] : []),
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '23',
    ...(hasAudio ? ['-c:a', 'copy', '-shortest'] : []),
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-y', 'output.mp4',
  ];

  await ff.exec(ffArgs);

  // --- 5. Read result ---
  onProgress(92, 'ファイルを生成中...');
  const mp4Data = await ff.readFile('output.mp4');
  const mp4Blob = new Blob([mp4Data as BlobPart], { type: 'video/mp4' });

  // --- 6. Cleanup FFmpeg FS ---
  for (let i = 0; i < totalFrames; i++) {
    try { await ff.deleteFile(`f${String(i).padStart(6, '0')}.jpg`); } catch { /* */ }
  }
  try { await ff.deleteFile('audio.m4a'); } catch { /* */ }
  try { await ff.deleteFile('output.mp4'); } catch { /* */ }

  onProgress(100, '完了!');
  return mp4Blob;
}
