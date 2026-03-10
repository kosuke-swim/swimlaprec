import type { LapMark, MetaInfo } from '../types';
import { formatTime, formatLapTime } from './timeFormat';
import { calcSegmentStats } from '../hooks/useLapRecorder';

// Output: 720 x 1280 (9:16 portrait)
export const OUT_W = 720;
export const OUT_H = 1280;
export const HEADER_H = 80;
export const STOPWATCH_H = 88;
export const LAP_HEADER_H = 32;
export const LAP_ROW_H = 38;
export const PADDING = 18;
export const CARD_RADIUS = 16;

export const COLOR = {
  bgBase: '#f8fafc',
  headerFrom: '#3b82f6',
  headerTo: '#0ea5e9',
  white: '#ffffff',
  whiteAlpha60: 'rgba(255,255,255,0.6)',
  whiteAlpha20: 'rgba(255,255,255,0.2)',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  blue500: '#3b82f6',
  sky400: '#38bdf8',
  rose400: '#fb7185',
  rose500: '#f43f5e',
  rose50: '#fff1f2',
};

export function createGradient(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  from: string, to: string,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  return g;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.06)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = COLOR.white;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}

export function calcVideoArea(srcW: number, srcH: number, lapCount: number): { x: number; y: number; w: number; h: number } {
  const tableH = LAP_HEADER_H + lapCount * LAP_ROW_H + PADDING;
  const usedH = HEADER_H + PADDING + STOPWATCH_H + PADDING + tableH + PADDING * 2;
  const availW = OUT_W - PADDING * 2;
  const availH = OUT_H - usedH;
  const scale = Math.min(availW / srcW, availH / srcH);
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);
  const x = Math.round((OUT_W - w) / 2);
  return { x, y: HEADER_H + PADDING, w, h };
}

