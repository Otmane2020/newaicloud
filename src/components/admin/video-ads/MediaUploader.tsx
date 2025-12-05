import { useState, useRef } from "react";
import { Upload, Image, Film, X, Loader2, Check, FileVideo, FileImage, Link, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface MediaFile {
  id: string;
  name: string;
  type: "video" | "image";
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  size?: number;
}

interface MediaUploaderProps {
  onMediaAdd: (media: MediaFile) => void;
  uploadedMedia: MediaFile[];
}

// Sample stock media for demo
const STOCK_VIDEOS = [
  { id: "stock-1", name: "Abstract Waves", type: "video" as const, url: "", thumbnailUrl: "", duration: 10 },
  { id: "stock-2", name: "City Timelapse", type: "video" as const, url: "", thumbnailUrl: "", duration: 15 },
  { id: "stock-3", name: "Nature Scene", type: "video" as const, url: "", thumbnailUrl: "", duration: 8 },
  { id: "stock-4", name: "Tech Background", type: "video" as const, url: "", thumbnailUrl: "", duration: 12 },
];

const STOCK_IMAGES = [
  { id: "img-1", name: "Gradient Blue", type: "image" as const, url: "", thumbnailUrl: "" },
  { id: "img-2", name: "Abstract Pattern", type: "image" as const, url: "", thumbnailUrl: "" },
  { id: "img-3", name: "Minimalist White", type: "image" as const, url: "", thumbnailUrl: "" },
  { id: "img-4", name: "Dark Texture", type: "image" as const, url: "", thumbnailUrl: "" },
];

export const MediaUploader = ({ onMediaAdd, uploadedMedia }: MediaUploaderProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (!isVideo && !isImage) {
        toast({
          title: "Format non supporté",
          description: `${file.name} n'est pas un fichier vidéo ou image valide`,
          variant: "destructive"
        });
        continue;
      }

      // Create local URL for preview
      const url = URL.createObjectURL(file);
      
      // Get video duration if it's a video
      let duration = 5;
      if (isVideo) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = url;
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            duration = video.duration;
            resolve();
          };
          video.onerror = () => resolve();
        });
      }

      const media: MediaFile = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: isVideo ? "video" : "image",
        url,
        thumbnailUrl: isImage ? url : undefined,
        duration: isVideo ? Math.round(duration) : 5,
        size: file.size
      };

      onMediaAdd(media);
      
      toast({
        title: "Média ajouté",
        description: `${file.name} a été importé avec succès`
      });
    }

    setIsUploading(false);
  };

  const handleUrlImport = () => {
    if (!urlInput.trim()) return;

    const isVideo = /\.(mp4|webm|mov|avi)$/i.test(urlInput);
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(urlInput);

    if (!isVideo && !isImage) {
      toast({
        title: "URL invalide",
        description: "L'URL doit pointer vers un fichier vidéo ou image",
        variant: "destructive"
      });
      return;
    }

    const media: MediaFile = {
      id: `url-${Date.now()}`,
      name: urlInput.split("/").pop() || "Media",
      type: isVideo ? "video" : "image",
      url: urlInput,
      thumbnailUrl: isImage ? urlInput : undefined,
      duration: isVideo ? 10 : 5
    };

    onMediaAdd(media);
    setUrlInput("");
    
    toast({
      title: "Média importé",
      description: "Le média a été ajouté depuis l'URL"
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-white/10">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-white">
          <Upload className="h-4 w-4 text-cyan-400" />
          Importer
        </h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start px-3 py-1 h-auto bg-transparent border-b border-white/10 rounded-none">
          <TabsTrigger value="upload" className="text-xs gap-1 data-[state=active]:bg-white/10 px-3 py-1.5 text-white/70 data-[state=active]:text-white">
            <Upload className="h-3.5 w-3.5" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="stock" className="text-xs gap-1 data-[state=active]:bg-white/10 px-3 py-1.5 text-white/70 data-[state=active]:text-white">
            <FolderOpen className="h-3.5 w-3.5" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs gap-1 data-[state=active]:bg-white/10 px-3 py-1.5 text-white/70 data-[state=active]:text-white">
            <Link className="h-3.5 w-3.5" />
            URL
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Upload Tab */}
          <TabsContent value="upload" className="m-0 p-3 space-y-4">
            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
                dragOver 
                  ? "border-cyan-400 bg-cyan-400/10" 
                  : "border-white/20 hover:border-white/40 hover:bg-white/5"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              {isUploading ? (
                <Loader2 className="h-10 w-10 mx-auto mb-2 animate-spin text-cyan-400" />
              ) : (
                <Upload className="h-10 w-10 mx-auto mb-2 text-white/40" />
              )}
              <p className="text-sm text-white/70">
                {dragOver ? "Déposez ici" : "Glissez ou cliquez pour importer"}
              </p>
              <p className="text-xs text-white/40 mt-1">
                MP4, WebM, MOV, JPG, PNG, WEBP
              </p>
            </div>

            {/* Uploaded Media List */}
            {uploadedMedia.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-white/70">Médias importés</Label>
                <div className="space-y-1">
                  {uploadedMedia.map((media) => (
                    <div
                      key={media.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer"
                      onClick={() => onMediaAdd(media)}
                    >
                      <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                        {media.type === "video" ? (
                          <FileVideo className="h-5 w-5 text-cyan-400" />
                        ) : (
                          <FileImage className="h-5 w-5 text-purple-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-white">{media.name}</p>
                        <p className="text-[10px] text-white/50">
                          {media.type === "video" ? `${media.duration}s` : "Image"} 
                          {media.size && ` • ${formatSize(media.size)}`}
                        </p>
                      </div>
                      <Check className="h-4 w-4 text-green-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Stock Tab */}
          <TabsContent value="stock" className="m-0 p-3 space-y-4">
            <div className="space-y-3">
              <Label className="text-xs text-white/70">Vidéos</Label>
              <div className="grid grid-cols-2 gap-2">
                {STOCK_VIDEOS.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => onMediaAdd({ ...video, url: video.url || "" })}
                    className="aspect-video rounded-lg bg-gradient-to-br from-cyan-600/30 to-purple-600/30 flex flex-col items-center justify-center cursor-pointer hover:ring-1 hover:ring-white/30 transition-all group"
                  >
                    <Film className="h-6 w-6 text-white/60 group-hover:text-white mb-1" />
                    <span className="text-[10px] text-white/60 group-hover:text-white">{video.name}</span>
                    <span className="text-[9px] text-white/40">{video.duration}s</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs text-white/70">Images</Label>
              <div className="grid grid-cols-2 gap-2">
                {STOCK_IMAGES.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => onMediaAdd({ ...img, url: img.url || "", duration: 5 })}
                    className="aspect-video rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex flex-col items-center justify-center cursor-pointer hover:ring-1 hover:ring-white/30 transition-all group"
                  >
                    <Image className="h-6 w-6 text-white/60 group-hover:text-white mb-1" />
                    <span className="text-[10px] text-white/60 group-hover:text-white">{img.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* URL Tab */}
          <TabsContent value="url" className="m-0 p-3 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-white/70">Importer depuis une URL</Label>
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <Button 
                  size="sm" 
                  onClick={handleUrlImport}
                  disabled={!urlInput.trim()}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  Importer
                </Button>
              </div>
              <p className="text-[10px] text-white/40">
                Formats supportés: MP4, WebM, MOV, JPG, PNG, WEBP, GIF
              </p>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};
