import { Film, GripVertical, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VideoClip {
  id: string;
  title: string;
  duration: number;
  thumbnailUrl?: string;
  videoUrl: string;
  transition?: string;
}

interface VideoTrackProps {
  clips: VideoClip[];
  totalDuration: number;
  currentTime: number;
  selectedClipId: string | null;
  onSelectClip: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove?: (id: string) => void;
  onDuplicate?: (clip: VideoClip) => void;
  onTransitionChange?: (clipId: string, transition: string) => void;
}

const TRANSITIONS = [
  { id: "none", label: "Aucune", icon: "—" },
  { id: "fade", label: "Fondu", icon: "◐" },
  { id: "slide-left", label: "← Glisser", icon: "←" },
  { id: "slide-right", label: "Glisser →", icon: "→" },
  { id: "zoom", label: "Zoom", icon: "⊕" },
  { id: "wipe", label: "Balayage", icon: "▬" },
  { id: "dissolve", label: "Dissolution", icon: "◑" },
];

export const VideoTrack = ({
  clips,
  totalDuration,
  currentTime,
  selectedClipId,
  onSelectClip,
  onRemove,
  onDuplicate,
  onTransitionChange,
}: VideoTrackProps) => {
  let accumulatedTime = 0;

  return (
    <div className="flex items-center min-h-[64px] bg-background border-b border-border">
      {/* Track Label */}
      <div className="w-12 h-16 flex flex-col items-center justify-center border-r border-border bg-muted/20 shrink-0">
        <Film className="h-4 w-4 text-blue-500" />
        <span className="text-[9px] text-muted-foreground mt-0.5">Vidéo</span>
      </div>

      {/* Track Content */}
      <div className="flex-1 h-full relative overflow-x-auto">
        <div className="flex items-center px-1 gap-0 min-h-[64px] py-1">
          {clips.map((clip, index) => {
            const clipStart = accumulatedTime;
            const clipWidth = Math.max((clip.duration / totalDuration) * 100, 8);
            accumulatedTime += clip.duration;
            
            const isSelected = selectedClipId === clip.id;
            const isPlaying = currentTime >= clipStart && currentTime < clipStart + clip.duration;

            return (
              <div key={clip.id} className="flex items-center">
                {/* Transition selector between clips */}
                {index > 0 && (
                  <div className="flex flex-col items-center justify-center px-1 z-10">
                    <Select
                      value={clip.transition || "fade"}
                      onValueChange={(value) => onTransitionChange?.(clip.id, value)}
                    >
                      <SelectTrigger className="h-7 w-16 text-[10px] bg-muted/80 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSITIONS.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            <span className="flex items-center gap-1">
                              <span>{t.icon}</span>
                              <span>{t.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Clip */}
                <div
                  className={`h-12 rounded-md overflow-hidden cursor-pointer transition-all relative group ${
                    isSelected 
                      ? 'ring-2 ring-primary shadow-lg' 
                      : isPlaying 
                        ? 'ring-1 ring-blue-400' 
                        : 'hover:ring-1 hover:ring-muted-foreground/50'
                  }`}
                  style={{ 
                    width: `${clipWidth}%`,
                    minWidth: '70px',
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

                  {/* Actions: Duplicate & Delete */}
                  <div className="absolute top-1 left-5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {onDuplicate && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 bg-black/50 hover:bg-black/70"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(clip);
                        }}
                      >
                        <Copy className="h-2.5 w-2.5 text-white" />
                      </Button>
                    )}
                    {onRemove && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 bg-black/50 hover:bg-red-600/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(clip.id);
                        }}
                      >
                        <Trash2 className="h-2.5 w-2.5 text-white" />
                      </Button>
                    )}
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};