export function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener('seeked', handler);
      resolve();
    };
    video.addEventListener('seeked', handler);
    video.currentTime = time;
  });
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  videoArea: { x: number; y: number; w: number; h: number },
  metaInfo: MetaInfo,
  startTime: number,
  laps: LapMark[],
  currentTime: number,
): void {
  // --- Background ---
  ctx.fillStyle = COLOR.bgBase;
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  // --- Header (gradient) ---
  ctx.fillStyle = createGradient(ctx, 0, 0, OUT_W, 0, COLOR.headerFrom, COLOR.headerTo);
  ctx.fillRect(0, 0, OUT_W, HEADER_H);

  // App logo area
  const logoSize = 24;
  const logoX = PADDING + 2;
  const logoY = 13;
  ctx.fillStyle = COLOR.whiteAlpha20;
  roundRect(ctx, logoX, logoY, logoSize, logoSize, 7);
  ctx.fill();

  // Clock icon
  ctx.strokeStyle = COLOR.white;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(logoX + logoSize / 2, logoY + logoSize / 2 - 5);
  ctx.lineTo(logoX + logoSize / 2, logoY + logoSize / 2);
  ctx.lineTo(logoX + logoSize / 2 + 3, logoY + logoSize / 2 + 2);
  ctx.stroke();

  // App name
  ctx.fillStyle = COLOR.white;
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SwimLapRec', logoX + logoSize + 8, logoY + 17);

  // Meta info
  const metaLine = [metaInfo.distance, metaInfo.stroke, metaInfo.eventName].filter(Boolean).join(' ');
  if (metaLine) {
    ctx.fillStyle = COLOR.white;
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(metaLine, PADDING + 2, HEADER_H - 24);
  }
  const subLine = [metaInfo.swimmerName, metaInfo.date].filter(Boolean).join('   ');
  if (subLine) {
    ctx.fillStyle = COLOR.whiteAlpha60;
    ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(subLine, PADDING + 2, HEADER_H - 7);
  }

  // --- Video (rounded card with shadow) ---
  drawShadow(ctx, videoArea.x - 2, videoArea.y - 2, videoArea.w + 4, videoArea.h + 4, CARD_RADIUS);
  ctx.save();
  roundRect(ctx, videoArea.x, videoArea.y, videoArea.w, videoArea.h, CARD_RADIUS);
  ctx.clip();
  ctx.drawImage(video, videoArea.x, videoArea.y, videoArea.w, videoArea.h);
  ctx.restore();

  // --- Stopwatch (rounded card) ---
  const swY = videoArea.y + videoArea.h + PADDING;
  const swX = PADDING;
  const swW = OUT_W - PADDING * 2;

  const goalLap = laps.find((l) => l.isGoal);
  const stopAt = goalLap ? goalLap.videoTime : null;
  const effectiveTime = stopAt !== null && currentTime >= stopAt ? stopAt : currentTime;
  const elapsed = Math.max(0, effectiveTime - startTime);
  const stopped = stopAt !== null && currentTime >= stopAt;

  if (stopped) {
    ctx.fillStyle = createGradient(ctx, swX, swY, swX + swW, swY, '#dc2626', '#e11d48');
  } else {
    ctx.fillStyle = createGradient(ctx, swX, swY, swX + swW, swY, COLOR.slate800, COLOR.slate700);
  }
  roundRect(ctx, swX, swY, swW, STOPWATCH_H, CARD_RADIUS);
  ctx.fill();

  ctx.fillStyle = COLOR.white;
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(formatTime(elapsed), OUT_W / 2, swY + STOPWATCH_H * 0.6);

  if (stopped) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('FINISH', OUT_W / 2, swY + STOPWATCH_H * 0.87);
  }

  // --- Lap table (rounded card) ---
  const tableY = swY + STOPWATCH_H + PADDING;
  const tableX = PADDING;
  const tableW = OUT_W - PADDING * 2;
  const tableH = LAP_HEADER_H + laps.length * LAP_ROW_H;

  drawShadow(ctx, tableX, tableY, tableW, tableH, CARD_RADIUS);

  ctx.save();
  roundRect(ctx, tableX, tableY, tableW, tableH, CARD_RADIUS);
  ctx.clip();

  ctx.fillStyle = COLOR.white;
  ctx.fillRect(tableX, tableY, tableW, tableH);

  // Table header
  ctx.fillStyle = COLOR.slate400;
  ctx.font = '500 14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Lap', tableX + 18, tableY + 22);
  ctx.textAlign = 'right';
  ctx.fillText('ラップ', tableX + tableW * 0.38, tableY + 22);
  ctx.fillText('通過', tableX + tableW * 0.62, tableY + 22);
  ctx.fillText('区間', tableX + tableW - 18, tableY + 22);

  ctx.strokeStyle = COLOR.slate200;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tableX, tableY + LAP_HEADER_H);
  ctx.lineTo(tableX + tableW, tableY + LAP_HEADER_H);
  ctx.stroke();

  // Rows
  laps.forEach((lap, i) => {
    const rowY = tableY + LAP_HEADER_H + i * LAP_ROW_H;
    const reached = currentTime >= lap.videoTime;
    const stats = calcSegmentStats(laps, i);

    if (lap.isGoal && reached) {
      ctx.fillStyle = COLOR.rose50;
      ctx.fillRect(tableX, rowY, tableW, LAP_ROW_H);
    } else if (i % 2 === 1) {
      ctx.fillStyle = 'rgba(248,250,252,0.6)';
      ctx.fillRect(tableX, rowY, tableW, LAP_ROW_H);
    }

    if (i > 0) {
      ctx.strokeStyle = COLOR.slate100;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tableX + 14, rowY);
      ctx.lineTo(tableX + tableW - 14, rowY);
      ctx.stroke();
    }

    if (reached) {
      if (lap.isGoal) {
        ctx.fillStyle = COLOR.rose400;
        ctx.beginPath();
        ctx.arc(tableX + 18, rowY + LAP_ROW_H * 0.53, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLOR.rose500;
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Goal', tableX + 28, rowY + LAP_ROW_H * 0.62);
      } else {
        ctx.fillStyle = COLOR.slate600;
        ctx.font = '600 16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${lap.lapNumber}`, tableX + 18, rowY + LAP_ROW_H * 0.62);
      }

      ctx.fillStyle = lap.isGoal ? COLOR.rose500 : COLOR.blue500;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(formatLapTime(lap.lapTime), tableX + tableW * 0.38, rowY + LAP_ROW_H * 0.65);

      ctx.fillStyle = lap.isGoal ? COLOR.rose400 : COLOR.slate400;
      ctx.font = '14px monospace';
      ctx.fillText(formatTime(lap.relativeTime), tableX + tableW * 0.62, rowY + LAP_ROW_H * 0.65);

      // Segment stats
      if (stats) {
        ctx.fillStyle = COLOR.sky400;
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        let statText = `${stats.velocity.toFixed(2)}m/s`;
        if (stats.dps != null) {
          statText += ` D${stats.dps.toFixed(1)}`;
        }
        ctx.fillText(statText, tableX + tableW - 14, rowY + LAP_ROW_H * 0.65);
      }
    } else {
      ctx.fillStyle = COLOR.slate300;
      ctx.font = '600 16px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(lap.isGoal ? 'Goal' : `${lap.lapNumber}`, tableX + 18, rowY + LAP_ROW_H * 0.62);

      ctx.fillStyle = COLOR.slate300;
      ctx.font = '18px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('--.--.--', tableX + tableW * 0.38, rowY + LAP_ROW_H * 0.65);
      ctx.font = '14px monospace';
      ctx.fillText('--:--.--', tableX + tableW * 0.62, rowY + LAP_ROW_H * 0.65);
      ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('---', tableX + tableW - 14, rowY + LAP_ROW_H * 0.65);
    }
  });

  ctx.restore();
}
