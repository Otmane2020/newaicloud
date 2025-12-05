import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { TimelineRuler } from "./TimelineRuler";
import { VideoTrack } from "./VideoTrack";
import { AudioTrack } from "./AudioTrack";
import { EffectsTrack } from "./EffectsTrack";
import { AudioLibrary } from "./AudioLibrary";

interface VideoClip {
  id: string;
  title: string;
  duration: number;
  thumbnailUrl?: string;
  videoUrl: string;
  transition?: string;
}

interface AudioClipData {
  id: string;
  name: string;
  duration: number;
  startTime: number;
  volume: number;
}

interface EffectData {
  id: string;
  name: string;
  type: string;
  startTime: number;
  duration: number;
  color: string;
}

interface ProVideoTimelineProps {
  clips: VideoClip[];
  format?: "9:16" | "1:1" | "16:9";
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  onDuplicate?: (clip: VideoClip) => void;
  onTransitionChange?: (clipId: string, transition: string) => void;
}

export const ProVideoTimeline = ({ clips, format = "9:16", onReorder, onRemove, onDuplicate, onTransitionChange }: ProVideoTimelineProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [showAudioLibrary, setShowAudioLibrary] = useState(false);
  
  const [audioClips, setAudioClips] = useState<AudioClipData[]>([]);
  const [effects, setEffects] = useState<EffectData[]>([]);

  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);
  const currentClip = clips[currentClipIndex];

  // Calculate global time from clip times
  const getGlobalTime = () => {
    let time = 0;
    for (let i = 0; i < currentClipIndex; i++) {
      time += clips[i].duration;
    }
    return time + currentTime;
  };

  const globalTime = getGlobalTime();

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle video time update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

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

  // Play/pause sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, currentClipIndex]);

  // Volume sync
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  
  const handleSkipBack = () => {
    if (currentClipIndex > 0) {
      setCurrentClipIndex(prev => prev - 1);
      setCurrentTime(0);
    }
  };

  const handleSkipForward = () => {
    if (currentClipIndex < clips.length - 1) {
      setCurrentClipIndex(prev => prev + 1);
      setCurrentTime(0);
    }
  };

  const handleRestart = () => {
    setCurrentClipIndex(0);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleSeek = (time: number) => {
    let accumulated = 0;
    for (let i = 0; i < clips.length; i++) {
      if (time < accumulated + clips[i].duration) {
        setCurrentClipIndex(i);
        const clipTime = time - accumulated;
        setCurrentTime(clipTime);
        if (videoRef.current) {
          videoRef.current.currentTime = clipTime;
        }
        return;
      }
      accumulated += clips[i].duration;
    }
  };

  const handleAddAudio = (audio: { id: string; name: string; duration: number }) => {
    setAudioClips(prev => [...prev, {
      id: `audio-${Date.now()}`,
      name: audio.name,
      duration: Math.min(audio.duration, totalDuration),
      startTime: 0,
      volume: 1
    }]);
  };

  const handleAddEffect = () => {
    const newEffect: EffectData = {
      id: `effect-${Date.now()}`,
      name: "Nouvel effet",
      type: "glow",
      startTime: globalTime,
      duration: 5,
      color: "#9370DB"
    };
    setEffects(prev => [...prev, newEffect]);
    setSelectedEffectId(newEffect.id);
  };

  const playheadPosition = (globalTime / totalDuration) * 100;

  if (clips.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground">Ajoutez des clips pour commencer le montage</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-card rounded-lg border border-border overflow-hidden">
      {/* Video Preview */}
      <div className={`relative bg-black mx-auto ${
        format === "9:16" ? "aspect-[9/16] max-h-[500px] w-auto" : 
        format === "1:1" ? "aspect-square max-h-[400px] w-auto" : 
        "aspect-[16/9] w-full max-h-[400px]"
      }`}>
        <video
          ref={videoRef}
          src={currentClip?.videoUrl}
          className="w-full h-full object-contain"
          playsInline
        />
        
        {/* Playhead time overlay */}
        <div className="absolute top-3 left-3 bg-black/70 rounded px-2 py-1">
          <span className="text-white text-sm font-mono">
            {formatTime(globalTime)} / {formatTime(totalDuration)}
          </span>
        </div>

        {/* Current clip info */}
        <div className="absolute bottom-3 left-3 bg-black/70 rounded px-2 py-1">
          <span className="text-white text-xs">
            Clip {currentClipIndex + 1}/{clips.length}: {currentClip?.title}
          </span>
        </div>

        {/* Fullscreen button */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-3 right-3 text-white hover:bg-white/20"
          onClick={() => videoRef.current?.requestFullscreen()}
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={handleRestart}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleSkipBack} disabled={currentClipIndex === 0}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="default"
            className="h-10 w-10 rounded-full"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={handleSkipForward} disabled={currentClipIndex === clips.length - 1}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Volume control */}
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={(v) => {
                setVolume(v[0] / 100);
                setIsMuted(false);
              }}
              max={100}
              step={1}
              className="w-20"
            />
          </div>

          {/* Zoom control */}
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="ghost" onClick={() => setZoom(z => Math.min(2, z + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Time Ruler */}
        <TimelineRuler 
          duration={totalDuration} 
          zoom={zoom}
          onSeek={handleSeek}
        />

        {/* Playhead */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
          style={{ left: `calc(48px + ${playheadPosition}% * (100% - 48px) / 100)` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
        </div>

        {/* Video Track */}
        <VideoTrack
          clips={clips}
          totalDuration={totalDuration}
          currentTime={globalTime}
          selectedClipId={selectedClipId}
          onSelectClip={setSelectedClipId}
          onReorder={onReorder}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          onTransitionChange={onTransitionChange}
        />

        {/* Audio Track */}
        <AudioTrack
          audioClips={audioClips}
          totalDuration={totalDuration}
          currentTime={globalTime}
          onAddAudio={() => setShowAudioLibrary(true)}
          onVolumeChange={(id, vol) => {
            setAudioClips(prev => prev.map(c => c.id === id ? { ...c, volume: vol } : c));
          }}
          onRemoveAudio={(id) => {
            setAudioClips(prev => prev.filter(c => c.id !== id));
          }}
        />

        {/* Effects Track */}
        <EffectsTrack
          effects={effects}
          totalDuration={totalDuration}
          currentTime={globalTime}
          onAddEffect={handleAddEffect}
          onSelectEffect={setSelectedEffectId}
          selectedEffectId={selectedEffectId}
        />
      </div>

      {/* Audio Library Dialog */}
      <AudioLibrary
        open={showAudioLibrary}
        onClose={() => setShowAudioLibrary(false)}
        onSelectAudio={handleAddAudio}
      />
    </div>
  );
};
