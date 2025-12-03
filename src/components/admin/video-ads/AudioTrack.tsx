import { Music, Volume2, VolumeX, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

interface AudioClip {
  id: string;
  name: string;
  duration: number;
  startTime: number;
  volume: number;
  waveform?: number[];
}

interface AudioTrackProps {
  audioClips: AudioClip[];
  totalDuration: number;
  currentTime: number;
  onAddAudio: () => void;
  onVolumeChange: (clipId: string, volume: number) => void;
  onRemoveAudio: (clipId: string) => void;
}

export const AudioTrack = ({
  audioClips,
  totalDuration,
  currentTime,
  onAddAudio,
  onVolumeChange,
}: AudioTrackProps) => {
  const [isMuted, setIsMuted] = useState(false);

  // Generate fake waveform for visualization
  const generateWaveform = (duration: number) => {
    const points = Math.floor(duration * 4);
    return Array.from({ length: points }, () => Math.random() * 0.8 + 0.2);
  };

  return (
    <div className="flex items-center h-14 bg-background border-b border-border">
      {/* Track Label */}
      <div className="w-12 h-full flex flex-col items-center justify-center border-r border-border bg-muted/20 shrink-0">
        <Music className="h-4 w-4 text-green-500" />
        <span className="text-[9px] text-muted-foreground mt-0.5">Audio</span>
      </div>

      {/* Track Content */}
      <div className="flex-1 h-full relative overflow-hidden">
        {audioClips.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={onAddAudio}
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs">Ajouter audio</span>
            </Button>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center px-1">
            {audioClips.map((clip) => {
              const clipLeft = (clip.startTime / totalDuration) * 100;
              const clipWidth = (clip.duration / totalDuration) * 100;
              const waveform = clip.waveform || generateWaveform(clip.duration);
              const isPlaying = currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration;

              return (
                <div
                  key={clip.id}
                  className={`absolute h-10 rounded-md overflow-hidden group ${
                    isPlaying ? 'ring-1 ring-green-400' : ''
                  }`}
                  style={{
                    left: `${clipLeft}%`,
                    width: `${clipWidth}%`,
                    minWidth: '80px',
                    background: 'linear-gradient(135deg, hsl(142 76% 36% / 0.3), hsl(142 76% 36% / 0.1))'
                  }}
                >
                  {/* Waveform visualization */}
                  <div className="absolute inset-0 flex items-center justify-around px-1">
                    {waveform.slice(0, 50).map((height, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-green-500/70 rounded-full"
                        style={{ height: `${height * 100}%` }}
                      />
                    ))}
                  </div>

                  {/* Audio info overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                      <span className="text-[9px] text-white truncate">{clip.name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 text-white hover:bg-white/20"
                          onClick={() => setIsMuted(!isMuted)}
                        >
                          {isMuted ? (
                            <VolumeX className="h-3 w-3" />
                          ) : (
                            <Volume2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Volume slider on hover */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Slider
                      value={[clip.volume * 100]}
                      onValueChange={(v) => onVolumeChange(clip.id, v[0] / 100)}
                      max={100}
                      step={1}
                      className="w-16 h-1"
                    />
                  </div>
                </div>
              );
            })}

            {/* Add more audio button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 h-6 w-6 text-muted-foreground hover:text-green-500"
              onClick={onAddAudio}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
