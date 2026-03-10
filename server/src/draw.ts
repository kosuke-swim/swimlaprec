import { type Canvas, type CanvasRenderingContext2D } from 'canvas';
import type { LapMark, MetaInfo } from './types.js';
import { formatTime, formatLapTime } from './timeFormat.js';

// Output: 720 x 1280 (9:16 portrait)
export const OUT_W = 720;
export const OUT_H = 1280;
export const HEADER_H = 80;
const STOPWATCH_H = 88;
const LAP_HEADER_H = 32;
const LAP_ROW_H = 38;
const PADDING = 18;
const CARD_RADIUS = 16;

const COLOR = {
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
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  blue500: '#3b82f6',
  rose400: '#fb7185',
  rose500: '#f43f5e',
  rose50: '#fff1f2',
};

function grad(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  from: string, to: string,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  return g;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.fillStyle = COLOR.white;
  rr(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = COLOR.slate200;
  ctx.lineWidth = 1;
  rr(ctx, x, y, w, h, r);
  ctx.stroke();
}

export function calcVideoArea(
  srcW: number, srcH: number, lapCount: number,
): { x: number; y: number; w: number; h: number } {
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

const FONT = '"Noto Sans CJK JP", "Noto Sans JP", sans-serif';
const MONO = '"Noto Sans Mono CJK JP", monospace';

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  videoSource: Canvas,
  videoArea: { x: number; y: number; w: number; h: number },
  metaInfo: MetaInfo,
  startTime: number,
  laps: LapMark[],
  currentTime: number,
): void {
  // --- Background ---
  ctx.fillStyle = COLOR.bgBase;
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  // --- Header ---
  ctx.fillStyle = grad(ctx, 0, 0, OUT_W, 0, COLOR.headerFrom, COLOR.headerTo);
  ctx.fillRect(0, 0, OUT_W, HEADER_H);

  const logoSize = 24;
  const logoX = PADDING + 2;
  const logoY = 13;
  ctx.fillStyle = COLOR.whiteAlpha20;
  rr(ctx, logoX, logoY, logoSize, logoSize, 7);
  ctx.fill();

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

  ctx.fillStyle = COLOR.white;
  ctx.font = `bold 18px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('SwimLapRec', logoX + logoSize + 8, logoY + 17);

  const metaLine = [metaInfo.distance, metaInfo.stroke, metaInfo.eventName].filter(Boolean).join(' ');
  if (metaLine) {
    ctx.fillStyle = COLOR.white;
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(metaLine, PADDING + 2, HEADER_H - 24);
  }
  const subLine = [metaInfo.swimmerName, metaInfo.date].filter(Boolean).join('   ');
  if (subLine) {
    ctx.fillStyle = COLOR.whiteAlpha60;
    ctx.font = `16px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(subLine, PADDING + 2, HEADER_H - 7);
  }

  // --- Video (source is already at target size) ---
  drawCard(ctx, videoArea.x - 1, videoArea.y - 1, videoArea.w + 2, videoArea.h + 2, CARD_RADIUS);
  ctx.save();
  rr(ctx, videoArea.x, videoArea.y, videoArea.w, videoArea.h, CARD_RADIUS);
  ctx.clip();
  ctx.drawImage(videoSource, 0, 0, videoArea.w, videoArea.h, videoArea.x, videoArea.y, videoArea.w, videoArea.h);
  ctx.restore();

  // --- Stopwatch ---
  const swY = videoArea.y + videoArea.h + PADDING;
  const swX = PADDING;
  const swW = OUT_W - PADDING * 2;

  const goalLap = laps.find((l) => l.isGoal);
  const stopAt = goalLap ? goalLap.videoTime : null;
  const effectiveTime = stopAt !== null && currentTime >= stopAt ? stopAt : currentTime;
  const elapsed = Math.max(0, effectiveTime - startTime);
  const stopped = stopAt !== null && currentTime >= stopAt;

  if (stopped) {
    ctx.fillStyle = grad(ctx, swX, swY, swX + swW, swY, '#dc2626', '#e11d48');
  } else {
    ctx.fillStyle = grad(ctx, swX, swY, swX + swW, swY, COLOR.slate800, COLOR.slate700);
  }
  rr(ctx, swX, swY, swW, STOPWATCH_H, CARD_RADIUS);
  ctx.fill();

  ctx.fillStyle = COLOR.white;
  ctx.font = `bold 48px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(formatTime(elapsed), OUT_W / 2, swY + STOPWATCH_H * 0.6);

  if (stopped) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText('FINISH', OUT_W / 2, swY + STOPWATCH_H * 0.87);
  }

  // --- Lap table ---
  const tableY = swY + STOPWATCH_H + PADDING;
  const tableX = PADDING;
  const tableW = OUT_W - PADDING * 2;
  const tableH = LAP_HEADER_H + laps.length * LAP_ROW_H;

  drawCard(ctx, tableX, tableY, tableW, tableH, CARD_RADIUS);
  ctx.save();
  rr(ctx, tableX, tableY, tableW, tableH, CARD_RADIUS);
  ctx.clip();

  ctx.fillStyle = COLOR.slate400;
  ctx.font = `500 14px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('Lap', tableX + 18, tableY + 22);
  ctx.textAlign = 'right';
  ctx.fillText('ラップ', tableX + tableW * 0.52, tableY + 22);
  ctx.fillText('通過', tableX + tableW - 18, tableY + 22);

  ctx.strokeStyle = COLOR.slate200;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tableX, tableY + LAP_HEADER_H);
  ctx.lineTo(tableX + tableW, tableY + LAP_HEADER_H);
  ctx.stroke();

  laps.forEach((lap, i) => {
    const rowY = tableY + LAP_HEADER_H + i * LAP_ROW_H;
    const reached = currentTime >= lap.videoTime;

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
        ctx.font = `bold 16px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText('Goal', tableX + 28, rowY + LAP_ROW_H * 0.62);
      } else {
        ctx.fillStyle = COLOR.slate600;
        ctx.font = `600 16px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText(`${lap.lapNumber}`, tableX + 18, rowY + LAP_ROW_H * 0.62);
      }

      ctx.fillStyle = lap.isGoal ? COLOR.rose500 : COLOR.blue500;
      ctx.font = `bold 20px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.fillText(formatLapTime(lap.lapTime), tableX + tableW * 0.52, rowY + LAP_ROW_H * 0.65);

      ctx.fillStyle = lap.isGoal ? COLOR.rose400 : COLOR.slate400;
      ctx.font = `16px ${MONO}`;
      ctx.fillText(formatTime(lap.relativeTime), tableX + tableW - 18, rowY + LAP_ROW_H * 0.65);
    } else {
      ctx.fillStyle = COLOR.slate300;
      ctx.font = `600 16px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(lap.isGoal ? 'Goal' : `${lap.lapNumber}`, tableX + 18, rowY + LAP_ROW_H * 0.62);

      ctx.fillStyle = COLOR.slate300;
      ctx.font = `20px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.fillText('--.--.--', tableX + tableW * 0.52, rowY + LAP_ROW_H * 0.65);
      ctx.font = `16px ${MONO}`;
      ctx.fillText('--:--.--', tableX + tableW - 18, rowY + LAP_ROW_H * 0.65);
    }
  });

  ctx.restore();
}
