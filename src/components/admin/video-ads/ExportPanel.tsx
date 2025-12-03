import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Download, Monitor, Smartphone, Film, Loader2, Check } from "lucide-react";

interface ExportConfig {
  resolution: "720p" | "1080p" | "4k";
  format: "mp4" | "webm" | "mov";
  quality: "standard" | "high" | "ultra";
}

interface ExportPanelProps {
  onExport: (config: ExportConfig) => void;
  isExporting?: boolean;
  progress?: number;
  disabled?: boolean;
}

const RESOLUTIONS = [
  { id: "720p", label: "HD 720p", dimensions: "1280×720", icon: Smartphone },
  { id: "1080p", label: "Full HD 1080p", dimensions: "1920×1080", icon: Monitor },
  { id: "4k", label: "4K Ultra HD", dimensions: "3840×2160", icon: Film },
];

const FORMATS = [
  { id: "mp4", label: "MP4", description: "Meilleure compatibilité" },
  { id: "webm", label: "WebM", description: "Web optimisé" },
  { id: "mov", label: "MOV", description: "Qualité Pro" },
];

const QUALITIES = [
  { id: "standard", label: "Standard", bitrate: "8 Mbps" },
  { id: "high", label: "Haute", bitrate: "16 Mbps" },
  { id: "ultra", label: "Ultra", bitrate: "32 Mbps" },
];

export function ExportPanel({ onExport, isExporting, progress = 0, disabled }: ExportPanelProps) {
  const [config, setConfig] = useState<ExportConfig>({
    resolution: "1080p",
    format: "mp4",
    quality: "high",
  });

  const handleExport = () => {
    onExport(config);
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="w-4 h-4 text-cyan-400" />
          Export Vidéo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  <span className="text-sm font-medium">{fmt.label}</span>
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
                className="flex-1"
              >
                <span className="text-xs">{q.label}</span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Bitrate: {QUALITIES.find((q) => q.id === config.quality)?.bitrate}
          </p>
        </div>

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Export en cours...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Export Button */}
        <Button
          className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
          onClick={handleExport}
          disabled={disabled || isExporting}
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

        {/* Export Info */}
        <div className="text-center">
          <Badge variant="outline" className="text-[10px]">
            {config.resolution} • {config.format.toUpperCase()} • {config.quality}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
