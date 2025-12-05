import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Download, Monitor, Smartphone, Film, Loader2, Check, AlertCircle, FileVideo, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportConfig {
  resolution: "720p" | "1080p" | "4k";
  format: "mp4" | "webm" | "mov";
  quality: "standard" | "high" | "ultra";
  inputAspect: "9:16" | "1:1" | "16:9";
  outputAspect: "9:16" | "1:1" | "16:9";
}

interface ExportPanelProps {
  onExport: (config: ExportConfig) => void;
  isExporting?: boolean;
  progress?: number;
  disabled?: boolean;
  clips?: any[];
  exportComplete?: boolean;
  exportedVideoUrl?: string;
  inputAspect?: "9:16" | "1:1" | "16:9";
  outputAspect?: "9:16" | "1:1" | "16:9";
  onInputAspectChange?: (aspect: "9:16" | "1:1" | "16:9") => void;
  onOutputAspectChange?: (aspect: "9:16" | "1:1" | "16:9") => void;
}

const RESOLUTIONS = [
  { id: "720p", label: "HD", dimensions: "1280×720", icon: Smartphone, size: "~50 MB" },
  { id: "1080p", label: "Full HD", dimensions: "1920×1080", icon: Monitor, size: "~150 MB" },
  { id: "4k", label: "4K UHD", dimensions: "3840×2160", icon: Film, size: "~500 MB" },
];

const FORMATS = [
  { id: "mp4", label: "MP4", description: "Meilleure compatibilité", codec: "H.264" },
  { id: "webm", label: "WebM", description: "Web optimisé", codec: "VP9" },
  { id: "mov", label: "MOV", description: "Qualité Pro (Apple)", codec: "ProRes" },
];

const QUALITIES = [
  { id: "standard", label: "Standard", bitrate: "8 Mbps", desc: "Bon pour le web" },
  { id: "high", label: "Haute", bitrate: "16 Mbps", desc: "Qualité HD" },
  { id: "ultra", label: "Ultra", bitrate: "32 Mbps", desc: "Broadcast" },
];

const ASPECT_RATIOS = [
  { id: "9:16", label: "9:16", icon: "📱", desc: "Mobile/Story" },
  { id: "1:1", label: "1:1", icon: "⬜", desc: "Instagram" },
  { id: "16:9", label: "16:9", icon: "🖥️", desc: "YouTube/TV" },
];

