import { Film, GripVertical, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoClip {
  id: string;
  title: string;
  duration: number;
  thumbnailUrl?: string;
  videoUrl: string;
}

interface VideoTrackProps {
  clips: VideoClip[];
  totalDuration: number;
  currentTime: number;
  selectedClipId: string | null;
  onSelectClip: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export const VideoTrack = ({
  clips,
  totalDuration,
  currentTime,
  selectedClipId,
  onSelectClip,
}: VideoTrackProps) => {
  let accumulatedTime = 0;

  return (
    <div className="flex items-center h-16 bg-background border-b border-border">
      {/* Track Label */}
      <div className="w-12 h-full flex flex-col items-center justify-center border-r border-border bg-muted/20 shrink-0">
        <Film className="h-4 w-4 text-blue-500" />
        <span className="text-[9px] text-muted-foreground mt-0.5">Vidéo</span>
      </div>

      {/* Track Content */}
      <div className="flex-1 h-full relative overflow-hidden">
        <div className="absolute inset-0 flex items-center px-1 gap-0.5">
          {clips.map((clip, index) => {
            const clipStart = accumulatedTime;
            const clipWidth = (clip.duration / totalDuration) * 100;
            accumulatedTime += clip.duration;
            
            const isSelected = selectedClipId === clip.id;
            const isPlaying = currentTime >= clipStart && currentTime < clipStart + clip.duration;

            return (
              <div
                key={clip.id}
                className={`h-12 rounded-md overflow-hidden cursor-pointer transition-all relative group ${
                  isSelected 
                    ? 'ring-2 ring-primary shadow-lg' 
                    : isPlaying 
                      ? 'ring-1 ring-blue-400' 
                      : 'hover:ring-1 hover:ring-muted-foreground/50'
                }`}
                style={{ 
                  width: `${clipWidth}%`,
                  minWidth: '60px',
                  background: clip.thumbnailUrl 
                    ? `linear-gradient(to right, rgba(0,0,0,0.3), rgba(0,0,0,0.1)), url(${clip.thumbnailUrl}) center/cover`
                    : 'linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.1))'
                }}
                onClick={() => onSelectClip(clip.id)}
              >
                {/* Grip handle */}
                <div className="absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                  <GripVertical className="h-3 w-3 text-white" />
                </div>

                {/* Clip info */}
                <div className="absolute inset-0 flex items-end p-1">
                  <div className="flex items-center gap-1 bg-black/60 rounded px-1 py-0.5">
                    <span className="text-[9px] text-white font-medium truncate max-w-[80px]">
                      {clip.title}
                    </span>
                  </div>
                </div>

                {/* Duration badge */}
                <div className="absolute top-1 right-1 bg-black/60 rounded px-1">
                  <span className="text-[8px] text-white font-mono">
                    {Math.floor(clip.duration / 60)}:{(clip.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Trim handles */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/80 opacity-0 group-hover:opacity-100 cursor-ew-resize" />
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary/80 opacity-0 group-hover:opacity-100 cursor-ew-resize" />

                {/* Transition indicator */}
                {index < clips.length - 1 && (
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100"
                    >
                      <Scissors className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
