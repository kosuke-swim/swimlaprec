import { spawn, execSync } from 'child_process';
import { createCanvas, createImageData } from 'canvas';
import type { LapMark, MetaInfo } from './types.js';
import { drawFrame, calcVideoArea, OUT_W, OUT_H } from './draw.js';

interface VideoInfo {
  width: number;
  height: number;
  duration: number;
}

interface ExportOptions {
  videoPath: string;
  metaInfo: MetaInfo;
  startTime: number;
  laps: LapMark[];
  outputPath: string;
  fps?: number;
  onProgress?: (progress: number, status: string) => void;
}

function getVideoInfo(videoPath: string): VideoInfo {
  const raw = execSync(
    `ffprobe -v error -print_format json -show_streams -show_format "${videoPath}"`,
    { encoding: 'utf-8', timeout: 30000 },
  );
  const info = JSON.parse(raw);
  if (!info.streams || info.streams.length === 0) {
    throw new Error(`ffprobe found no streams in ${videoPath}`);
  }
  const vs = info.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
  if (!vs) {
    throw new Error('No video stream found');
  }
  return {
    width: vs.width,
    height: vs.height,
    duration: parseFloat(info.format.duration),
  };
}

function writeToStream(stream: NodeJS.WritableStream, data: Buffer): Promise<void> {
  return new Promise((resolve) => {
    if (!stream.write(data)) {
      stream.once('drain', resolve);
    } else {
      resolve();
    }
  });
}

export async function exportVideo(options: ExportOptions): Promise<void> {
  const { videoPath, metaInfo, startTime, laps, outputPath } = options;
  const fps = options.fps ?? 30;
  const report = options.onProgress ?? (() => {});

  report(5, '動画情報を取得中...');
  const info = getVideoInfo(videoPath);
  console.log('Video info:', info);
  const videoArea = calcVideoArea(info.width, info.height, laps.length);

  // Decode at the exact size we need (skip JS-side scaling)
  const decW = videoArea.w;
  const decH = videoArea.h;

  // Main canvas (output: 720x1280)
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');

  // Source video canvas at target display size (not original size)
  const srcCanvas = createCanvas(decW, decH);
  const srcCtx = srcCanvas.getContext('2d');

  const srcFrameSize = decW * decH * 4; // RGBA
  const totalFrames = Math.ceil(info.duration * fps);

  console.log(`Decode size: ${decW}x${decH} (original: ${info.width}x${info.height}), frame size: ${srcFrameSize}, total frames: ${totalFrames}`);
  report(10, 'エクスポート開始...');

  return new Promise<void>((resolve, reject) => {
    // Decoder: original video → scaled raw RGBA frames
    const decoder = spawn('ffmpeg', [
      '-i', videoPath,
      '-vf', `scale=${decW}:${decH}`,
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-r', String(fps),
      '-v', 'error',
      '-',
    ]);

    // Encoder: processed RGBA frames + audio → MP4
    const encoder = spawn('ffmpeg', [
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', `${OUT_W}x${OUT_H}`,
      '-r', String(fps),
      '-i', 'pipe:0',
      '-i', videoPath,
      '-map', '0:v',
      '-map', '1:a?',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-shortest',
      '-v', 'error',
      '-y',
      outputPath,
    ]);

    let frameIndex = 0;
    let buffer = Buffer.alloc(0);
    let decoderErr = '';
    let encoderErr = '';
    let decoderDone = false;

    decoder.stderr.on('data', (chunk: Buffer) => { decoderErr += chunk.toString(); });
    encoder.stderr.on('data', (chunk: Buffer) => { encoderErr += chunk.toString(); });

    // Process one frame at a time, pausing decoder when needed
    async function drainBuffer(): Promise<void> {
      while (buffer.length >= srcFrameSize) {
        // Pause decoder to prevent memory buildup
        decoder.stdout.pause();

        const frameData = buffer.subarray(0, srcFrameSize);
        buffer = buffer.subarray(srcFrameSize);

        const currentTime = frameIndex / fps;

        // Draw decoded video frame onto source canvas (already at target size)
        const imgData = createImageData(
          new Uint8ClampedArray(frameData.buffer, frameData.byteOffset, frameData.byteLength),
          decW,
          decH,
        );
        srcCtx.putImageData(imgData, 0, 0);

        // Draw full composite frame
        drawFrame(ctx, srcCanvas, videoArea, metaInfo, startTime, laps, currentTime);

        // Get output pixels and send to encoder (with backpressure)
        const outData = ctx.getImageData(0, 0, OUT_W, OUT_H);
        await writeToStream(encoder.stdin!, Buffer.from(outData.data.buffer));

        frameIndex++;

        if (frameIndex % fps === 0) {
          const pct = Math.round((frameIndex / totalFrames) * 100);
          report(10 + (pct * 0.85), `処理中... ${pct}%`);
          console.log(`Frame ${frameIndex}/${totalFrames} (${pct}%)`);
        }

        // Resume decoder for next chunk
        decoder.stdout.resume();
      }

      // If decoder is done and buffer is drained, close encoder
      if (decoderDone && buffer.length < srcFrameSize) {
        encoder.stdin!.end();
      }
    }

    decoder.stdout.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      drainBuffer().catch((err) => {
        console.error('Frame processing error:', err);
        reject(err);
      });
    });

    decoder.on('close', (code) => {
      console.log(`Decoder exited with code ${code}`);
      if (decoderErr) console.error('Decoder stderr:', decoderErr.slice(-500));
      decoderDone = true;
      drainBuffer().catch(reject);
    });

    decoder.on('error', (err) => { console.error('Decoder error:', err); reject(err); });
    encoder.on('error', (err) => { console.error('Encoder error:', err); reject(err); });

    encoder.on('close', (code) => {
      console.log(`Encoder exited with code ${code}`);
      if (encoderErr) console.error('Encoder stderr:', encoderErr.slice(-500));
      if (code === 0) {
        report(98, 'ファイルを生成中...');
        resolve();
      } else {
        reject(new Error(`FFmpeg encoder exited with code ${code}. stderr: ${encoderErr.slice(-200)}`));
      }
    });
  });
}
