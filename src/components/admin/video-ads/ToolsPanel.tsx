import { useState } from "react";
import { Scissors, Copy, Trash2, FastForward, RotateCcw, FlipHorizontal, FlipVertical, Crop, Volume2, Palette, SplitSquareHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ToolsPanelProps {
  selectedClipId: string | null;
  onTrim: (clipId: string, start: number, end: number) => void;
  onSplit: (clipId: string, time: number) => void;
  onDuplicate: (clipId: string) => void;
  onDelete: (clipId: string) => void;
  onSpeedChange: (clipId: string, speed: number) => void;
  onVolumeChange: (clipId: string, volume: number) => void;
  clipDuration?: number;
  clipSpeed?: number;
  clipVolume?: number;
}

const SPEED_PRESETS = [
  { value: 0.25, label: "0.25x" },
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" },
  { value: 3, label: "3x" },
];

export const ToolsPanel = ({
  selectedClipId,
  onTrim,
  onSplit,
  onDuplicate,
  onDelete,
  onSpeedChange,
  onVolumeChange,
  clipDuration = 10,
  clipSpeed = 1,
  clipVolume = 100,
}: ToolsPanelProps) => {
  const { toast } = useToast();
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(clipDuration);
  const [splitTime, setSplitTime] = useState(clipDuration / 2);
  const [speed, setSpeed] = useState(clipSpeed);
  const [volume, setVolume] = useState(clipVolume);

  const handleTrim = () => {
    if (!selectedClipId) return;
    onTrim(selectedClipId, trimStart, trimEnd);
    toast({ title: "Clip rogné", description: `De ${trimStart.toFixed(1)}s à ${trimEnd.toFixed(1)}s` });
  };

  const handleSplit = () => {
    if (!selectedClipId) return;
    onSplit(selectedClipId, splitTime);
    toast({ title: "Clip divisé", description: `Division à ${splitTime.toFixed(1)}s` });
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (selectedClipId) {
      onSpeedChange(selectedClipId, newSpeed);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (selectedClipId) {
      onVolumeChange(selectedClipId, newVolume);
    }
  };

  if (!selectedClipId) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-white/10">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-white">
            <Scissors className="h-4 w-4 text-cyan-400" />
            Outils
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-white/40">
            <Scissors className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sélectionnez un clip</p>
            <p className="text-xs mt-1">pour utiliser les outils</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-white/10">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-white">
          <Scissors className="h-4 w-4 text-cyan-400" />
          Outils d'édition
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Quick Actions */}
          <div className="space-y-2">
            <Label className="text-xs text-white/70">Actions rapides</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-auto py-3 flex-col gap-1 border-white/10 hover:bg-white/5 text-white"
                onClick={() => selectedClipId && onDuplicate(selectedClipId)}
              >
                <Copy className="h-4 w-4" />
                <span className="text-[10px]">Dupliquer</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-auto py-3 flex-col gap-1 border-red-500/30 hover:bg-red-500/10 text-red-400"
                onClick={() => selectedClipId && onDelete(selectedClipId)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-[10px]">Supprimer</span>
              </Button>
            </div>
          </div>

          {/* Trim */}
          <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-white/70 flex items-center gap-1">
                <Crop className="h-3 w-3" />
                Rogner
              </Label>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-6 text-[10px] border-white/10 hover:bg-white/10 text-white"
                onClick={handleTrim}
              >
                Appliquer
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-white/50">
                <span>Début: {trimStart.toFixed(1)}s</span>
                <span>Fin: {trimEnd.toFixed(1)}s</span>
              </div>
              <div className="h-8 bg-white/10 rounded relative">
                <div 
                  className="absolute top-0 bottom-0 bg-cyan-500/30 rounded"
                  style={{
                    left: `${(trimStart / clipDuration) * 100}%`,
                    right: `${100 - (trimEnd / clipDuration) * 100}%`
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={clipDuration}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Math.min(parseFloat(e.target.value), trimEnd - 0.1))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
              <Slider
                value={[trimStart, trimEnd]}
                onValueChange={([start, end]) => {
                  setTrimStart(start);
                  setTrimEnd(end);
                }}
                min={0}
                max={clipDuration}
                step={0.1}
              />
            </div>
          </div>

          {/* Split */}
          <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-white/70 flex items-center gap-1">
                <SplitSquareHorizontal className="h-3 w-3" />
                Diviser
              </Label>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-6 text-[10px] border-white/10 hover:bg-white/10 text-white"
                onClick={handleSplit}
              >
                Couper
              </Button>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] text-white/50 text-center">
                Position: {splitTime.toFixed(1)}s
              </div>
              <Slider
                value={[splitTime]}
                onValueChange={([v]) => setSplitTime(v)}
                min={0.1}
                max={clipDuration - 0.1}
                step={0.1}
              />
            </div>
          </div>

          {/* Speed */}
          <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <Label className="text-xs text-white/70 flex items-center gap-1">
              <FastForward className="h-3 w-3" />
              Vitesse
            </Label>
            <div className="flex flex-wrap gap-1">
              {SPEED_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  size="sm"
                  variant={speed === preset.value ? "default" : "outline"}
                  className={cn(
                    "h-7 px-2 text-[10px] border-white/10",
                    speed === preset.value ? "" : "hover:bg-white/10 text-white"
                  )}
                  onClick={() => handleSpeedChange(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Slider
              value={[speed]}
              onValueChange={([v]) => handleSpeedChange(v)}
              min={0.1}
              max={4}
              step={0.05}
            />
            <p className="text-[10px] text-white/40 text-center">
              Durée finale: {(clipDuration / speed).toFixed(1)}s
            </p>
          </div>

          {/* Volume */}
          <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-white/70 flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                Volume
              </Label>
              <span className="text-[10px] text-white/50">{volume}%</span>
            </div>
            <Slider
              value={[volume]}
              onValueChange={([v]) => handleVolumeChange(v)}
              min={0}
              max={200}
              step={1}
            />
          </div>

          {/* Transform (placeholder) */}
          <div className="space-y-2">
            <Label className="text-xs text-white/70">Transformer</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-auto py-2 flex-col gap-1 border-white/10 hover:bg-white/5 text-white/70"
                onClick={() => toast({ title: "Rotation", description: "Fonctionnalité bientôt disponible" })}
              >
                <RotateCcw className="h-4 w-4" />
                <span className="text-[9px]">Rotation</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-auto py-2 flex-col gap-1 border-white/10 hover:bg-white/5 text-white/70"
                onClick={() => toast({ title: "Miroir H", description: "Fonctionnalité bientôt disponible" })}
              >
                <FlipHorizontal className="h-4 w-4" />
                <span className="text-[9px]">Miroir H</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-auto py-2 flex-col gap-1 border-white/10 hover:bg-white/5 text-white/70"
                onClick={() => toast({ title: "Miroir V", description: "Fonctionnalité bientôt disponible" })}
              >
                <FlipVertical className="h-4 w-4" />
                <span className="text-[9px]">Miroir V</span>
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
