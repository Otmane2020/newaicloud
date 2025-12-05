import { useState, useRef, useEffect } from "react";
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Maximize, Plus, Trash2, Copy, Layers, Music, Sparkles, Type,
  ChevronLeft, ChevronRight, Grid3X3, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { TextOverlay } from "./TextEditor";

interface VideoClip {
  id: string;
  title: string;
  duration: number;
  thumbnailUrl?: string;
  videoUrl: string;
  transition?: string;
  speed?: number;
  volume?: number;
}

interface AudioTrack {
  id: string;
  name: string;
  duration: number;
  startTime: number;
}

interface CanvaStyleTimelineProps {
  clips: VideoClip[];
  texts?: TextOverlay[];
  audioTracks?: AudioTrack[];
  format?: "9:16" | "1:1" | "16:9";
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  onDuplicate?: (clip: VideoClip) => void;
  onTransitionChange?: (clipId: string, transition: string) => void;
  onSelectClip?: (clipId: string | null) => void;
  selectedClipId?: string | null;
  onRemoveAudio?: (id: string) => void;
  onSelectText?: (id: string | null) => void;
  selectedTextId?: string | null;
}

const TRANSITIONS = [
  { id: "none", label: "Aucune", css: "" },
  { id: "fade", label: "Fondu", css: "transition-opacity duration-500" },
  { id: "slide", label: "Glisser", css: "transition-transform duration-500" },
  { id: "zoom", label: "Zoom", css: "transition-transform duration-500 scale-110" },
  { id: "wipe", label: "Balayage", css: "transition-all duration-500" },
];