export function ExportPanel({ 
  onExport, 
  isExporting, 
  progress = 0, 
  disabled,
  clips = [],
  exportComplete = false,
  exportedVideoUrl,
  inputAspect = "9:16",
  outputAspect = "9:16",
  onInputAspectChange,
  onOutputAspectChange
}: ExportPanelProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<ExportConfig>({
    resolution: "1080p",
    format: "mp4",
    quality: "high",
    inputAspect: inputAspect,
    outputAspect: outputAspect,
  });

  // Sync external aspect changes
  React.useEffect(() => {
    setConfig(prev => ({ ...prev, inputAspect, outputAspect }));
  }, [inputAspect, outputAspect]);

  const handleExport = () => {
    if (clips.length === 0) {
      toast({
        title: "Aucun clip",
        description: "Ajoutez des clips à la timeline avant d'exporter",
        variant: "destructive"
      });
      return;
    }
    onExport(config);
  };

  const handleDownload = () => {
    // In a real implementation, this would download the actual video
    // For now, we'll simulate by creating a download prompt
    const filename = `video_export_${config.resolution}_${config.quality}.${config.format}`;
    
    if (exportedVideoUrl) {
      const link = document.createElement('a');
      link.href = exportedVideoUrl;
      link.download = filename;
      link.click();
    } else {
      // Simulate download with a blob
      toast({
        title: "Téléchargement démarré",
        description: `${filename} - Cette fonctionnalité nécessite un backend d'encodage vidéo`
      });
    }
  };

  const estimatedSize = () => {
    const qualityMultiplier = config.quality === "ultra" ? 2 : config.quality === "high" ? 1.5 : 1;
    const resMultiplier = config.resolution === "4k" ? 4 : config.resolution === "1080p" ? 2 : 1;
    
    // Base size per minute based on format
    const basePerMin = config.format === "mov" ? 100 : config.format === "webm" ? 30 : 50;
    const durationMin = totalDuration / 60;
    
    const sizeMB = Math.round(basePerMin * resMultiplier * qualityMultiplier * Math.max(durationMin, 0.5));
    
    if (sizeMB >= 1000) {
      return `~${(sizeMB / 1000).toFixed(1)} GB`;
    }
    return `~${sizeMB} MB`;
  };

  const totalDuration = clips.reduce((acc, clip) => acc + (clip.duration_seconds || 5), 0);

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="w-4 h-4 text-cyan-400" />
          Export Vidéo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clips info */}
        {clips.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Clips à exporter</span>
              <span className="font-medium">{clips.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Durée totale</span>
              <span className="font-medium">{Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        )}

        {/* Export Complete - Download Section */}
        {exportComplete && !isExporting && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 space-y-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Check className="w-5 h-5" />
              <span className="font-medium">Export terminé!</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileVideo className="w-4 h-4" />
              <span>video_export_{config.resolution}_{config.quality}.{config.format}</span>
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
                Télécharger
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  toast({ title: "Lien copié", description: "Le lien de téléchargement a été copié" });
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Input Aspect Ratio */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">INPUT</span>
            Format source
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <Button
                key={`input-${ratio.id}`}
                variant={config.inputAspect === ratio.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setConfig({ ...config, inputAspect: ratio.id as any });
                  onInputAspectChange?.(ratio.id as any);
                }}
                className={`flex flex-col gap-1 h-auto py-2 ${
                  config.inputAspect === ratio.id ? "bg-blue-600 hover:bg-blue-700" : ""
                }`}
              >
                <span className="text-lg">{ratio.icon}</span>
                <span className="text-xs font-medium">{ratio.label}</span>
                <span className="text-[10px] opacity-70">{ratio.desc}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Output Aspect Ratio */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">OUTPUT</span>
            Format export
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <Button
                key={`output-${ratio.id}`}
                variant={config.outputAspect === ratio.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setConfig({ ...config, outputAspect: ratio.id as any });
                  onOutputAspectChange?.(ratio.id as any);
                }}
                className={`flex flex-col gap-1 h-auto py-2 ${
                  config.outputAspect === ratio.id ? "bg-green-600 hover:bg-green-700" : ""
                }`}
              >
                <span className="text-lg">{ratio.icon}</span>
                <span className="text-xs font-medium">{ratio.label}</span>
                <span className="text-[10px] opacity-70">{ratio.desc}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Résolution</Label>
          <RadioGroup
            value={config.resolution}
            onValueChange={(v) => setConfig({ ...config, resolution: v as any })}
            className="grid grid-cols-3 gap-2"
          >
            {RESOLUTIONS.map((res) => (
              <Label
                key={res.id}
                htmlFor={`res-${res.id}`}
                className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-all ${
                  config.resolution === res.id
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-border/50 hover:border-border"
                }`}
              >
                <RadioGroupItem value={res.id} id={`res-${res.id}`} className="sr-only" />
                <res.icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{res.label}</span>
                <span className="text-[10px] text-muted-foreground">{res.dimensions}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Format</Label>
          <RadioGroup
            value={config.format}
            onValueChange={(v) => setConfig({ ...config, format: v as any })}
            className="space-y-1"
          >
            {FORMATS.map((fmt) => (
              <Label
                key={fmt.id}
                htmlFor={`fmt-${fmt.id}`}
                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                  config.format === fmt.id
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-border/50 hover:border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={fmt.id} id={`fmt-${fmt.id}`} />
                  <div>
                    <span className="text-sm font-medium">{fmt.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">({fmt.codec})</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{fmt.description}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        {/* Quality */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Qualité</Label>
          <div className="flex gap-2">
            {QUALITIES.map((q) => (
              <Button
                key={q.id}
                variant={config.quality === q.id ? "default" : "outline"}
                size="sm"
                onClick={() => setConfig({ ...config, quality: q.id as any })}
                className="flex-1 flex-col h-auto py-2"
              >
                <span className="text-xs font-medium">{q.label}</span>
                <span className="text-[10px] opacity-70">{q.bitrate}</span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {QUALITIES.find((q) => q.id === config.quality)?.desc}
          </p>
        </div>

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Export en cours...
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {progress < 30 && "Préparation des clips..."}
              {progress >= 30 && progress < 60 && "Encodage vidéo..."}
              {progress >= 60 && progress < 90 && "Application des transitions..."}
              {progress >= 90 && "Finalisation..."}
            </p>
          </div>
        )}

        {/* Warning for 4K */}
        {config.resolution === "4k" && !isExporting && !exportComplete && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              L'export 4K peut prendre plusieurs minutes selon la durée de la vidéo.
            </p>
          </div>
        )}

        {/* Export Button */}
        {!exportComplete && (
          <Button
            className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
            onClick={handleExport}
            disabled={disabled || isExporting || clips.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Export en cours...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exporter la vidéo
              </>
            )}
          </Button>
        )}

        {/* New Export Button after completion */}
        {exportComplete && !isExporting && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleExport}
            disabled={clips.length === 0}
          >
            <Download className="w-4 h-4" />
            Nouvel export
          </Button>
        )}

        {/* Export Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {config.resolution} • {config.format.toUpperCase()} • {config.quality}
          </Badge>
          <span>{estimatedSize()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
