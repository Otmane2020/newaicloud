import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Sparkles, Settings, Plus, Film, Wand2, Layers, Type, Image, Upload, Box, Music, Scissors, Download } from "lucide-react";
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
import { AudioLibrary } from "./video-ads/AudioLibrary";
import { TextEditor, TextOverlay } from "./video-ads/TextEditor";
import { MediaUploader, MediaFile } from "./video-ads/MediaUploader";
import { ToolsPanel } from "./video-ads/ToolsPanel";
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
  speed?: number;
  volume?: number;
}

interface AudioTrack {
  id: string;
  name: string;
  duration: number;
  startTime: number;
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

type SidebarPanel = "design" | "elements" | "text" | "brand" | "upload" | "tools" | "audio";

export default function VideoAdsStudio() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Core state
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
  
  // Format state
  const [inputFormat, setInputFormat] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [outputFormat, setOutputFormat] = useState<"9:16" | "1:1" | "16:9">("9:16");
  
  // Tab state
  const [activeTab, setActiveTab] = useState("studio");
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  
  // Montage state
  const [activePanel, setActivePanel] = useState<SidebarPanel>("design");
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<MediaFile[]>([]);
  const [audioLibraryOpen, setAudioLibraryOpen] = useState(false);
  const [selectedAnimation, setSelectedAnimation] = useState<string | null>(null);

  const totalDuration = timelineClips.reduce((sum, c) => sum + (c.duration_seconds || 5), 0);

