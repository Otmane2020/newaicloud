import React, { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Maximize2 } from "lucide-react";

interface VideoClip {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  category: string;
}

interface StoryboardSection {
  type: string;
  start: number;
  end: number;
  text?: string;
  animation?: string;
  style?: string;
}

interface EffectsConfig {
  glow: boolean;
  particles: boolean;
  zoom: boolean;
  holo: boolean;
  text3D: boolean;
  transitions: boolean;
}

interface VideoPreviewProps {
  selectedClip: VideoClip | null;
  storyboard: StoryboardSection[];
  effects: EffectsConfig;
  texts: Record<number, string>;
  format: "9:16" | "1:1" | "16:9";
}

export function VideoPreview({
  selectedClip,
  storyboard,
  effects,
  texts,
  format,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);

  const getAspectRatio = () => {
    switch (format) {
      case "9:16": return "aspect-[9/16]";
      case "1:1": return "aspect-square";
      case "16:9": return "aspect-video";
      default: return "aspect-[9/16]";
    }
  };

  const getCurrentSection = () => {
    return storyboard.find(
      (section) => currentTime >= section.start && currentTime < section.end
    );
  };

  const currentSection = getCurrentSection();
  const currentSectionIndex = currentSection
    ? storyboard.indexOf(currentSection)
    : -1;
  const displayText =
    currentSectionIndex >= 0
      ? texts[currentSectionIndex] || currentSection?.text
      : null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, []);

  const getGlowClass = () => {
    if (!effects.glow) return "";
    return "drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]";
  };

  const getTextAnimation = () => {
    if (!effects.text3D) return "";
    return "animate-pulse";
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">👁️ Preview ({format})</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={restart}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePlay}>
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <div
            className={`relative bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden max-w-md w-full ${getAspectRatio()}`}
          >
            {/* Video Layer */}
            {selectedClip ? (
              <video
                ref={videoRef}
                src={selectedClip.file_url}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                    <Play className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Select a clip from the library
                  </p>
                </div>
              </div>
            )}

            {/* Effects Overlays */}
            {effects.particles && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-ping"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random() * 2}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {effects.holo && (
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-cyan-500/10 via-transparent to-purple-500/10" />
            )}

            {/* Text Overlay */}
            {displayText && (
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div
                  className={`
                    text-white text-center font-bold text-lg
                    ${getGlowClass()}
                    ${getTextAnimation()}
                  `}
                  style={{
                    textShadow: effects.glow
                      ? "0 0 20px rgba(6,182,212,0.8), 0 0 40px rgba(6,182,212,0.4)"
                      : "0 2px 10px rgba(0,0,0,0.8)",
                  }}
                >
                  {displayText}
                </div>
              </div>
            )}

            {/* Timeline Indicator */}
            {storyboard.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                <div className="flex h-full">
                  {storyboard.map((section, index) => {
                    const totalDuration = storyboard[storyboard.length - 1].end;
                    const width = ((section.end - section.start) / totalDuration) * 100;
                    const isActive = currentSectionIndex === index;
                    
                    return (
                      <div
                        key={index}
                        className={`h-full transition-colors ${
                          isActive ? "bg-cyan-500" : "bg-gray-600"
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
