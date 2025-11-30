import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, Zap, ZoomIn, Box, Type, ArrowLeftRight } from "lucide-react";

interface EffectsConfig {
  glow: boolean;
  particles: boolean;
  zoom: boolean;
  holo: boolean;
  text3D: boolean;
  transitions: boolean;
}

interface EffectsPanelProps {
  effects: EffectsConfig;
  onChange: (effects: EffectsConfig) => void;
}

const EFFECTS = [
  { key: "glow", label: "Glow Neon", icon: Sparkles, description: "Neon glow effect on text" },
  { key: "particles", label: "Particles", icon: Zap, description: "Floating particle effects" },
  { key: "zoom", label: "Dynamic Zoom", icon: ZoomIn, description: "Auto zoom on key moments" },
  { key: "holo", label: "Hologram", icon: Box, description: "Holographic UI overlay" },
  { key: "text3D", label: "3D Text", icon: Type, description: "3D animated text effects" },
  { key: "transitions", label: "Tech Transitions", icon: ArrowLeftRight, description: "Smooth tech transitions" },
] as const;

export function EffectsPanel({ effects, onChange }: EffectsPanelProps) {
  const toggle = (key: keyof EffectsConfig) => {
    onChange({ ...effects, [key]: !effects[key] });
  };

  const activeCount = Object.values(effects).filter(Boolean).length;

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Effects
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {activeCount} active
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {EFFECTS.map(({ key, label, icon: Icon, description }) => (
          <div
            key={key}
            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              effects[key]
                ? "bg-purple-500/10 border border-purple-500/30"
                : "hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={`w-4 h-4 ${
                  effects[key] ? "text-purple-400" : "text-muted-foreground"
                }`}
              />
              <div>
                <Label
                  htmlFor={key}
                  className={`text-sm cursor-pointer ${
                    effects[key] ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              id={key}
              checked={effects[key]}
              onCheckedChange={() => toggle(key)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