export const CanvaStyleTimeline = ({ 
  clips, 
  texts = [],
  audioTracks = [],
  format = "9:16", 
  onReorder, 
  onRemove, 
  onDuplicate,
  onTransitionChange,
  onSelectClip,
  selectedClipId,
  onRemoveAudio,
  onSelectText,
  selectedTextId
}: CanvaStyleTimelineProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [draggedClipIndex, setDraggedClipIndex] = useState<number | null>(null);
  const [showTransitionPicker, setShowTransitionPicker] = useState<string | null>(null);

  const totalDuration = clips.reduce((sum, clip) => sum + (clip.duration / (clip.speed || 1)), 0);
  const currentClip = clips[currentClipIndex];

  // Calculate global time
  const getGlobalTime = () => {
    let time = 0;
    for (let i = 0; i < currentClipIndex; i++) {
      time += clips[i].duration / (clips[i].speed || 1);
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

  // Update playback rate when clip speed changes
  useEffect(() => {
    if (videoRef.current && currentClip?.speed) {
      videoRef.current.playbackRate = currentClip.speed;
    }
  }, [currentClip?.speed, currentClipIndex]);

  const handleSeek = (time: number) => {
    let accumulated = 0;
    for (let i = 0; i < clips.length; i++) {
      const clipDuration = clips[i].duration / (clips[i].speed || 1);
      if (time < accumulated + clipDuration) {
        setCurrentClipIndex(i);
        const clipTime = time - accumulated;
        setCurrentTime(clipTime);
        if (videoRef.current) videoRef.current.currentTime = clipTime;
        return;
      }
      accumulated += clipDuration;
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

  // Get current text overlays
  const activeTexts = texts.filter(t => globalTime >= t.startTime && globalTime <= t.endTime);

  // Generate time markers
  const timeMarkers = [];
  const markerInterval = totalDuration > 60 ? 10 : totalDuration > 30 ? 5 : 2;
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
            <p className="text-sm text-white/40 mt-1">Importez des vidéos ou images depuis le panneau gauche</p>
          </div>
        </div>
        {/* Empty Timeline */}
        <div className="h-48 bg-[#1a1a2e] rounded-b-lg border-t border-border/30 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Timeline vide - Glissez des clips ici</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a] rounded-lg overflow-hidden">
      {/* Video Preview Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center min-h-[300px]">
        {/* Video Container */}
        <div className={cn(
          "relative bg-black overflow-hidden",
          format === "9:16" && "aspect-[9/16] h-full max-h-[400px]",
          format === "1:1" && "aspect-square h-full max-h-[400px]",
          format === "16:9" && "aspect-video w-full max-w-[700px]"
        )}>
          <video
            ref={videoRef}
            src={currentClip?.videoUrl}
            className={cn(
              "w-full h-full object-contain",
              currentClip?.transition && TRANSITIONS.find(t => t.id === currentClip.transition)?.css
            )}
            playsInline
          />
          
          {/* Text Overlays */}
          {activeTexts.map((text) => (
            <div
              key={text.id}
              onClick={() => onSelectText?.(text.id)}
              className={cn(
                "absolute cursor-pointer select-none transition-all",
                selectedTextId === text.id && "ring-2 ring-cyan-400",
                text.animation === "fadeIn" && "animate-fade-in",
                text.animation === "slideUp" && "animate-slide-up",
                text.animation === "scaleIn" && "animate-scale-in",
                text.animation === "bounce" && "animate-bounce",
                text.animation === "glow" && "animate-pulse"
              )}
              style={{
                left: `${text.position.x}%`,
                top: `${text.position.y}%`,
                transform: "translate(-50%, -50%)",
                fontFamily: text.font,
                fontSize: `${text.size}px`,
                color: text.color,
                fontWeight: text.bold ? "bold" : "normal",
                fontStyle: text.italic ? "italic" : "normal",
                textAlign: text.align,
                textShadow: "2px 2px 4px rgba(0,0,0,0.8)"
              }}
            >
              {text.text}
            </div>
          ))}
        </div>

        {/* Time Display & Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/60 hover:text-white"
            onClick={() => handleSeek(Math.max(0, globalTime - 5))}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <span className="text-white text-sm font-medium w-12 text-center">{formatTime(globalTime)}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-12 w-12 rounded-full bg-white text-black hover:bg-white/90"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
          <span className="text-white/60 text-sm w-12 text-center">{formatTime(totalDuration)}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/60 hover:text-white"
            onClick={() => handleSeek(Math.min(totalDuration, globalTime + 5))}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/60 hover:text-white"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={([v]) => { setVolume(v / 100); setIsMuted(false); }}
            max={100}
            className="w-20"
          />
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
        <div className="h-6 bg-[#252540] border-b border-white/5 flex items-end px-12 relative overflow-hidden">
          <div 
            className="flex-1 relative cursor-pointer" 
            style={{ minWidth: `${zoom * 2}%` }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const time = (x / rect.width) * totalDuration;
              handleSeek(time);
            }}
          >
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
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
              style={{ left: `${playheadPosition}%` }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rounded-sm rotate-45" />
            </div>
          </div>
        </div>

        {/* Video Track */}
        <div className="flex items-center h-16 border-b border-white/5">
          <div className="w-12 h-full flex items-center justify-center border-r border-white/5 bg-[#252540]">
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div 
            ref={timelineRef}
            className="flex-1 h-full flex items-center gap-0.5 px-2 overflow-x-auto"
            style={{ minWidth: `${zoom * 2}%` }}
          >
            {clips.map((clip, index) => {
              const clipDuration = clip.duration / (clip.speed || 1);
              const clipWidth = (clipDuration / totalDuration) * 100;
              const isSelected = selectedClipId === clip.id;
              
              return (
                <div key={clip.id} className="flex items-center">
                  {/* Transition marker */}
                  {index > 0 && (
                    <div className="relative">
                      <button
                        className="w-5 h-12 flex items-center justify-center group"
                        onClick={() => setShowTransitionPicker(showTransitionPicker === clip.id ? null : clip.id)}
                      >
                        <div className={cn(
                          "w-3 h-3 rounded-full transition-all",
                          clip.transition && clip.transition !== "none" 
                            ? "bg-cyan-400" 
                            : "bg-white/20 group-hover:bg-white/40"
                        )}>
                          <Sparkles className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                        </div>
                      </button>
                      
                      {/* Transition Picker Dropdown */}
                      {showTransitionPicker === clip.id && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-30 bg-[#252540] rounded-lg border border-white/10 p-2 shadow-xl min-w-[120px]">
                          {TRANSITIONS.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                onTransitionChange?.(clip.id, t.id);
                                setShowTransitionPicker(null);
                              }}
                              className={cn(
                                "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors",
                                clip.transition === t.id ? "text-cyan-400 bg-cyan-400/10" : "text-white/70"
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Clip */}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectClip?.(clip.id)}
                    className={cn(
                      "h-12 rounded cursor-pointer transition-all relative group overflow-hidden",
                      isSelected 
                        ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-[#1a1a2e]" 
                        : "hover:ring-1 hover:ring-white/30",
                      draggedClipIndex === index && "opacity-50"
                    )}
                    style={{ 
                      width: `${Math.max(clipWidth, 5)}%`,
                      minWidth: '50px',
                      background: clip.thumbnailUrl 
                        ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${clip.thumbnailUrl})`
                        : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] text-white font-medium truncate px-1 drop-shadow-md">
                        {clip.title}
                      </span>
                    </div>
                    {/* Speed indicator */}
                    {clip.speed && clip.speed !== 1 && (
                      <div className="absolute bottom-0.5 left-0.5 px-1 py-0.5 bg-black/60 rounded text-[8px] text-white">
                        {clip.speed}x
                      </div>
                    )}
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
            <button className="h-12 w-10 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 ml-1 flex-shrink-0">
              <Plus className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>

        {/* Text Track */}
        <div className="flex items-center h-12 border-b border-white/5">
          <div className="w-12 h-full flex items-center justify-center border-r border-white/5 bg-[#252540]">
            <Type className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="flex-1 h-full flex items-center px-2 relative" style={{ minWidth: `${zoom * 2}%` }}>
            {texts.length === 0 ? (
              <span className="text-xs text-white/30">Ajoutez du texte depuis le panneau Texte</span>
            ) : (
              texts.map((text) => {
                const startPercent = (text.startTime / totalDuration) * 100;
                const durationPercent = ((text.endTime - text.startTime) / totalDuration) * 100;
                return (
                  <div
                    key={text.id}
                    onClick={() => onSelectText?.(text.id)}
                    className={cn(
                      "absolute h-8 top-2 rounded cursor-pointer transition-all",
                      selectedTextId === text.id 
                        ? "ring-2 ring-yellow-400" 
                        : "hover:ring-1 hover:ring-white/30"
                    )}
                    style={{
                      left: `${startPercent}%`,
                      width: `${Math.max(durationPercent, 2)}%`,
                      minWidth: '40px',
                      backgroundColor: text.color + "40",
                      borderLeft: `3px solid ${text.color}`
                    }}
                  >
                    <span className="text-[9px] text-white truncate px-1 block mt-1">
                      {text.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Audio Track */}
        <div className="flex items-center h-12 border-b border-white/5">
          <div className="w-12 h-full flex items-center justify-center border-r border-white/5 bg-[#252540]">
            <Music className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex-1 h-full flex items-center px-2 relative" style={{ minWidth: `${zoom * 2}%` }}>
            {audioTracks.length === 0 ? (
              <span className="text-xs text-white/30">Ajoutez de l'audio depuis le panneau Audio</span>
            ) : (
              audioTracks.map((track) => {
                const startPercent = (track.startTime / totalDuration) * 100;
                const durationPercent = (track.duration / totalDuration) * 100;
                return (
                  <div
                    key={track.id}
                    className="absolute h-8 top-2 rounded bg-purple-500/30 border-l-2 border-purple-500 cursor-pointer hover:bg-purple-500/40 group"
                    style={{
                      left: `${startPercent}%`,
                      width: `${Math.max(durationPercent, 3)}%`,
                      minWidth: '60px'
                    }}
                  >
                    <span className="text-[9px] text-white truncate px-1 block mt-1">
                      {track.name}
                    </span>
                    <button 
                      onClick={() => onRemoveAudio?.(track.id)}
                      className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2 h-2 text-white" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Effects Track */}
        <div className="flex items-center h-10 border-b border-white/5">
          <div className="w-12 h-full flex items-center justify-center border-r border-white/5 bg-[#252540]">
            <Sparkles className="w-4 h-4 text-green-400" />
          </div>
          <div className="flex-1 h-full flex items-center px-2">
            <span className="text-xs text-white/30">Piste effets (bientôt disponible)</span>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="h-10 flex items-center justify-between px-3 bg-[#252540]">
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span>{clips.length} clips</span>
            <span>•</span>
            <span>{texts.length} textes</span>
            <span>•</span>
            <span>{audioTracks.length} audio</span>
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
            {/* Duration */}
            <div className="text-xs text-white/40">
              {formatTime(globalTime)} / {formatTime(totalDuration)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
