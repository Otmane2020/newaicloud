import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Upload, Sparkles, Download, Play, Settings } from "lucide-react";
import { useTranslation } from "@/lib/language";
import { ClipLibrary } from "./video-ads/ClipLibrary";
import { StoryboardEditor } from "./video-ads/StoryboardEditor";
import { EffectsPanel } from "./video-ads/EffectsPanel";
import { VideoPreview } from "./video-ads/VideoPreview";
import { TemplateGallery } from "./video-ads/TemplateGallery";
import { ScriptGenerator } from "./video-ads/ScriptGenerator";

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

export default function VideoAdsStudio() {
  const { t } = useTranslation();
  const [selectedClip, setSelectedClip] = useState<VideoClip | null>(null);
  const [storyboard, setStoryboard] = useState<StoryboardSection[]>([]);
  const [effects, setEffects] = useState<EffectsConfig>({
    glow: false,
    particles: false,
    zoom: false,
    holo: false,
    text3D: true,
    transitions: true,
  });
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [format, setFormat] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [activeTab, setActiveTab] = useState("studio");

  const handleApplyTemplate = (sections: StoryboardSection[]) => {
    setStoryboard(sections);
    const newTexts: Record<number, string> = {};
    sections.forEach((section, index) => {
      if (section.text) {
        newTexts[index] = section.text;
      }
    });
    setTexts(newTexts);
  };

  const handleApplyScript = (script: {
    hook: string;
    problem: string;
    solution: string;
    benefits: string[];
    cta: string;
  }) => {
    const newStoryboard: StoryboardSection[] = [
      { type: "hook", start: 0, end: 3, text: script.hook },
      { type: "problem", start: 3, end: 10, text: script.problem },
      { type: "solution", start: 10, end: 20, text: script.solution },
      { type: "result", start: 20, end: 25, text: script.benefits.join(" • ") },
      { type: "cta", start: 25, end: 30, text: script.cta, style: "glow_bounce" },
    ];
    setStoryboard(newStoryboard);
    const newTexts: Record<number, string> = {};
    newStoryboard.forEach((section, index) => {
      if (section.text) {
        newTexts[index] = section.text;
      }
    });
    setTexts(newTexts);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(240,10%,5%)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
            <Video className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
              Video Ads Studio
            </h1>
            <p className="text-muted-foreground">
              {t.superAdmin?.videoAds?.description || "Create professional video ads for NEWAI"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/50 backdrop-blur border">
          <TabsTrigger value="studio" className="gap-2">
            <Video className="w-4 h-4" />
            Studio
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="ai-script" className="gap-2">
            <Sparkles className="w-4 h-4" />
            AI Script
          </TabsTrigger>
        </TabsList>

        <TabsContent value="studio" className="space-y-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              <ClipLibrary onSelect={setSelectedClip} selectedClip={selectedClip} />
              <EffectsPanel effects={effects} onChange={setEffects} />
            </div>

            {/* Center Panel - Preview */}
            <div className="col-span-12 lg:col-span-6">
              <VideoPreview
                selectedClip={selectedClip}
                storyboard={storyboard}
                effects={effects}
                texts={texts}
                format={format}
              />

              {/* Format Selector */}
              <Card className="mt-4 bg-card/50 backdrop-blur border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Export Format</span>
                    <div className="flex gap-2">
                      <Button
                        variant={format === "9:16" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormat("9:16")}
                      >
                        📱 9:16
                      </Button>
                      <Button
                        variant={format === "1:1" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormat("1:1")}
                      >
                        ⬜ 1:1
                      </Button>
                      <Button
                        variant={format === "16:9" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormat("16:9")}
                      >
                        🖥️ 16:9
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              <StoryboardEditor
                storyboard={storyboard}
                onChange={setStoryboard}
                texts={texts}
                onTextsChange={setTexts}
              />
              
              <Button className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
                <Download className="w-4 h-4" />
                Export Video
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <TemplateGallery onApplyTemplate={handleApplyTemplate} />
        </TabsContent>

        <TabsContent value="ai-script">
          <ScriptGenerator onApplyScript={handleApplyScript} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
