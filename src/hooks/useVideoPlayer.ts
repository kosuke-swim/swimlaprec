import { useRef, useState, useCallback, useEffect } from 'react';

export function useVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const animFrameRef = useRef<number>(0);

  const updateTime = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
    animFrameRef.current = requestAnimationFrame(updateTime);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [updateTime]);

  const play = useCallback(() => {
    videoRef.current?.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const stepFrame = useCallback((direction: 1 | -1) => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      // Assume ~30fps, step ~1/30s
      const step = direction * (1 / 30);
      const newTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + step));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  const onLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const onEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    togglePlay,
    seek,
    stepFrame,
    onLoadedMetadata,
    onEnded,
  };
}
