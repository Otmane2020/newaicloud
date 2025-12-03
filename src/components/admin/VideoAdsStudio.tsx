import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Sparkles, Settings, Plus, Film } from "lucide-react";
import { useTranslation } from "@/lib/language";
import { ClipLibrary } from "./video-ads/ClipLibrary";
import { StoryboardEditor } from "./video-ads/StoryboardEditor";
import { EffectsPanel } from "./video-ads/EffectsPanel";
import { VideoPreview } from "./video-ads/VideoPreview";
import { TemplateGallery } from "./video-ads/TemplateGallery";
import { ScriptGenerator } from "./video-ads/ScriptGenerator";
import { VideoTimeline } from "./video-ads/VideoTimeline";
import { ExportPanel } from "./video-ads/ExportPanel";
import { useToast } from "@/hooks/use-toast";

interface VideoClip {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  category: string;
}

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
  const { toast } = useToast();
  const [selectedClip, setSelectedClip] = useState<VideoClip | null>(null);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

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

  // Add clip to timeline
  const handleAddToTimeline = (clip: VideoClip) => {
    const newClip: TimelineClip = {
      ...clip,
      order: timelineClips.length,
      transition: "fade",
      duration_seconds: clip.duration_seconds || 5,
    };
    setTimelineClips([...timelineClips, newClip]);
    toast({ title: "Clip ajouté à la timeline" });
  };

  // Handle timeline reorder
  const handleTimelineReorder = (clips: TimelineClip[]) => {
    setTimelineClips(clips);
  };

  // Remove clip from timeline
  const handleRemoveFromTimeline = (id: string) => {
    setTimelineClips(timelineClips.filter((c) => c.id !== id));
  };

  // Change transition
  const handleTransitionChange = (id: string, transition: string) => {
    setTimelineClips(
      timelineClips.map((c) => (c.id === id ? { ...c, transition } : c))
    );
  };

  // Export video
  const handleExport = async (config: { resolution: string; format: string; quality: string }) => {
    if (timelineClips.length === 0) {
      toast({ title: "Ajoutez des clips à la timeline", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          toast({ title: `Vidéo exportée en ${config.resolution} ${config.format.toUpperCase()}` });
          return 100;
        }
        return prev + 5;
      });
    }, 200);
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
              {t.superAdmin?.videoAds?.description || "Créez des vidéos publicitaires professionnelles"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Paramètres
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/50 backdrop-blur border">
          <TabsTrigger value="studio" className="gap-2">
            <Video className="w-4 h-4" />
            Studio
          </TabsTrigger>
          <TabsTrigger value="montage" className="gap-2">
            <Film className="w-4 h-4" />
            Montage
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

        {/* Studio Tab */}
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
                    <span className="text-sm font-medium">Format d'export</span>
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
            </div>
          </div>
        </TabsContent>

        {/* Montage Tab - NEW */}
        <TabsContent value="montage" className="space-y-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left - Clip Library with Add button */}
            <div className="col-span-12 lg:col-span-3 space-y-4">
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Film className="w-4 h-4 text-cyan-400" />
                    Bibliothèque
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ClipLibrary 
                    onSelect={(clip) => {
                      setSelectedClip(clip);
                      if (clip) handleAddToTimeline(clip);
                    }} 
                    selectedClip={selectedClip} 
                  />
                </CardContent>
              </Card>
            </div>

            {/* Center - Timeline */}
            <div className="col-span-12 lg:col-span-6 space-y-4">
              <VideoTimeline
                clips={timelineClips}
                onReorder={handleTimelineReorder}
                onRemove={handleRemoveFromTimeline}
                onTransitionChange={handleTransitionChange}
              />

              {/* Preview of first clip */}
              {timelineClips.length > 0 && (
                <VideoPreview
                  selectedClip={timelineClips[0]}
                  storyboard={[]}
                  effects={effects}
                  texts={{}}
                  format={format}
                />
              )}
            </div>

            {/* Right - Export Panel */}
            <div className="col-span-12 lg:col-span-3 space-y-4">
              <ExportPanel
                onExport={handleExport}
                isExporting={isExporting}
                progress={exportProgress}
                disabled={timelineClips.length === 0}
              />

              {/* Format */}
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="p-4 space-y-3">
                  <span className="text-sm font-medium">Format</span>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={format === "9:16" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormat("9:16")}
                      className="text-xs"
                    >
                      9:16
                    </Button>
                    <Button
                      variant={format === "1:1" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormat("1:1")}
                      className="text-xs"
                    >
                      1:1
                    </Button>
                    <Button
                      variant={format === "16:9" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormat("16:9")}
                      className="text-xs"
                    >
                      16:9
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <EffectsPanel effects={effects} onChange={setEffects} />
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
