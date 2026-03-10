export function formatTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const wholeSecs = Math.floor(secs);
  const centis = Math.round((secs - wholeSecs) * 100);
  return `${mins.toString().padStart(2, '0')}:${wholeSecs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}

export function formatLapTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const wholeSecs = Math.floor(seconds);
  const centis = Math.round((seconds - wholeSecs) * 100);
  return `${wholeSecs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}
