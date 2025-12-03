import React, { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  GripVertical, Trash2, ChevronLeft, ChevronRight, Film, Clock, 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2,
  Plus, Scissors, Copy, RotateCcw
} from "lucide-react";

interface TimelineClip {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  category: string;
  order: number;
  transition?: string;
}

interface InShotTimelineProps {
  clips: TimelineClip[];
  onReorder: (clips: TimelineClip[]) => void;
  onRemove: (id: string) => void;
  onTransitionChange: (id: string, transition: string) => void;
  format: "9:16" | "1:1" | "16:9";
}

const TRANSITIONS = [
  { id: "none", label: "Aucune", icon: "—" },
  { id: "fade", label: "Fondu", icon: "◐" },
  { id: "slide-left", label: "Glisser ←", icon: "←" },
  { id: "slide-right", label: "Glisser →", icon: "→" },
  { id: "zoom", label: "Zoom", icon: "⊕" },
  { id: "wipe", label: "Balayage", icon: "▬" },
];

export function InShotTimeline({ 
  clips, 
  onReorder, 
  onRemove, 
  onTransitionChange,
  format 
}: InShotTimelineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [clipCurrentTime, setClipCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const totalDuration = clips.reduce((sum, c) => sum + (c.duration_seconds || 5), 0);
  const currentClip = clips[currentClipIndex];

  // Calculate cumulative time for each clip
  const getClipStartTime = (index: number) => {
    return clips.slice(0, index).reduce((sum, c) => sum + (c.duration_seconds || 5), 0);
  };

  const getAspectRatio = () => {
    switch (format) {
      case "9:16": return "aspect-[9/16]";
      case "1:1": return "aspect-square";
      case "16:9": return "aspect-video";
      default: return "aspect-[9/16]";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Play/Pause
  const togglePlay = () => {
    if (!videoRef.current || clips.length === 0) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Skip to next/previous clip
  const skipToClip = (direction: "prev" | "next") => {
    if (direction === "prev" && currentClipIndex > 0) {
      setCurrentClipIndex(currentClipIndex - 1);
      setClipCurrentTime(0);
    } else if (direction === "next" && currentClipIndex < clips.length - 1) {
      setCurrentClipIndex(currentClipIndex + 1);
      setClipCurrentTime(0);
    }
  };

  // Restart from beginning
  const restart = () => {
    setCurrentClipIndex(0);
    setClipCurrentTime(0);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Seek in global timeline
  const handleGlobalSeek = (value: number[]) => {
    const seekTime = value[0];
    let accumulated = 0;
    
    for (let i = 0; i < clips.length; i++) {
      const clipDuration = clips[i].duration_seconds || 5;
      if (seekTime < accumulated + clipDuration) {
        setCurrentClipIndex(i);
        const clipTime = seekTime - accumulated;
        setClipCurrentTime(clipTime);
        if (videoRef.current) {
          videoRef.current.currentTime = clipTime;
        }
        break;
      }
      accumulated += clipDuration;
    }
    setCurrentTime(seekTime);
  };

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setClipCurrentTime(video.currentTime);
      setCurrentTime(getClipStartTime(currentClipIndex) + video.currentTime);
    };

    const handleEnded = () => {
      if (currentClipIndex < clips.length - 1) {
        setCurrentClipIndex(currentClipIndex + 1);
        setClipCurrentTime(0);
      } else {
        setIsPlaying(false);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [currentClipIndex, clips.length]);

  // Auto-play next clip
  useEffect(() => {
    if (videoRef.current && currentClip && isPlaying) {
      videoRef.current.play().catch(() => {});
    }
  }, [currentClipIndex, isPlaying]);

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setIsDragging(true);
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    
    const newClips = [...clips];
    const [draggedClip] = newClips.splice(dragIndex, 1);
    newClips.splice(index, 0, draggedClip);
    newClips.forEach((c, i) => c.order = i);
    onReorder(newClips);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragIndex(null);
  };

  // Click on clip in timeline
  const handleClipClick = (index: number) => {
    setSelectedClipId(clips[index].id);
    setCurrentClipIndex(index);
    setClipCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div className="space-y-4">
      {/* Video Preview - InShot style centered */}
      <Card className="bg-gradient-to-b from-card/80 to-card/40 backdrop-blur border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-4">
            {/* Main Video Preview */}
            <div className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm ${getAspectRatio()}`}>
              {currentClip ? (
                <>
                  <video
                    ref={videoRef}
                    src={currentClip.file_url}
                    className="w-full h-full object-cover"
                    playsInline
                    muted={isMuted}
                  />
                  
                  {/* Clip indicator */}
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-white font-medium flex items-center gap-2">
                    <Film className="w-3 h-3" />
                    {currentClipIndex + 1}/{clips.length}
                  </div>

                  {/* Play overlay when paused */}
                  {!isPlaying && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                      onClick={togglePlay}
                    >
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="w-8 h-8 text-black ml-1" />
                      </div>
                    </div>
                  )}

                  {/* Current clip title */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white font-medium text-sm truncate">{currentClip.title}</p>
                    <p className="text-white/60 text-xs">{formatTime(clipCurrentTime)} / {formatTime(currentClip.duration_seconds || 0)}</p>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                      <Film className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Ajoutez des clips</p>
                  </div>
                </div>
              )}
            </div>

            {/* Playback Controls - InShot style */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full"
                onClick={restart}
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full"
                onClick={() => skipToClip("prev")}
                disabled={currentClipIndex === 0}
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              <Button 
                variant="default" 
                size="icon" 
                className="h-14 w-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full"
                onClick={() => skipToClip("next")}
                disabled={currentClipIndex >= clips.length - 1}
              >
                <SkipForward className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Timeline Scrubber */}
      {clips.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4 space-y-3">
            {/* Time display */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-mono">{formatTime(currentTime)}</span>
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(totalDuration)}
              </Badge>
              <span className="text-muted-foreground font-mono">{formatTime(totalDuration)}</span>
            </div>

            {/* Global progress bar with clip segments */}
            <div className="relative">
              <Slider
                value={[currentTime]}
                max={totalDuration}
                step={0.1}
                onValueChange={handleGlobalSeek}
                className="w-full"
              />
              
              {/* Clip segment markers */}
              <div className="absolute top-full mt-1 left-0 right-0 h-1 flex rounded-full overflow-hidden">
                {clips.map((clip, index) => {
                  const clipDuration = clip.duration_seconds || 5;
                  const width = (clipDuration / totalDuration) * 100;
                  const isActive = currentClipIndex === index;
                  
                  return (
                    <div
                      key={clip.id}
                      className={`h-full transition-colors ${
                        isActive 
                          ? "bg-cyan-500" 
                          : index % 2 === 0 
                            ? "bg-purple-500/50" 
                            : "bg-cyan-500/30"
                      }`}
                      style={{ width: `${width}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Horizontal Clip Timeline - InShot style */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Scissors className="w-4 h-4 text-cyan-400" />
              Timeline
            </CardTitle>
            <span className="text-xs text-muted-foreground">{clips.length} clips</span>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {clips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border/50 rounded-xl">
              <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Glissez des clips ici
            </div>
          ) : (
            <div 
              ref={timelineRef}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            >
              {clips.map((clip, index) => (
                <div key={clip.id} className="flex items-center">
                  {/* Transition selector between clips */}
                  {index > 0 && (
                    <div className="flex flex-col items-center mx-1">
                      <select
                        value={clip.transition || "none"}
                        onChange={(e) => onTransitionChange(clip.id, e.target.value)}
                        className="w-8 h-8 text-xs bg-muted border border-border rounded-full cursor-pointer text-center appearance-none"
                        title="Transition"
                      >
                        {TRANSITIONS.map((t) => (
                          <option key={t.id} value={t.id}>{t.icon}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Clip thumbnail card */}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleClipClick(index)}
                    className={`
                      relative flex-shrink-0 w-28 cursor-pointer transition-all duration-200
                      ${selectedClipId === clip.id ? "ring-2 ring-cyan-500 scale-105" : ""}
                      ${currentClipIndex === index ? "ring-2 ring-purple-500" : ""}
                      ${isDragging && dragIndex === index ? "opacity-50" : ""}
                    `}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-16 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg overflow-hidden border border-border/50">
                      {clip.thumbnail_url ? (
                        <img 
                          src={clip.thumbnail_url} 
                          alt={clip.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Duration badge */}
                      <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white font-mono">
                        {formatTime(clip.duration_seconds || 0)}
                      </div>

                      {/* Playing indicator */}
                      {currentClipIndex === index && isPlaying && (
                        <div className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}

                      {/* Delete button on hover */}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5 opacity-0 hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(clip.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>

                      {/* Drag handle */}
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab opacity-50 hover:opacity-100">
                        <GripVertical className="w-3 h-3 text-white" />
                      </div>
                    </div>

                    {/* Clip title */}
                    <p className="text-[10px] text-center truncate mt-1 text-muted-foreground">
                      {clip.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
