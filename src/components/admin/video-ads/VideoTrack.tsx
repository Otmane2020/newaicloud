import { useState } from "react";
import { Film, GripVertical, Copy, Trash2, MoveHorizontal } from "lucide-react";
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
  onReorder,
  onRemove,
  onDuplicate,
  onTransitionChange,
}: VideoTrackProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  let accumulatedTime = 0;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex items-center min-h-[80px] bg-background border-b border-border">
      {/* Track Label */}
      <div className="w-12 h-20 flex flex-col items-center justify-center border-r border-border bg-muted/20 shrink-0">
        <Film className="h-4 w-4 text-blue-500" />
        <span className="text-[9px] text-muted-foreground mt-0.5">Vidéo</span>
      </div>

      {/* Track Content */}
      <div className="flex-1 h-full relative overflow-x-auto">
        <div className="flex items-center px-2 gap-1 min-h-[80px] py-2">
          {clips.map((clip, index) => {
            const clipStart = accumulatedTime;
            const clipWidth = Math.max((clip.duration / totalDuration) * 100, 10);
            accumulatedTime += clip.duration;
            
            const isSelected = selectedClipId === clip.id;
            const isPlaying = currentTime >= clipStart && currentTime < clipStart + clip.duration;
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <div key={clip.id} className="flex items-center shrink-0">
                {/* Transition selector between clips */}
                {index > 0 && (
                  <div className="flex flex-col items-center justify-center px-1 z-10 shrink-0">
                    <Select
                      value={clip.transition || "fade"}
                      onValueChange={(value) => {
                        console.log(`Transition changed for clip ${clip.id}: ${value}`);
                        onTransitionChange?.(clip.id, value);
                      }}
                    >
                      <SelectTrigger className="h-8 w-20 text-[10px] bg-muted/80 border-border/50 hover:bg-muted">
                        <SelectValue placeholder="Transition" />
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

                {/* Clip - Draggable */}
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`h-14 rounded-md overflow-hidden cursor-grab active:cursor-grabbing transition-all relative group shrink-0 ${
                    isDragging ? 'opacity-50 scale-95' : ''
                  } ${isDragOver ? 'ring-2 ring-cyan-500 ring-offset-2' : ''} ${
                    isSelected 
                      ? 'ring-2 ring-primary shadow-lg' 
                      : isPlaying 
                        ? 'ring-2 ring-blue-400' 
                        : 'hover:ring-1 hover:ring-muted-foreground/50'
                  }`}
                  style={{ 
                    width: `${Math.max(clipWidth * 3, 100)}px`,
                    background: clip.thumbnailUrl 
                      ? `linear-gradient(to right, rgba(0,0,0,0.3), rgba(0,0,0,0.1)), url(${clip.thumbnailUrl}) center/cover`
                      : 'linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.1))'
                  }}
                  onClick={() => onSelectClip(clip.id)}
                >
                  {/* Grip handle */}
                  <div className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center bg-black/40 cursor-grab">
                    <GripVertical className="h-4 w-4 text-white" />
                  </div>

                  {/* Actions: Duplicate & Delete */}
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {onDuplicate && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 bg-black/50 hover:bg-black/70"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(clip);
                        }}
                      >
                        <Copy className="h-3 w-3 text-white" />
                      </Button>
                    )}
                    {onRemove && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 bg-black/50 hover:bg-red-600/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(clip.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </Button>
                    )}
                  </div>

                  {/* Clip info */}
                  <div className="absolute bottom-1 left-6 right-1">
                    <div className="flex items-center gap-1 bg-black/60 rounded px-1 py-0.5">
                      <span className="text-[10px] text-white font-medium truncate">
                        {clip.title}
                      </span>
                    </div>
                  </div>

                  {/* Duration badge */}
                  <div className="absolute top-1 left-6 bg-black/60 rounded px-1">
                    <span className="text-[9px] text-white font-mono">
                      {Math.floor(clip.duration / 60)}:{Math.floor(clip.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  {/* Drag indicator */}
                  {isDragOver && (
                    <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                      <MoveHorizontal className="h-6 w-6 text-cyan-400" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};