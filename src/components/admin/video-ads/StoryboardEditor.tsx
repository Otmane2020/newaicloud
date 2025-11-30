import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, Zap, AlertCircle, Lightbulb, Trophy, MousePointer } from "lucide-react";

interface StoryboardSection {
  type: string;
  start: number;
  end: number;
  text?: string;
  animation?: string;
  style?: string;
}

interface StoryboardEditorProps {
  storyboard: StoryboardSection[];
  onChange: (storyboard: StoryboardSection[]) => void;
  texts: Record<number, string>;
  onTextsChange: (texts: Record<number, string>) => void;
}

const SECTION_TYPES = [
  { type: "hook", label: "Hook", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/20" },
  { type: "problem", label: "Problem", icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/20" },
  { type: "solution", label: "Solution", icon: Lightbulb, color: "text-cyan-400", bg: "bg-cyan-500/20" },
  { type: "result", label: "Result", icon: Trophy, color: "text-green-400", bg: "bg-green-500/20" },
  { type: "cta", label: "CTA", icon: MousePointer, color: "text-purple-400", bg: "bg-purple-500/20" },
];

export function StoryboardEditor({
  storyboard,
  onChange,
  texts,
  onTextsChange,
}: StoryboardEditorProps) {
  const addSection = (type: string) => {
    const lastSection = storyboard[storyboard.length - 1];
    const start = lastSection ? lastSection.end : 0;
    const duration = type === "hook" ? 3 : type === "cta" ? 5 : 7;
    
    onChange([
      ...storyboard,
      { type, start, end: start + duration },
    ]);
  };

  const removeSection = (index: number) => {
    const newStoryboard = storyboard.filter((_, i) => i !== index);
    onChange(newStoryboard);
    
    const newTexts = { ...texts };
    delete newTexts[index];
    // Reindex texts
    const reindexedTexts: Record<number, string> = {};
    Object.keys(newTexts).forEach((key) => {
      const numKey = parseInt(key);
      if (numKey > index) {
        reindexedTexts[numKey - 1] = newTexts[numKey];
      } else {
        reindexedTexts[numKey] = newTexts[numKey];
      }
    });
    onTextsChange(reindexedTexts);
  };

  const updateText = (index: number, value: string) => {
    onTextsChange({ ...texts, [index]: value });
  };

  const getSectionConfig = (type: string) => {
    return SECTION_TYPES.find((s) => s.type === type) || SECTION_TYPES[0];
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">⏱️ Storyboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add Section Buttons */}
        <div className="flex flex-wrap gap-1">
          {SECTION_TYPES.map(({ type, label, icon: Icon, color }) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              className="gap-1 text-xs h-7"
              onClick={() => addSection(type)}
            >
              <Plus className="w-3 h-3" />
              <Icon className={`w-3 h-3 ${color}`} />
              {label}
            </Button>
          ))}
        </div>

        {/* Timeline Sections */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {storyboard.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Add sections to build your video timeline
            </p>
          ) : (
            storyboard.map((section, index) => {
              const config = getSectionConfig(section.type);
              const Icon = config.icon;
              
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border border-border/50 ${config.bg}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {section.start}s - {section.end}s
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSection(index)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <Input
                    placeholder={`Enter ${config.label.toLowerCase()} text...`}
                    value={texts[index] || section.text || ""}
                    onChange={(e) => updateText(index, e.target.value)}
                    className="h-8 text-sm bg-background/50"
                  />
                </div>
              );
            })
          )}
        </div>

        {storyboard.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Total Duration</span>
              <span className="font-medium">
                {storyboard.length > 0
                  ? `${storyboard[storyboard.length - 1].end}s`
                  : "0s"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