  // Templates handlers
  const handleApplyTemplate = (sections: StoryboardSection[]) => {
    setStoryboard(sections);
    const newTexts: Record<number, string> = {};
    sections.forEach((section, index) => {
      if (section.text) {
        newTexts[index] = section.text;
      }
    });
    setTexts(newTexts);
    
    // Create text overlays from template
    const newOverlays: TextOverlay[] = sections.filter(s => s.text).map((section, idx) => ({
      id: `template-text-${idx}`,
      text: section.text || "",
      font: "Inter",
      size: 32,
      color: "#FFFFFF",
      position: { x: 50, y: 50 },
      align: "center",
      bold: true,
      italic: false,
      animation: section.animation || null,
      startTime: section.start,
      endTime: section.end,
    }));
    setTextOverlays(newOverlays);
    
    toast({ title: "Template appliqué", description: `${sections.length} sections ajoutées` });
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

  // Clip handlers
  const handleAddToTimeline = (clip: VideoClip) => {
    const newClip: TimelineClip = {
      ...clip,
      order: timelineClips.length,
      transition: "fade",
      duration_seconds: clip.duration_seconds || 5,
      speed: 1,
      volume: 100,
    };
    setTimelineClips([...timelineClips, newClip]);
    toast({ title: "Clip ajouté", description: clip.title });
  };

  const handleMediaAdd = (media: MediaFile) => {
    // Add to uploaded media list
    if (!uploadedMedia.find(m => m.id === media.id)) {
      setUploadedMedia([...uploadedMedia, media]);
    }
    
    // Add to timeline
    const newClip: TimelineClip = {
      id: media.id,
      title: media.name,
      file_url: media.url,
      thumbnail_url: media.thumbnailUrl,
      duration_seconds: media.duration || 5,
      category: media.type,
      order: timelineClips.length,
      transition: "fade",
      speed: 1,
      volume: 100,
    };
    setTimelineClips([...timelineClips, newClip]);
    toast({ title: "Média ajouté à la timeline", description: media.name });
  };

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

  const handleTimelineReorder = (clips: TimelineClip[]) => {
    setTimelineClips(clips);
  };

  const handleRemoveFromTimeline = (id: string) => {
    setTimelineClips(timelineClips.filter((c) => c.id !== id));
    if (selectedClipId === id) setSelectedClipId(null);
    toast({ title: "Clip supprimé" });
  };

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

  const handleTransitionChange = (id: string, transition: string) => {
    setTimelineClips(prev =>
      prev.map((c) => (c.id === id ? { ...c, transition } : c))
    );
    toast({ title: `Transition: ${transition}` });
  };

  // Tools handlers
  const handleTrim = (clipId: string, start: number, end: number) => {
    setTimelineClips(prev => prev.map(c => 
      c.id === clipId ? { ...c, duration_seconds: end - start } : c
    ));
  };

  const handleSplit = (clipId: string, time: number) => {
    const clip = timelineClips.find(c => c.id === clipId);
    if (!clip) return;
    
    const firstPart: TimelineClip = {
      ...clip,
      duration_seconds: time,
    };
    const secondPart: TimelineClip = {
      ...clip,
      id: `${clip.id}-split-${Date.now()}`,
      duration_seconds: (clip.duration_seconds || 5) - time,
      order: clip.order + 1,
    };
    
    const index = timelineClips.findIndex(c => c.id === clipId);
    const newClips = [...timelineClips];
    newClips.splice(index, 1, firstPart, secondPart);
    setTimelineClips(newClips.map((c, i) => ({ ...c, order: i })));
    toast({ title: "Clip divisé" });
  };

  const handleSpeedChange = (clipId: string, speed: number) => {
    setTimelineClips(prev => prev.map(c => 
      c.id === clipId ? { ...c, speed } : c
    ));
  };

  const handleVolumeChange = (clipId: string, volume: number) => {
    setTimelineClips(prev => prev.map(c => 
      c.id === clipId ? { ...c, volume } : c
    ));
  };

  // Audio handlers
  const handleSelectAudio = (audio: { id: string; name: string; duration: number }) => {
    const newTrack: AudioTrack = {
      id: `audio-${Date.now()}`,
      name: audio.name,
      duration: audio.duration,
      startTime: 0,
    };
    setAudioTracks([...audioTracks, newTrack]);
    toast({ title: "Audio ajouté", description: audio.name });
  };

  const handleRemoveAudio = (id: string) => {
    setAudioTracks(audioTracks.filter(t => t.id !== id));
    toast({ title: "Audio supprimé" });
  };

  // Animation handler
  const handleSelectAnimation = (animation: { id: string }) => {
    setSelectedAnimation(animation.id);
    if (selectedTextId) {
      setTextOverlays(prev => prev.map(t => 
        t.id === selectedTextId ? { ...t, animation: animation.id } : t
      ));
      toast({ title: "Animation appliquée" });
    }
  };

  // Export handler
  const handleExport = async (config: { resolution: string; format: string; quality: string }) => {
    if (timelineClips.length === 0) {
      toast({ title: "Ajoutez des clips à la timeline", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportComplete(false);

    const exportSpeed = 150;

    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setExportComplete(true);
          
          // Generate project JSON for download
          const projectData = {
            clips: timelineClips,
            texts: textOverlays,
            audio: audioTracks,
            config: {
              resolution: config.resolution,
              format: config.format,
              quality: config.quality,
              inputFormat,
              outputFormat,
            },
            exportedAt: new Date().toISOString(),
          };
          
          const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `video-project-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
          
          toast({ 
            title: "Export terminé!",
            description: "Le fichier projet a été téléchargé. L'encodage vidéo réel nécessite un backend."
          });
          return 100;
        }
        
        let increment = 2;
        if (prev < 20) increment = 3;
        else if (prev < 60) increment = 2;
        else if (prev < 85) increment = 1.5;
        else increment = 1;
        
        return Math.min(prev + increment, 100);
      });
    }, exportSpeed);
  };

  // Sidebar panels config
  const sidebarItems = [
    { id: "design" as const, icon: Layers, label: "Design" },
    { id: "elements" as const, icon: Box, label: "Éléments" },
    { id: "text" as const, icon: Type, label: "Texte" },
    { id: "brand" as const, icon: Image, label: "Marque" },
    { id: "upload" as const, icon: Upload, label: "Importer" },
    { id: "tools" as const, icon: Scissors, label: "Outils" },
    { id: "audio" as const, icon: Music, label: "Audio" },
  ];

  const selectedClipData = timelineClips.find(c => c.id === selectedClipId);

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
            <div className="col-span-12 lg:col-span-3 space-y-6">
              <ClipLibrary onSelect={setSelectedClip} selectedClip={selectedClip} />
              <EffectsPanel effects={effects} onChange={setEffects} />
            </div>

            <div className="col-span-12 lg:col-span-6">
              <VideoPreview
                selectedClip={selectedClip}
                storyboard={storyboard}
                effects={effects}
                texts={texts}
                format={inputFormat}
              />
              <Card className="mt-4 bg-card/50 backdrop-blur border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Format d'entrée</span>
                    <div className="flex gap-2">
                      {(["9:16", "1:1", "16:9"] as const).map((fmt) => (
                        <Button
                          key={fmt}
                          variant={inputFormat === fmt ? "default" : "outline"}
                          size="sm"
                          onClick={() => setInputFormat(fmt)}
                        >
                          {fmt === "9:16" ? "📱" : fmt === "1:1" ? "⬜" : "🖥️"} {fmt}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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

        {/* Montage Tab - Full Featured */}
        <TabsContent value="montage" className="h-[calc(100vh-200px)]">
          <div className="flex h-full gap-0 bg-[#0f0f1a] rounded-xl overflow-hidden">
            {/* Left Sidebar - Icon Navigation */}
            <div className="w-16 bg-[#1a1a2e] border-r border-white/5 flex flex-col items-center py-4 gap-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "audio") {
                      setAudioLibraryOpen(true);
                    } else {
                      setActivePanel(item.id);
                    }
                  }}
                  className={cn(
                    "w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-colors gap-0.5",
                    activePanel === item.id 
                      ? "bg-cyan-500/20 text-cyan-400" 
                      : "text-white/50 hover:bg-white/5 hover:text-white/80"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[9px]">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Left Panel - Dynamic Content */}
            <div className="w-72 bg-[#1a1a2e] border-r border-white/5 flex flex-col overflow-hidden">
              {activePanel === "design" && (
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/10">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-white/70">Générer le design</span>
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 overflow-y-auto">
                    <h3 className="text-xs font-medium text-white/50 mb-3">Clips disponibles</h3>
                    <ClipLibrary 
                      onSelect={(clip) => {
                        setSelectedClip(clip);
                        if (clip) handleAddToTimeline(clip);
                      }} 
                      selectedClip={selectedClip} 
                    />
                  </div>

                  <div className="p-4 border-t border-white/5">
                    <h3 className="text-xs font-medium text-white/50 mb-3">Modèles rapides</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: "Promo", sections: [{ type: "intro", start: 0, end: 3, text: "PROMO" }, { type: "main", start: 3, end: 12, text: "Découvrez notre produit" }, { type: "cta", start: 12, end: 15, text: "Achetez maintenant!" }] },
                        { name: "Story", sections: [{ type: "hook", start: 0, end: 2 }, { type: "content", start: 2, end: 13 }, { type: "end", start: 13, end: 15 }] },
                        { name: "Intro", sections: [{ type: "logo", start: 0, end: 2 }, { type: "title", start: 2, end: 5, text: "Titre" }] },
                        { name: "Outro", sections: [{ type: "thanks", start: 0, end: 3, text: "Merci!" }, { type: "logo", start: 3, end: 5 }] },
                      ].map((template) => (
                        <div 
                          key={template.name}
                          onClick={() => handleApplyTemplate(template.sections)}
                          className="aspect-video rounded bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center cursor-pointer hover:ring-1 hover:ring-white/20 transition-all"
                        >
                          <span className="text-[10px] text-white/60">{template.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePanel === "elements" && (
                <AnimationsPanel 
                  onSelectAnimation={handleSelectAnimation}
                  selectedAnimationId={selectedAnimation}
                />
              )}

              {activePanel === "text" && (
                <TextEditor
                  texts={textOverlays}
                  onTextsChange={setTextOverlays}
                  selectedTextId={selectedTextId}
                  onSelectText={setSelectedTextId}
                  totalDuration={totalDuration || 30}
                />
              )}

              {activePanel === "brand" && (
                <div className="p-4">
                  <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                    <Image className="w-4 h-4 text-purple-400" />
                    Marque & Logo
                  </h3>
                  <div className="space-y-4">
                    <div 
                      className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-white/40 transition-colors"
                      onClick={() => toast({ title: "Upload logo", description: "Fonctionnalité bientôt disponible" })}
                    >
                      <Upload className="w-8 h-8 mx-auto mb-2 text-white/40" />
                      <p className="text-sm text-white/50">Importer votre logo</p>
                      <p className="text-xs text-white/30 mt-1">PNG, SVG recommandé</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {["Coin haut-gauche", "Coin haut-droit", "Coin bas-gauche", "Coin bas-droit"].map((pos) => (
                        <Button key={pos} variant="outline" size="sm" className="text-xs border-white/10 text-white/70 hover:bg-white/5">
                          {pos}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePanel === "upload" && (
                <MediaUploader 
                  onMediaAdd={handleMediaAdd}
                  uploadedMedia={uploadedMedia}
                />
              )}

              {activePanel === "tools" && (
                <ToolsPanel
                  selectedClipId={selectedClipId}
                  onTrim={handleTrim}
                  onSplit={handleSplit}
                  onDuplicate={(id) => {
                    const clip = timelineClips.find(c => c.id === id);
                    if (clip) handleDuplicateClip({
                      id: clip.id,
                      title: clip.title,
                      duration: clip.duration_seconds || 5,
                      thumbnailUrl: clip.thumbnail_url,
                      videoUrl: clip.file_url
                    });
                  }}
                  onDelete={handleRemoveFromTimeline}
                  onSpeedChange={handleSpeedChange}
                  onVolumeChange={handleVolumeChange}
                  clipDuration={selectedClipData?.duration_seconds || 10}
                  clipSpeed={selectedClipData?.speed || 1}
                  clipVolume={selectedClipData?.volume || 100}
                />
              )}
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
                  transition: c.transition,
                  speed: c.speed,
                  volume: c.volume
                }))}
                texts={textOverlays}
                audioTracks={audioTracks}
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
                onSelectClip={setSelectedClipId}
                selectedClipId={selectedClipId}
                onRemoveAudio={handleRemoveAudio}
                onSelectText={setSelectedTextId}
                selectedTextId={selectedTextId}
              />
            </div>

            {/* Right Panel - Export */}
            <div className="w-80 bg-[#1a1a2e] border-l border-white/5 overflow-y-auto">
              <ExportPanel
                onExport={handleExport}
                isExporting={isExporting}
                progress={exportProgress}
                clips={timelineClips}
                exportComplete={exportComplete}
                inputAspect={inputFormat}
                outputAspect={outputFormat}
                onInputAspectChange={setInputFormat}
                onOutputAspectChange={setOutputFormat}
              />
            </div>
          </div>

          {/* Audio Library Dialog */}
          <AudioLibrary
            open={audioLibraryOpen}
            onClose={() => setAudioLibraryOpen(false)}
            onSelectAudio={handleSelectAudio}
          />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <TemplateGallery onApplyTemplate={handleApplyTemplate} />
        </TabsContent>

        {/* AI Script Tab */}
        <TabsContent value="ai-script">
          <ScriptGenerator onApplyScript={handleApplyScript} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
