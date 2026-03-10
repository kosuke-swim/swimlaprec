import type { RefObject } from 'react';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  onLoadedMetadata: () => void;
  onEnded: () => void;
}

export function VideoPlayer({ videoRef, videoUrl, onLoadedMetadata, onEnded }: Props) {
  return (
    <div className="w-full bg-slate-900 rounded-xl overflow-hidden shadow-sm">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full"
        playsInline
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />
    </div>
  );
}
