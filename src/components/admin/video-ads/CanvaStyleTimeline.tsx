import { useState, useRef, useEffect } from "react";
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Maximize, Plus, Trash2, Copy, Layers, Music, Sparkles,
  ChevronLeft, ChevronRight, Grid3X3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface VideoClip {
  id: string;
  title: string;
  duration: number;
  thumbnailUrl?: string;
  videoUrl: string;
  transition?: string;
}

interface CanvaStyleTimelineProps {
  clips: VideoClip[];
  format?: "9:16" | "1:1" | "16:9";
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  onDuplicate?: (clip: VideoClip) => void;
  onTransitionChange?: (clipId: string, transition: string) => void;
}

const TRANSITIONS = [
  { id: "none", label: "Aucune" },
  { id: "fade", label: "Fondu" },
  { id: "slide", label: "Glisser" },
  { id: "zoom", label: "Zoom" },
  { id: "wipe", label: "Balayage" },
];

export const CanvaStyleTimeline = ({ 
  clips, 
  format = "9:16", 
  onReorder, 
  onRemove, 
  onDuplicate,
  onTransitionChange 
}: CanvaStyleTimelineProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [draggedClipIndex, setDraggedClipIndex] = useState<number | null>(null);

  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);
  const currentClip = clips[currentClipIndex];

  // Calculate global time
  const getGlobalTime = () => {
    let time = 0;
    for (let i = 0; i < currentClipIndex; i++) {
      time += clips[i].duration;
    }
    return time + currentTime;
  };

  const globalTime = getGlobalTime();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleEnded = () => {
      if (currentClipIndex < clips.length - 1) {
        setCurrentClipIndex(prev => prev + 1);
        setCurrentTime(0);
      } else {
        setIsPlaying(false);
        setCurrentClipIndex(0);
        setCurrentTime(0);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentClipIndex, clips.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, currentClipIndex]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleSeek = (time: number) => {
    let accumulated = 0;
    for (let i = 0; i < clips.length; i++) {
      if (time < accumulated + clips[i].duration) {
        setCurrentClipIndex(i);
        const clipTime = time - accumulated;
        setCurrentTime(clipTime);
        if (videoRef.current) videoRef.current.currentTime = clipTime;
        return;
      }
      accumulated += clips[i].duration;
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedClipIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedClipIndex !== null && draggedClipIndex !== index) {
      onReorder(draggedClipIndex, index);
      setDraggedClipIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedClipIndex(null);
  };

  const playheadPosition = totalDuration > 0 ? (globalTime / totalDuration) * 100 : 0;

  // Generate time markers
  const timeMarkers = [];
  const markerInterval = totalDuration > 60 ? 10 : 5;
  for (let i = 0; i <= totalDuration; i += markerInterval) {
    timeMarkers.push(i);
  }

  if (clips.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Empty Preview */}
        <div className="flex-1 flex items-center justify-center bg-black/90 rounded-t-lg">
          <div className="text-center text-muted-foreground">
            <Layers className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>Ajoutez des clips pour commencer</p>
          </div>
        </div>
        {/* Empty Timeline */}
        <div className="h-40 bg-[#1a1a2e] rounded-b-lg border-t border-border/30 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Timeline vide</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a] rounded-lg overflow-hidden">
      {/* Video Preview Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center min-h-[300px]">
        {/* Collapse sidebar button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full z-10"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Video Container */}
        <div className={cn(
          "relative bg-black",
          format === "9:16" && "aspect-[9/16] h-full max-h-[400px]",
          format === "1:1" && "aspect-square h-full max-h-[400px]",
          format === "16:9" && "aspect-video w-full max-w-[700px]"
        )}>
          <video
            ref={videoRef}
            src={currentClip?.videoUrl}
            className="w-full h-full object-contain"
            playsInline
          />
        </div>

        {/* Time Display */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 rounded-full px-4 py-2">
          <span className="text-white text-sm font-medium">{formatTime(globalTime)}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full bg-white text-black hover:bg-white/90"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
          <span className="text-white/60 text-sm">{formatTime(totalDuration)}</span>
        </div>

        {/* Fullscreen Button */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-3 right-3 text-white/60 hover:text-white hover:bg-white/10"
          onClick={() => videoRef.current?.requestFullscreen()}
        >
          <Maximize className="h-5 w-5" />
        </Button>
      </div>

      {/* Timeline Area */}
      <div className="bg-[#1a1a2e] border-t border-white/10">
        {/* Time Ruler */}
        <div className="h-6 bg-[#252540] border-b border-white/5 flex items-end px-2 relative overflow-hidden">
          <div className="flex-1 relative" style={{ minWidth: `${zoom * 2}%` }}>
            {timeMarkers.map((time) => (
              <div
                key={time}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${(time / totalDuration) * 100}%` }}
              >
                <span className="text-[10px] text-white/40 mb-0.5">{time}s</span>
                <div className="w-px h-2 bg-white/20" />
              </div>
            ))}
            {/* Playhead marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${playheadPosition}%` }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rounded-sm rotate-45" />
            </div>
          </div>
        </div>

        {/* Video Track */}
        <div className="flex items-center h-16 border-b border-white/5">
          <div className="w-10 h-full flex items-center justify-center border-r border-white/5">
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div 
            ref={timelineRef}
            className="flex-1 h-full flex items-center gap-0.5 px-2 overflow-x-auto"
            style={{ minWidth: `${zoom * 2}%` }}
          >
            {clips.map((clip, index) => {
              const clipWidth = (clip.duration / totalDuration) * 100;
              return (
                <div key={clip.id} className="flex items-center">
                  {/* Transition marker */}
                  {index > 0 && (
                    <button
                      className="w-4 h-12 flex items-center justify-center group relative"
                      onClick={() => {
                        const nextTransition = TRANSITIONS[(TRANSITIONS.findIndex(t => t.id === (clip.transition || "none")) + 1) % TRANSITIONS.length];
                        onTransitionChange?.(clip.id, nextTransition.id);
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-cyan-400/50 group-hover:bg-cyan-400 transition-colors">
                        <Sparkles className="w-2 h-2 text-white opacity-0 group-hover:opacity-100" />
                      </div>
                    </button>
                  )}
                  {/* Clip */}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedClipId(clip.id)}
                    className={cn(
                      "h-12 rounded cursor-pointer transition-all relative group overflow-hidden",
                      selectedClipId === clip.id 
                        ? "ring-2 ring-cyan-400" 
                        : "hover:ring-1 hover:ring-white/30",
                      draggedClipIndex === index && "opacity-50"
                    )}
                    style={{ 
                      width: `${Math.max(clipWidth, 8)}%`,
                      minWidth: '60px',
                      background: clip.thumbnailUrl 
                        ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${clip.thumbnailUrl})`
                        : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] text-white font-medium truncate px-1">
                        {clip.title}
                      </span>
                    </div>
                    {/* Action buttons on hover */}
                    <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDuplicate?.(clip); }}
                        className="p-0.5 bg-black/50 rounded hover:bg-black/70"
                      >
                        <Copy className="w-2.5 h-2.5 text-white" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(clip.id); }}
                        className="p-0.5 bg-black/50 rounded hover:bg-red-500/70"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Add clip button */}
            <button className="h-12 w-10 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 ml-1">
              <Plus className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>

        {/* Audio Track */}
        <div className="flex items-center h-12 border-b border-white/5">
          <div className="w-10 h-full flex items-center justify-center border-r border-white/5">
            <Music className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex-1 h-full flex items-center px-2">
            <button className="h-8 px-3 flex items-center gap-2 rounded bg-white/5 hover:bg-white/10 text-white/40 text-xs">
              <Plus className="w-3 h-3" />
              Ajouter audio
            </button>
          </div>
        </div>

        {/* Effects Track */}
        <div className="flex items-center h-10 border-b border-white/5">
          <div className="w-10 h-full flex items-center justify-center border-r border-white/5">
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="flex-1 h-full flex items-center px-2">
            <button className="h-6 px-3 flex items-center gap-2 rounded bg-white/5 hover:bg-white/10 text-white/40 text-xs">
              <Plus className="w-3 h-3" />
              Ajouter effet
            </button>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="h-10 flex items-center justify-between px-3 bg-[#252540]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Notes</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Zoom slider */}
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-white/40" />
              <Slider
                value={[zoom]}
                onValueChange={([v]) => setZoom(v)}
                min={50}
                max={200}
                step={10}
                className="w-24"
              />
              <span className="text-xs text-white/40 w-10">{zoom}%</span>
            </div>
            {/* Page info */}
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span>Pages</span>
              <span>{formatTime(globalTime)} / {formatTime(totalDuration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
