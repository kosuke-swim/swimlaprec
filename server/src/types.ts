export interface LapMark {
  id: string;
  videoTime: number;
  relativeTime: number;
  lapTime: number;
  lapNumber: number;
  isGoal: boolean;
}

export interface MetaInfo {
  eventName: string;
  distance: string;
  stroke: string;
  swimmerName: string;
  date: string;
}

export interface ExportRequest {
  metaInfo: MetaInfo;
  startTime: number;
  laps: LapMark[];
}
