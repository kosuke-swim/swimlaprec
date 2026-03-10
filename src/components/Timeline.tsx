import type { LapMark } from '../types';
import { calcSegmentStats } from '../hooks/useLapRecorder';

interface Props {
  duration: number;
  currentTime: number;
  startTime: number | null;
  laps: LapMark[];
  onSeek: (time: number) => void;
}

export function Timeline({ duration, currentTime, startTime, laps, onSeek }: Props) {
  if (duration === 0) return null;

  const toPercent = (time: number) => (time / duration) * 100;

  return (
    <div className="space-y-1">
      <div className="relative w-full h-11 bg-slate-100 rounded-xl overflow-hidden touch-none">
        {/* Current time fill */}
        <div
          className="absolute top-0 bottom-0 bg-sky-50 transition-[width] duration-75"
          style={{ width: `${toPercent(currentTime)}%` }}
        />

        {/* Segment stat labels between markers */}
        {startTime !== null && laps.map((lap, i) => {
          const stats = calcSegmentStats(laps, i);
          if (!stats) return null;
          const segStart = i === 0 ? startTime : laps[i - 1].videoTime;
          const segEnd = lap.videoTime;
          const leftPct = toPercent(segStart);
          const widthPct = toPercent(segEnd) - leftPct;
          if (widthPct < 3) return null; // too narrow to show
          return (
            <div
              key={`stat-${lap.id}`}
              className="absolute top-0 bottom-0 flex items-center justify-center z-[5] pointer-events-none"
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            >
              <div className={`text-[8px] font-semibold leading-tight text-center ${
                lap.segmentType === 'dolphin' ? 'text-cyan-500' : 'text-blue-500'
              }`}>
                <div>{stats.velocity.toFixed(1)}m/s</div>
                {stats.dps != null && <div>D{stats.dps.toFixed(1)}</div>}
              </div>
            </div>
          );
        })}

        {/* Start marker */}
        {startTime !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-10"
            style={{ left: `${toPercent(startTime)}%` }}
          >
            <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-emerald-400 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded">
              S
            </div>
          </div>
        )}

        {/* Lap markers */}
        {laps.map((lap) => (
          <div
            key={lap.id}
            className={`absolute top-0 bottom-0 w-0.5 z-10 ${lap.isGoal ? 'bg-rose-400' : 'bg-amber-400'}`}
            style={{ left: `${toPercent(lap.videoTime)}%` }}
          >
            <div className={`
              absolute bottom-1 left-1/2 -translate-x-1/2 text-white text-[9px] font-bold
              w-4 h-4 flex items-center justify-center rounded
              ${lap.isGoal ? 'bg-rose-400' : 'bg-amber-400'}
            `}>
              {lap.isGoal ? 'G' : lap.lapNumber}
            </div>
          </div>
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20"
          style={{ left: `${toPercent(currentTime)}%` }}
        >
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-sm" />
        </div>

        {/* Click to seek */}
        <div
          className="absolute inset-0 z-30 cursor-pointer"
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const handleMove = (ev: PointerEvent) => {
              const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
              onSeek(x * duration);
            };
            handleMove(e.nativeEvent);
            const onUp = () => {
              window.removeEventListener('pointermove', handleMove);
              window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', handleMove);
            window.addEventListener('pointerup', onUp);
          }}
        />
      </div>
    </div>
  );
}
