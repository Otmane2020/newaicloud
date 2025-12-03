import { useState } from "react";
import { Sparkles, Palette, Layers, Wand2, Zap, Sun, Moon, Droplets } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Animation {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  preview?: string;
}

interface AnimationsPanelProps {
  onSelectAnimation: (animation: Animation) => void;
  selectedAnimationId: string | null;
}

const ANIMATION_CATEGORIES = {
  body: {
    label: "Effets du corps",
    icon: <Wand2 className="h-4 w-4" />,
    animations: [
      { id: "glow", name: "Lueur", icon: <Sun className="h-5 w-5" />, color: "#FFD700" },
      { id: "particles", name: "Particules", icon: <Sparkles className="h-5 w-5" />, color: "#FF69B4" },
      { id: "blur", name: "Flou", icon: <Droplets className="h-5 w-5" />, color: "#87CEEB" },
      { id: "zoom", name: "Zoom", icon: <Zap className="h-5 w-5" />, color: "#FF4500" },
    ]
  },
  fusion: {
    label: "Effet de fusion",
    icon: <Layers className="h-4 w-4" />,
    animations: [
      { id: "overlay", name: "Superposition", icon: <Layers className="h-5 w-5" />, color: "#9370DB" },
      { id: "blend", name: "Mélange", icon: <Palette className="h-5 w-5" />, color: "#20B2AA" },
      { id: "double", name: "Double expo", icon: <Moon className="h-5 w-5" />, color: "#4B0082" },
      { id: "ghost", name: "Fantôme", icon: <Wand2 className="h-5 w-5" />, color: "#708090" },
    ]
  },
  color: {
    label: "Préréglage couleur",
    icon: <Palette className="h-4 w-4" />,
    animations: [
      { id: "warm", name: "Chaud", icon: <Sun className="h-5 w-5" />, color: "#FF8C00" },
      { id: "cold", name: "Froid", icon: <Moon className="h-5 w-5" />, color: "#4169E1" },
      { id: "vintage", name: "Vintage", icon: <Palette className="h-5 w-5" />, color: "#D2691E" },
      { id: "neon", name: "Néon", icon: <Zap className="h-5 w-5" />, color: "#FF1493" },
    ]
  },
  style: {
    label: "Effet de style",
    icon: <Sparkles className="h-4 w-4" />,
    animations: [
      { id: "glitch", name: "Glitch", icon: <Zap className="h-5 w-5" />, color: "#00FF00" },
      { id: "vhs", name: "VHS", icon: <Layers className="h-5 w-5" />, color: "#FF6347" },
      { id: "comic", name: "Comic", icon: <Wand2 className="h-5 w-5" />, color: "#FFD700" },
      { id: "sketch", name: "Croquis", icon: <Palette className="h-5 w-5" />, color: "#2F4F4F" },
    ]
  }
};

export const AnimationsPanel = ({ onSelectAnimation, selectedAnimationId }: AnimationsPanelProps) => {
  const [activeTab, setActiveTab] = useState("body");

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Animations & Effets
        </h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start px-2 py-1 h-auto bg-transparent border-b border-border rounded-none">
          {Object.entries(ANIMATION_CATEGORIES).map(([key, category]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="text-xs gap-1 data-[state=active]:bg-muted px-2 py-1.5"
            >
              {category.icon}
              <span className="hidden sm:inline">{category.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="flex-1">
          {Object.entries(ANIMATION_CATEGORIES).map(([key, category]) => (
            <TabsContent key={key} value={key} className="m-0 p-2">
              <div className="grid grid-cols-2 gap-2">
                {category.animations.map((animation) => {
                  const isSelected = selectedAnimationId === animation.id;
                  
                  return (
                    <button
                      key={animation.id}
                      className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-all hover:scale-105 ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/50'
                          : 'border-border bg-card hover:border-muted-foreground/50'
                      }`}
                      onClick={() => onSelectAnimation(animation)}
                    >
                      {/* Preview circle with animation effect */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                        style={{
                          background: `linear-gradient(135deg, ${animation.color}40, ${animation.color}20)`,
                          boxShadow: isSelected ? `0 0 20px ${animation.color}40` : 'none'
                        }}
                      >
                        <div style={{ color: animation.color }}>
                          {animation.icon}
                        </div>
                      </div>

                      {/* Animation name */}
                      <span className="text-xs font-medium">{animation.name}</span>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
    </div>
  );
};
