import { formatTime } from '../utils/timeFormat';
import type { LapMark } from '../types';

interface Props {
  currentTime: number;
  startTime: number | null;
  laps: LapMark[];
}

export function Stopwatch({ currentTime, startTime, laps }: Props) {
  const goalLap = laps.find((l) => l.isGoal);
  const stopAt = goalLap ? goalLap.videoTime : null;
  const effectiveTime = stopAt !== null && currentTime >= stopAt ? stopAt : currentTime;
  const elapsed = startTime !== null ? Math.max(0, effectiveTime - startTime) : 0;
  const stopped = stopAt !== null && currentTime >= stopAt;

  return (
    <div className={`
      py-4 px-5 rounded-xl text-center shadow-sm transition-colors duration-300
      ${stopped
        ? 'bg-gradient-to-r from-red-600 to-rose-500'
        : 'bg-gradient-to-r from-slate-800 to-slate-700'
      }
    `}>
      <span className="font-mono text-4xl font-bold tracking-wider text-white">
        {formatTime(elapsed)}
      </span>
      {startTime === null && (
        <p className="text-slate-400 text-xs mt-1">スタート地点を設定してください</p>
      )}
      {stopped && (
        <p className="text-red-200 text-xs mt-1 font-medium">FINISH</p>
      )}
    </div>
  );
}
