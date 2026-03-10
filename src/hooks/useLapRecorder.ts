import { useState, useCallback } from 'react';
import type { LapMark, PendingLap, SegmentType, SegmentStats } from '../types';

let nextId = 1;

export function calcSegmentStats(laps: LapMark[], index: number): SegmentStats | null {
  const lap = laps[index];
  if (!lap) return null;
  const prevDistance = index > 0 ? laps[index - 1].distanceMarker : 0;
  const distance = lap.distanceMarker - prevDistance;
  const time = lap.lapTime;
  if (time <= 0 || distance <= 0) return null;
  const velocity = distance / time;
  const stats: SegmentStats = { distance, time, velocity };
  if (lap.segmentType === 'stroke' && lap.strokeCount && lap.strokeCount > 0) {
    stats.dps = distance / lap.strokeCount;
    stats.strokeRate = lap.strokeCount / time;
  }
  return stats;
}

export function useLapRecorder() {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [laps, setLaps] = useState<LapMark[]>([]);
  const [pendingLap, setPendingLap] = useState<PendingLap | null>(null);

  const setStart = useCallback((videoTime: number) => {
    setStartTime(videoTime);
    setLaps([]);
    setPendingLap(null);
  }, []);

  const startPendingLap = useCallback((videoTime: number, isGoal = false) => {
    if (startTime === null) return;
    setPendingLap({ videoTime, isGoal });
  }, [startTime]);

  const confirmPendingLap = useCallback((
    distanceMarker: number,
    segmentType: SegmentType,
    strokeCount?: number,
  ) => {
    if (startTime === null || !pendingLap) return;
    const { videoTime, isGoal } = pendingLap;
    setLaps((prev) => {
      if (prev.some((l) => l.isGoal)) return prev;
      const relativeTime = videoTime - startTime;
      const prevTime = prev.length > 0 ? prev[prev.length - 1].relativeTime : 0;
      const lapTime = relativeTime - prevTime;
      const lap: LapMark = {
        id: `lap-${nextId++}`,
        videoTime,
        relativeTime,
        lapTime,
        lapNumber: prev.length + 1,
        isGoal,
        distanceMarker,
        segmentType,
        strokeCount: segmentType === 'stroke' ? strokeCount : undefined,
      };
      return [...prev, lap];
    });
    setPendingLap(null);
  }, [startTime, pendingLap]);

  const cancelPendingLap = useCallback(() => {
    setPendingLap(null);
  }, []);

  const removeLap = useCallback((id: string) => {
    setLaps((prev) => {
      const filtered = prev.filter((l) => l.id !== id);
      return filtered.map((lap, i) => {
        const prevRelative = i > 0 ? filtered[i - 1].relativeTime : 0;
        return {
          ...lap,
          lapNumber: i + 1,
          lapTime: lap.relativeTime - prevRelative,
          isGoal: lap.isGoal,
        };
      });
    });
  }, []);

  const clearAll = useCallback(() => {
    setStartTime(null);
    setLaps([]);
    setPendingLap(null);
  }, []);

  return {
    startTime,
    laps,
    pendingLap,
    setStart,
    startPendingLap,
    confirmPendingLap,
    cancelPendingLap,
    removeLap,
    clearAll,
  };
}
