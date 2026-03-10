import type { LapMark } from '../types';
import { formatTime, formatLapTime } from '../utils/timeFormat';
import { calcSegmentStats } from '../hooks/useLapRecorder';

interface Props {
  laps: LapMark[];
  currentTime: number;
  startTime: number | null;
  onRemoveLap: (id: string) => void;
}

export function LapTable({ laps, currentTime, startTime, onRemoveLap }: Props) {
  const visibleLaps = laps.filter((lap) => currentTime >= lap.videoTime);

  if (startTime === null) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
      {visibleLaps.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">
          タイムラインでラップ地点をマークしてください
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-slate-400 text-xs border-b border-slate-100">
              <th className="py-2.5 px-4 text-left font-medium">Lap</th>
              <th className="py-2.5 px-4 text-right font-medium">ラップ</th>
              <th className="py-2.5 px-4 text-right font-medium">通過</th>
              <th className="py-2.5 px-4 text-right font-medium">区間</th>
              <th className="py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {visibleLaps.map((lap, i) => {
              const lapIndex = laps.indexOf(lap);
              const stats = calcSegmentStats(laps, lapIndex);
              return (
                <tr
                  key={lap.id}
                  className={`
                    border-t border-slate-50 transition-colors
                    ${lap.isGoal ? 'bg-rose-50/60' : i % 2 === 1 ? 'bg-slate-50/40' : ''}
                  `}
                >
                  <td className={`py-3 px-4 font-semibold text-sm ${lap.isGoal ? 'text-rose-500' : 'text-slate-600'}`}>
                    {lap.isGoal ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Goal
                      </span>
                    ) : (
                      <div>
                        <div>{lap.lapNumber}</div>
                        <div className="text-[10px] font-normal text-slate-400">
                          {lap.distanceMarker}m
                          {lap.segmentType === 'dolphin' ? ' 🐬' : ' 🏊'}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono text-lg font-bold ${lap.isGoal ? 'text-rose-500' : 'text-blue-500'}`}>
                    {formatLapTime(lap.lapTime)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono text-sm ${lap.isGoal ? 'text-rose-400' : 'text-slate-400'}`}>
                    {formatTime(lap.relativeTime)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {stats && (
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-sky-600">
                          {stats.velocity.toFixed(2)} m/s
                        </div>
                        {stats.dps != null && (
                          <div className="text-[10px] text-blue-400">
                            DPS {stats.dps.toFixed(2)}m
                          </div>
                        )}
                        {stats.strokeRate != null && (
                          <div className="text-[10px] text-blue-400">
                            SR {stats.strokeRate.toFixed(2)}/s
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <button
                      onClick={() => onRemoveLap(lap.id)}
                      className="text-slate-300 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
