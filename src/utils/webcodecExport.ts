import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
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

export function isWebCodecsSupported(): boolean {
  return (
    typeof VideoEncoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined'
  );
}

export class WebCodecsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebCodecsError';
  }
}

async function probeVideoCodec(): Promise<string> {
  // Try Main profile first (better quality), fall back to Baseline
  for (const codec of ['avc1.4d0028', 'avc1.42001f']) {
    const support = await VideoEncoder.isConfigSupported({
      codec,
      width: OUT_W,
      height: OUT_H,
      bitrate: 5_000_000,
    });
    if (support.supported) return codec;
  }
  throw new WebCodecsError('H.264エンコードがサポートされていません');
}

async function probeAudioCodec(sampleRate: number, channels: number): Promise<string | null> {
  if (typeof AudioEncoder === 'undefined') return null;

  for (const codec of ['mp4a.40.2', 'opus']) {
    try {
      const support = await AudioEncoder.isConfigSupported({
        codec,
        sampleRate,
        numberOfChannels: channels,
        bitrate: 128_000,
      });
      if (support.supported) return codec;
    } catch {
      // Skip unsupported codec
    }
  }
  return null;
}

async function decodeAudio(file: File): Promise<AudioBuffer | null> {
  try {
    const audioCtx = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();
    return audioBuffer;
  } catch {
    return null;
  }
}

export async function exportVideoWebCodecs(options: ExportOptions): Promise<Blob> {
  const { videoFile, metaInfo, startTime, laps, onProgress } = options;
  const fps = options.fps ?? 30;

  // --- 1. Probe codec support ---
  onProgress(0, 'エンコーダーを確認中...');
  const videoCodec = await probeVideoCodec();

  // --- 2. Decode audio ---
  onProgress(2, '音声をデコード中...');
  const audioBuffer = await decodeAudio(videoFile);

  let audioCodecStr: string | null = null;
  let muxerAudioCodec: 'aac' | 'opus' | undefined;
  if (audioBuffer) {
    audioCodecStr = await probeAudioCodec(audioBuffer.sampleRate, audioBuffer.numberOfChannels);
    if (audioCodecStr === 'mp4a.40.2') muxerAudioCodec = 'aac';
    else if (audioCodecStr === 'opus') muxerAudioCodec = 'opus';
  }

  // --- 3. Setup video element ---
  onProgress(5, 'フレームを生成中...');
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

  // --- 4. Create muxer ---
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: OUT_W,
      height: OUT_H,
      frameRate: fps,
    },
    ...(muxerAudioCodec && audioBuffer ? {
      audio: {
        codec: muxerAudioCodec,
        numberOfChannels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
      },
    } : {}),
    fastStart: 'in-memory',
    firstTimestampBehavior: 'strict',
  });

  // --- 5. Create video encoder ---
  let videoError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta ?? undefined);
    },
    error: (e) => { videoError = e; },
  });

  videoEncoder.configure({
    codec: videoCodec,
    width: OUT_W,
    height: OUT_H,
    bitrate: 5_000_000,
    framerate: fps,
  });

  // --- 6. Frame-by-frame render + encode ---
  const totalFrames = Math.ceil(duration * fps);
  const frameDurationUs = Math.round(1_000_000 / fps);

  for (let i = 0; i < totalFrames; i++) {
    if (videoError) throw videoError;

    const t = Math.min(i / fps, duration);
    await seekTo(video, t);
    drawFrame(ctx, video, videoArea, metaInfo, startTime, laps, t);

    const frame = new VideoFrame(canvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    });
    const keyFrame = i % (fps * 2) === 0;
    videoEncoder.encode(frame, { keyFrame });
    frame.close();

    // Backpressure: wait if encoder queue is too deep
    if (videoEncoder.encodeQueueSize > 5) {
      await new Promise<void>((resolve) => {
        videoEncoder.addEventListener('dequeue', () => resolve(), { once: true });
      });
    }

    if (i % fps === 0) {
      const prog = 5 + (i / totalFrames) * 75;
      onProgress(prog, `フレーム生成中... ${Math.round((i / totalFrames) * 100)}%`);
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();
  URL.revokeObjectURL(videoUrl);

  if (videoError) throw videoError;

  // --- 7. Encode audio ---
  if (audioCodecStr && audioBuffer && muxerAudioCodec) {
    onProgress(82, '音声をエンコード中...');

    let audioError: Error | null = null;
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        muxer.addAudioChunk(chunk, meta ?? undefined);
      },
      error: (e) => { audioError = e; },
    });

    audioEncoder.configure({
      codec: audioCodecStr,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      bitrate: 128_000,
    });

    const { numberOfChannels, sampleRate, length } = audioBuffer;
    const CHUNK_SIZE = 1024;

    for (let offset = 0; offset < length; offset += CHUNK_SIZE) {
      if (audioError) throw audioError;

      const frames = Math.min(CHUNK_SIZE, length - offset);
      const chunkData = new Float32Array(numberOfChannels * frames);
      for (let ch = 0; ch < numberOfChannels; ch++) {
        const src = audioBuffer.getChannelData(ch);
        chunkData.set(src.subarray(offset, offset + frames), ch * frames);
      }

      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate,
        numberOfChannels,
        numberOfFrames: frames,
        timestamp: Math.round((offset / sampleRate) * 1_000_000),
        data: chunkData,
      });
      audioEncoder.encode(audioData);
      audioData.close();

      // Backpressure
      if (audioEncoder.encodeQueueSize > 10) {
        await new Promise<void>((resolve) => {
          audioEncoder.addEventListener('dequeue', () => resolve(), { once: true });
        });
      }
    }

    await audioEncoder.flush();
    audioEncoder.close();

    if (audioError) throw audioError;
  }

  // --- 8. Finalize ---
  onProgress(92, 'MP4を生成中...');
  muxer.finalize();

  const buffer = muxer.target.buffer;
  onProgress(100, '完了!');
  return new Blob([buffer], { type: 'video/mp4' });
}
