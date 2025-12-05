import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Sparkles, Settings, Plus, Film, Wand2, Layers, Type, Image, Upload, Box, Music, Scissors } from "lucide-react";
import { useTranslation } from "@/lib/language";
import { ClipLibrary } from "./video-ads/ClipLibrary";
import { StoryboardEditor } from "./video-ads/StoryboardEditor";
import { EffectsPanel } from "./video-ads/EffectsPanel";
import { VideoPreview } from "./video-ads/VideoPreview";
import { TemplateGallery } from "./video-ads/TemplateGallery";
import { ScriptGenerator } from "./video-ads/ScriptGenerator";
import { CanvaStyleTimeline } from "./video-ads/CanvaStyleTimeline";
import { AnimationsPanel } from "./video-ads/AnimationsPanel";
import { ExportPanel } from "./video-ads/ExportPanel";
import { AIVideoGenerator } from "./video-ads/AIVideoGenerator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [inputFormat, setInputFormat] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [outputFormat, setOutputFormat] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [activeTab, setActiveTab] = useState("studio");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);

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

  // Handle AI generated video
  const handleAIVideoGenerated = (videoUrl: string, title: string) => {
    const newClip: VideoClip = {
      id: `ai-${Date.now()}`,
      title: title || "AI Generated",
      file_url: videoUrl,
      duration_seconds: 4,
      category: "ai-generated",
    };
    setSelectedClip(newClip);
    handleAddToTimeline(newClip);
  };

  // Handle timeline reorder
  const handleTimelineReorder = (clips: TimelineClip[]) => {
    setTimelineClips(clips);
  };

  // Remove clip from timeline
  const handleRemoveFromTimeline = (id: string) => {
    setTimelineClips(timelineClips.filter((c) => c.id !== id));
    toast({ title: "Clip supprimé de la timeline" });
  };

  // Duplicate clip in timeline
  const handleDuplicateClip = (clip: { id: string; title: string; duration: number; thumbnailUrl?: string; videoUrl: string }) => {
    const sourceClip = timelineClips.find(c => c.id === clip.id);
    if (sourceClip) {
      const newClip: TimelineClip = {
        ...sourceClip,
        id: `${sourceClip.id}-copy-${Date.now()}`,
        order: timelineClips.length,
      };
      setTimelineClips([...timelineClips, newClip]);
      toast({ title: "Clip dupliqué" });
    }
  };

  // Change transition
  const handleTransitionChange = (id: string, transition: string) => {
    console.log(`[VideoAdsStudio] Transition changed for ${id}: ${transition}`);
    setTimelineClips(prev =>
      prev.map((c) => (c.id === id ? { ...c, transition } : c))
    );
    toast({ title: `Transition: ${transition}`, description: "Transition mise à jour" });
  };

  // Export video with quality settings
  const handleExport = async (config: { resolution: string; format: string; quality: string }) => {
    if (timelineClips.length === 0) {
      toast({ title: "Ajoutez des clips à la timeline", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportComplete(false);

    // Calculate export speed based on quality settings
    const qualityMultiplier = config.quality === "ultra" ? 3 : config.quality === "high" ? 2 : 1;
    const resolutionMultiplier = config.resolution === "4k" ? 4 : config.resolution === "1080p" ? 2 : 1;
    const baseSpeed = 300; // Base ms per step
    const exportSpeed = Math.max(100, baseSpeed / (qualityMultiplier * resolutionMultiplier / 2));

    // Get bitrate based on quality
    const bitrates = { standard: "8 Mbps", high: "16 Mbps", ultra: "32 Mbps" };
    const resolutions = { "720p": "1280×720", "1080p": "1920×1080", "4k": "3840×2160" };

    // Calculate total duration and transitions
    const totalDuration = timelineClips.reduce((sum, c) => sum + (c.duration_seconds || 5), 0);
    const transitionsCount = timelineClips.filter((c, i) => i > 0 && c.transition && c.transition !== "none").length;

    console.log(`[Export] Starting export:
      - Resolution: ${config.resolution} (${resolutions[config.resolution as keyof typeof resolutions]})
      - Format: ${config.format.toUpperCase()}
      - Quality: ${config.quality} (${bitrates[config.quality as keyof typeof bitrates]})
      - Clips: ${timelineClips.length}
      - Transitions: ${transitionsCount}
      - Total Duration: ${totalDuration}s
    `);

    // Simulate export progress with realistic steps
    let currentProgress = 0;
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setExportComplete(true);
          
          // Generate mock download
          const exportData = {
            resolution: resolutions[config.resolution as keyof typeof resolutions] || config.resolution,
            format: config.format,
            quality: config.quality,
            bitrate: bitrates[config.quality as keyof typeof bitrates],
            duration: totalDuration,
            clips: timelineClips.length,
            transitions: transitionsCount,
            inputAspect: inputFormat,
            outputAspect: outputFormat
          };
          
          console.log(`[Export] Complete:`, exportData);
          
          toast({ 
            title: "Vidéo exportée avec succès",
            description: `${config.resolution} • ${config.format.toUpperCase()} • ${config.quality} (${bitrates[config.quality as keyof typeof bitrates]})`
          });
          return 100;
        }
        
        // Variable progress increments based on stage
        let increment = 2;
        if (prev < 20) increment = 3; // Preparation fast
        else if (prev < 60) increment = 2; // Encoding medium
        else if (prev < 85) increment = 1.5; // Transitions slower
        else increment = 1; // Finalization slowest
        
        return Math.min(prev + increment, 100);
      });
    }, exportSpeed);
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
          <AIVideoGenerator onVideoGenerated={handleAIVideoGenerated} />
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
                format={inputFormat}
              />

              {/* Format Selector */}
              <Card className="mt-4 bg-card/50 backdrop-blur border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Format d'entrée</span>
                    <div className="flex gap-2">
                      <Button
                        variant={inputFormat === "9:16" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setInputFormat("9:16")}
                      >
                        📱 9:16
                      </Button>
                      <Button
                        variant={inputFormat === "1:1" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setInputFormat("1:1")}
                      >
                        ⬜ 1:1
                      </Button>
                      <Button
                        variant={inputFormat === "16:9" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setInputFormat("16:9")}
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

        {/* Montage Tab - Canva Style */}
        <TabsContent value="montage" className="h-[calc(100vh-200px)]">
          <div className="flex h-full gap-0 bg-[#0f0f1a] rounded-xl overflow-hidden">
            {/* Left Sidebar - Icon Navigation */}
            <div className="w-16 bg-[#1a1a2e] border-r border-white/5 flex flex-col items-center py-4 gap-1">
              {[
                { icon: Layers, label: "Design", active: true },
                { icon: Box, label: "Éléments" },
                { icon: Type, label: "Texte" },
                { icon: Image, label: "Marque" },
                { icon: Upload, label: "Importer" },
                { icon: Scissors, label: "Outils" },
                { icon: Music, label: "Audio" },
              ].map((item, idx) => (
                <button
                  key={idx}
                  className={cn(
                    "w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-colors gap-0.5",
                    item.active 
                      ? "bg-cyan-500/20 text-cyan-400" 
                      : "text-white/50 hover:bg-white/5 hover:text-white/80"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[9px]">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Left Panel - Library */}
            <div className="w-72 bg-[#1a1a2e] border-r border-white/5 flex flex-col">
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-white/70">Générer le design</span>
                </div>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto">
                <h3 className="text-xs font-medium text-white/50 mb-3">Clips disponibles</h3>
                <div className="grid grid-cols-2 gap-2">
                  <ClipLibrary 
                    onSelect={(clip) => {
                      setSelectedClip(clip);
                      if (clip) handleAddToTimeline(clip);
                    }} 
                    selectedClip={selectedClip} 
                  />
                </div>
              </div>

              {/* Templates */}
              <div className="p-4 border-t border-white/5">
                <h3 className="text-xs font-medium text-white/50 mb-3">Modèles</h3>
                <div className="grid grid-cols-2 gap-2">
                  {["Promo", "Story", "Intro", "Outro"].map((name) => (
                    <div 
                      key={name}
                      className="aspect-video rounded bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center cursor-pointer hover:ring-1 hover:ring-white/20"
                    >
                      <span className="text-[10px] text-white/60">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center - Preview & Timeline */}
            <div className="flex-1 flex flex-col min-w-0">
              <CanvaStyleTimeline
                clips={timelineClips.map(c => ({
                  id: c.id,
                  title: c.title,
                  duration: c.duration_seconds || 5,
                  thumbnailUrl: c.thumbnail_url,
                  videoUrl: c.file_url,
                  transition: c.transition
                }))}
                format={inputFormat}
                onReorder={(fromIdx, toIdx) => {
                  const newClips = [...timelineClips];
                  const [removed] = newClips.splice(fromIdx, 1);
                  newClips.splice(toIdx, 0, removed);
                  handleTimelineReorder(newClips.map((c, i) => ({ ...c, order: i })));
                }}
                onRemove={handleRemoveFromTimeline}
                onDuplicate={handleDuplicateClip}
                onTransitionChange={handleTransitionChange}
              />
            </div>

            {/* Right Panel - Export */}
            <div className="w-72 bg-[#1a1a2e] border-l border-white/5 overflow-y-auto">
              <ExportPanel
                onExport={handleExport}
                isExporting={isExporting}
                progress={exportProgress}
                disabled={timelineClips.length === 0}
                clips={timelineClips}
                exportComplete={exportComplete}
                inputAspect={inputFormat}
                outputAspect={outputFormat}
                onInputAspectChange={setInputFormat}
                onOutputAspectChange={setOutputFormat}
              />
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
