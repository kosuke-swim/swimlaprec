import { useState, useCallback, useMemo } from 'react';
import { VideoUploader } from './components/VideoUploader';
import { VideoPlayer } from './components/VideoPlayer';
import { VideoControls } from './components/VideoControls';
import { Timeline } from './components/Timeline';
import { LapControls } from './components/LapControls';
import { Stopwatch } from './components/Stopwatch';
import { LapTable } from './components/LapTable';
import { MetaInfoForm } from './components/MetaInfoForm';
import { ExportButton } from './components/ExportButton';
import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useLapRecorder } from './hooks/useLapRecorder';
import type { MetaInfo } from './types';

function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const videoUrl = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : null),
    [videoFile]
  );
  const [metaInfo, setMetaInfo] = useState<MetaInfo>({
    eventName: '',
    distance: '',
    stroke: '',
    swimmerName: '',
    date: '',
  });
  const [showMeta, setShowMeta] = useState(false);

  const player = useVideoPlayer();
  const lapRecorder = useLapRecorder();

  const handleFileSelect = useCallback((file: File) => {
    setVideoFile(file);
    lapRecorder.clearAll();
  }, [lapRecorder]);

  const handleReset = useCallback(() => {
    setVideoFile(null);
    lapRecorder.clearAll();
    setMetaInfo({ eventName: '', distance: '', stroke: '', swimmerName: '', date: '' });
  }, [lapRecorder]);

  // No video loaded - show uploader
  if (!videoFile || !videoUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 flex flex-col">
        <header className="px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
              SwimLapRec
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            <VideoUploader onFileSelect={handleFileSelect} />
          </div>
        </div>
      </div>
    );
  }

  const metaLine = [metaInfo.distance, metaInfo.stroke, metaInfo.eventName].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-sky-400 text-white px-5 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
              <circle cx="12" cy="12" r="10" strokeWidth={2} />
            </svg>
          </div>
          <h1 className="text-base font-bold tracking-tight">SwimLapRec</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMeta(!showMeta)}
            className="text-xs font-medium bg-white/20 backdrop-blur hover:bg-white/30 transition-colors px-3.5 py-1.5 rounded-lg"
          >
            {showMeta ? '閉じる' : 'レース情報'}
          </button>
          <button
            onClick={handleReset}
            className="text-xs font-medium bg-white/20 backdrop-blur hover:bg-white/30 transition-colors px-3.5 py-1.5 rounded-lg"
          >
            別の動画
          </button>
        </div>
      </header>

      {/* Meta info (collapsible) */}
      {showMeta && (
        <div className="px-4 pt-4">
          <MetaInfoForm metaInfo={metaInfo} onChange={setMetaInfo} />
        </div>
      )}

      {/* Meta display bar */}
      {metaLine && (
        <div className="mx-4 mt-3 bg-slate-800 text-white text-center py-2 px-4 rounded-xl shadow-sm">
          <span className="text-sm font-semibold tracking-wide">{metaLine}</span>
          {(metaInfo.swimmerName || metaInfo.date) && (
            <span className="text-slate-400 text-sm ml-3">
              {[metaInfo.swimmerName, metaInfo.date].filter(Boolean).join('  ')}
            </span>
          )}
        </div>
      )}

      {/* Video */}
      <div className="px-4 pt-4">
        <VideoPlayer
          videoRef={player.videoRef}
          videoUrl={videoUrl}
          onLoadedMetadata={player.onLoadedMetadata}
          onEnded={player.onEnded}
        />
      </div>

      {/* Stopwatch */}
      <div className="px-4 pt-3">
        <Stopwatch currentTime={player.currentTime} startTime={lapRecorder.startTime} laps={lapRecorder.laps} />
      </div>

      {/* Lap table */}
      <div className="px-4 pt-3 pb-3">
        <LapTable
          laps={lapRecorder.laps}
          currentTime={player.currentTime}
          startTime={lapRecorder.startTime}
          onRemoveLap={lapRecorder.removeLap}
        />
      </div>

      {/* Controls section */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 px-4 py-4 space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        {/* Timeline */}
        <Timeline
          duration={player.duration}
          currentTime={player.currentTime}
          startTime={lapRecorder.startTime}
          laps={lapRecorder.laps}
          onSeek={player.seek}
        />

        {/* Video controls */}
        <VideoControls
          isPlaying={player.isPlaying}
          currentTime={player.currentTime}
          duration={player.duration}
          onTogglePlay={player.togglePlay}
          onSeek={player.seek}
          onStepFrame={player.stepFrame}
        />

        {/* Lap controls */}
        <LapControls
          startTime={lapRecorder.startTime}
          currentTime={player.currentTime}
          hasGoal={lapRecorder.laps.some((l) => l.isGoal)}
          pendingLap={lapRecorder.pendingLap}
          onSetStart={lapRecorder.setStart}
          onStartPending={lapRecorder.startPendingLap}
          onConfirmLap={lapRecorder.confirmPendingLap}
          onCancelPending={lapRecorder.cancelPendingLap}
          onClear={lapRecorder.clearAll}
        />

        {/* Export */}
        {lapRecorder.startTime !== null && lapRecorder.laps.length > 0 && (
          <ExportButton
            videoFile={videoFile}
            metaInfo={metaInfo}
            startTime={lapRecorder.startTime}
            laps={lapRecorder.laps}
          />
        )}
      </div>
    </div>
  );
}

export default App;
