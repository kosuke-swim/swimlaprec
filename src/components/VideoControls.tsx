import { formatTime } from '../utils/timeFormat';

interface Props {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onStepFrame: (direction: 1 | -1) => void;
}

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  onStepFrame,
}: Props) {
  return (
    <div className="space-y-2">
      {/* Seek bar */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.001}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="w-full h-1.5"
      />

      <div className="flex items-center justify-between">
        {/* Time display */}
        <span className="text-xs text-slate-400 font-mono tabular-nums min-w-[100px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onStepFrame(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-500 transition-colors"
            title="1フレーム戻る"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={onTogglePlay}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 hover:from-blue-600 hover:to-sky-500 active:from-blue-600 active:to-sky-500 text-white shadow-sm transition-all"
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => onStepFrame(1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-500 transition-colors"
            title="1フレーム進む"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Spacer */}
        <span className="min-w-[100px]" />
      </div>
    </div>
  );
}
