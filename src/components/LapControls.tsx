import { useState } from 'react';
import type { PendingLap, SegmentType } from '../types';

interface Props {
  startTime: number | null;
  currentTime: number;
  hasGoal: boolean;
  pendingLap: PendingLap | null;
  onSetStart: (time: number) => void;
  onStartPending: (time: number, isGoal?: boolean) => void;
  onConfirmLap: (distanceMarker: number, segmentType: SegmentType, strokeCount?: number) => void;
  onCancelPending: () => void;
  onClear: () => void;
}

const QUICK_DISTANCES = [15, 25, 50, 75];

export function LapControls({
  startTime, currentTime, hasGoal, pendingLap,
  onSetStart, onStartPending, onConfirmLap, onCancelPending, onClear,
}: Props) {
  const [distance, setDistance] = useState<string>('');
  const [segmentType, setSegmentType] = useState<SegmentType>('stroke');
  const [strokeCount, setStrokeCount] = useState<string>('');

  const btnBase = "py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97]";

  const handleConfirm = () => {
    const d = Number(distance);
    if (!d || d <= 0) return;
    const sc = segmentType === 'stroke' ? Number(strokeCount) || undefined : undefined;
    onConfirmLap(d, segmentType, sc);
    setDistance('');
    setSegmentType('stroke');
    setStrokeCount('');
  };

  const handleCancel = () => {
    onCancelPending();
    setDistance('');
    setSegmentType('stroke');
    setStrokeCount('');
  };

  // Pending lap inline form
  if (pendingLap) {
    return (
      <div className="space-y-3 bg-sky-50/60 rounded-xl p-4 border border-sky-200/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-sky-600">
            {pendingLap.isGoal ? 'ゴール' : 'ラップ'}データ入力
          </span>
          <button
            onClick={handleCancel}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            キャンセル
          </button>
        </div>

        {/* Distance marker */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">距離マーカー（m）</label>
          <div className="flex gap-1.5">
            {QUICK_DISTANCES.map((d) => (
              <button
                key={d}
                onClick={() => setDistance(String(d))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  distance === String(d)
                    ? 'bg-sky-500 text-white'
                    : 'bg-white text-slate-600 hover:bg-sky-100 border border-slate-200'
                }`}
              >
                {d}m
              </button>
            ))}
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="他"
              className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
        </div>

        {/* Segment type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">区間タイプ</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSegmentType('dolphin')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                segmentType === 'dolphin'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-cyan-50 border border-slate-200'
              }`}
            >
              🐬 ドルフィンキック
            </button>
            <button
              onClick={() => setSegmentType('stroke')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                segmentType === 'stroke'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200'
              }`}
            >
              🏊 ストローク
            </button>
          </div>
        </div>

        {/* Stroke count (stroke only) */}
        {segmentType === 'stroke' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">ストローク数</label>
            <input
              type="number"
              value={strokeCount}
              onChange={(e) => setStrokeCount(e.target.value)}
              placeholder="例: 12"
              min={0}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        )}

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={!distance || Number(distance) <= 0}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.97] ${
            distance && Number(distance) > 0
              ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-sm hover:shadow-md'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          確定
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {startTime === null ? (
        <button
          onClick={() => onSetStart(currentTime)}
          className={`${btnBase} flex-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-600 text-white shadow-sm`}
        >
          スタート地点を設定
        </button>
      ) : hasGoal ? (
        <>
          <div className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-sm text-center">
            計測完了
          </div>
          <button
            onClick={onClear}
            className={`${btnBase} px-5 bg-slate-200 hover:bg-slate-300 active:bg-slate-300 text-slate-600`}
          >
            リセット
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onStartPending(currentTime)}
            className={`${btnBase} flex-1 bg-amber-400 hover:bg-amber-500 active:bg-amber-500 text-white shadow-sm`}
          >
            ラップ
          </button>
          <button
            onClick={() => onStartPending(currentTime, true)}
            className={`${btnBase} flex-1 bg-rose-500 hover:bg-rose-600 active:bg-rose-600 text-white shadow-sm`}
          >
            ゴール
          </button>
          <button
            onClick={() => onSetStart(currentTime)}
            className={`${btnBase} px-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-600 text-white text-xs shadow-sm`}
            title="スタート再設定"
          >
            S再設定
          </button>
          <button
            onClick={onClear}
            className={`${btnBase} px-3 bg-slate-200 hover:bg-slate-300 active:bg-slate-300 text-slate-600 text-xs`}
          >
            リセット
          </button>
        </>
      )}
    </div>
  );
}
