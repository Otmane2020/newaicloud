import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, Film, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VideoClip {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  category: string;
}

interface ClipLibraryProps {
  onSelect: (clip: VideoClip | null) => void;
  selectedClip: VideoClip | null;
}

export function ClipLibrary({ onSelect, selectedClip }: ClipLibraryProps) {
  const { toast } = useToast();
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadClips();
  }, []);

  const loadClips = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("video_clips")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClips(data || []);
    } catch (error) {
      console.error("Error loading clips:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("video-clips")
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("video-clips")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("video_clips").insert({
        user_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, ""),
        file_url: publicUrl,
        category: "demo",
      });

      if (insertError) throw insertError;

      toast({ title: "Clip uploaded successfully!" });
      loadClips();
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("video_clips").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Clip deleted" });
      loadClips();
      if (selectedClip?.id === id) onSelect(null);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "demo": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      case "feature": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "testimonial": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Film className="w-4 h-4 text-cyan-400" />
          Screen Recordings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="block">
          <Input
            type="file"
            accept="video/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
            id="video-upload"
          />
          <Button
            variant="outline"
            className="w-full gap-2 border-dashed"
            disabled={uploading}
            asChild
          >
            <label htmlFor="video-upload" className="cursor-pointer">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? "Uploading..." : "Upload Video"}
            </label>
          </Button>
        </label>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : clips.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No clips yet. Upload your demo recordings.
            </p>
          ) : (
            clips.map((clip) => (
              <div
                key={clip.id}
                className={`p-2 rounded-lg border cursor-pointer transition-all ${
                  selectedClip?.id === clip.id
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-border/50 hover:border-border hover:bg-muted/50"
                }`}
                onClick={() => onSelect(clip)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Film className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{clip.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={getCategoryColor(clip.category)}>
                      {clip.category}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(clip.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
