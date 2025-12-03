import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Trash2, ChevronUp, ChevronDown, Film, Clock } from "lucide-react";

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

interface VideoTimelineProps {
  clips: TimelineClip[];
  onReorder: (clips: TimelineClip[]) => void;
  onRemove: (id: string) => void;
  onTransitionChange: (id: string, transition: string) => void;
}

const TRANSITIONS = [
  { id: "none", label: "Aucune", icon: "—" },
  { id: "fade", label: "Fondu", icon: "◐" },
  { id: "slide-left", label: "Glisser gauche", icon: "←" },
  { id: "slide-right", label: "Glisser droite", icon: "→" },
  { id: "zoom", label: "Zoom", icon: "⊕" },
  { id: "wipe", label: "Balayage", icon: "▬" },
];

export function VideoTimeline({ clips, onReorder, onRemove, onTransitionChange }: VideoTimelineProps) {
  const moveClip = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= clips.length) return;

    const newClips = [...clips];
    [newClips[index], newClips[newIndex]] = [newClips[newIndex], newClips[index]];
    newClips.forEach((c, i) => c.order = i);
    onReorder(newClips);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const totalDuration = clips.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Film className="w-4 h-4 text-cyan-400" />
            Timeline
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(totalDuration)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {clips.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Film className="w-10 h-10 mx-auto mb-2 opacity-50" />
            Ajoutez des clips depuis la bibliothèque
          </div>
        ) : (
          <div className="space-y-1">
            {clips.map((clip, index) => (
              <div key={clip.id}>
                {/* Transition selector (between clips) */}
                {index > 0 && (
                  <div className="flex items-center justify-center py-1">
                    <select
                      value={clip.transition || "none"}
                      onChange={(e) => onTransitionChange(clip.id, e.target.value)}
                      className="text-xs bg-muted border border-border rounded px-2 py-1 cursor-pointer hover:bg-muted/80"
                    >
                      {TRANSITIONS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.icon} {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Clip item */}
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border/50 hover:border-cyan-500/50 transition-colors group">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  
                  <div className="w-16 h-10 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded flex items-center justify-center">
                    <Film className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{clip.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(clip.duration_seconds)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveClip(index, "up")}
                      disabled={index === 0}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveClip(index, "down")}
                      disabled={index === clips.length - 1}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => onRemove(clip.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
