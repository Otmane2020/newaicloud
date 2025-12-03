import { useRef } from "react";

interface TimelineRulerProps {
  duration: number;
  zoom: number;
  onSeek: (time: number) => void;
}

export const TimelineRuler = ({ duration, zoom, onSeek }: TimelineRulerProps) => {
  const rulerRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeek(percentage * duration);
  };

  const markers = [];
  const interval = Math.max(5, Math.floor(30 / zoom));
  for (let i = 0; i <= duration; i += interval) {
    markers.push(i);
  }

  return (
    <div
      ref={rulerRef}
      className="h-6 bg-muted/30 border-b border-border relative cursor-pointer select-none"
      onClick={handleClick}
    >
      <div className="absolute inset-0 flex">
        {markers.map((time) => (
          <div
            key={time}
            className="absolute flex flex-col items-center"
            style={{ left: `${(time / duration) * 100}%` }}
          >
            <div className="h-2 w-px bg-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground font-mono">
              {formatTime(time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
