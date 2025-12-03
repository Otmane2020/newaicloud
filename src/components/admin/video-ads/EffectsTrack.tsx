import { Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Effect {
  id: string;
  name: string;
  type: string;
  startTime: number;
  duration: number;
  color: string;
}

interface EffectsTrackProps {
  effects: Effect[];
  totalDuration: number;
  currentTime: number;
  onAddEffect: () => void;
  onSelectEffect: (id: string) => void;
  selectedEffectId: string | null;
}

export const EffectsTrack = ({
  effects,
  totalDuration,
  currentTime,
  onAddEffect,
  onSelectEffect,
  selectedEffectId,
}: EffectsTrackProps) => {
  return (
    <div className="flex items-center h-12 bg-background border-b border-border">
      {/* Track Label */}
      <div className="w-12 h-full flex flex-col items-center justify-center border-r border-border bg-muted/20 shrink-0">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="text-[9px] text-muted-foreground mt-0.5">Effets</span>
      </div>

      {/* Track Content */}
      <div className="flex-1 h-full relative overflow-hidden">
        {effects.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={onAddEffect}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-xs">Ajouter effet</span>
            </Button>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center px-1">
            {effects.map((effect) => {
              const effectLeft = (effect.startTime / totalDuration) * 100;
              const effectWidth = (effect.duration / totalDuration) * 100;
              const isActive = currentTime >= effect.startTime && currentTime < effect.startTime + effect.duration;
              const isSelected = selectedEffectId === effect.id;

              return (
                <div
                  key={effect.id}
                  className={`absolute h-8 rounded-md overflow-hidden cursor-pointer transition-all ${
                    isSelected 
                      ? 'ring-2 ring-purple-400 shadow-lg' 
                      : isActive 
                        ? 'ring-1 ring-purple-300' 
                        : 'hover:ring-1 hover:ring-muted-foreground/50'
                  }`}
                  style={{
                    left: `${effectLeft}%`,
                    width: `${effectWidth}%`,
                    minWidth: '50px',
                    background: `linear-gradient(135deg, ${effect.color}40, ${effect.color}20)`
                  }}
                  onClick={() => onSelectEffect(effect.id)}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-foreground/80 truncate px-1">
                      {effect.name}
                    </span>
                  </div>

                  {/* Animated sparkle effect when active */}
                  {isActive && (
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add more effect button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 h-5 w-5 text-muted-foreground hover:text-purple-500"
              onClick={onAddEffect}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
