export type SegmentType = 'dolphin' | 'stroke';

export interface LapMark {
  id: string;
  /** Absolute time in the video (seconds) */
  videoTime: number;
  /** Time relative to start mark (seconds) */
  relativeTime: number;
  /** Lap split time (time since previous lap) */
  lapTime: number;
  /** Lap number */
  lapNumber: number;
  /** Whether this is the goal touch */
  isGoal: boolean;
  /** Distance marker in meters (e.g. 15, 25, 50) */
  distanceMarker: number;
  /** Segment type */
  segmentType: SegmentType;
  /** Stroke count (only for stroke segments) */
  strokeCount?: number;
}

export interface SegmentStats {
  distance: number;
  time: number;
  velocity: number;
  dps?: number;
  strokeRate?: number;
}

export interface PendingLap {
  videoTime: number;
  isGoal: boolean;
}

export interface MetaInfo {
  eventName: string;
  distance: string;
  stroke: string;
  swimmerName: string;
  date: string;
}

export interface AppState {
  videoFile: File | null;
  videoUrl: string | null;
  metaInfo: MetaInfo;
  startTime: number | null;
  laps: LapMark[];
}
