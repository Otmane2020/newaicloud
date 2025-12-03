import { useState } from "react";
import { Music, Play, Pause, Plus, Upload, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AudioTrack {
  id: string;
  name: string;
  artist: string;
  duration: number;
  category: string;
  previewUrl?: string;
}

interface AudioLibraryProps {
  open: boolean;
  onClose: () => void;
  onSelectAudio: (audio: AudioTrack) => void;
}

const SAMPLE_TRACKS: AudioTrack[] = [
  { id: "1", name: "Upbeat Corporate", artist: "Stock Music", duration: 120, category: "corporate" },
  { id: "2", name: "Energetic Pop", artist: "Stock Music", duration: 90, category: "pop" },
  { id: "3", name: "Cinematic Epic", artist: "Stock Music", duration: 180, category: "cinematic" },
  { id: "4", name: "Chill Lo-Fi", artist: "Stock Music", duration: 150, category: "lofi" },
  { id: "5", name: "Happy Acoustic", artist: "Stock Music", duration: 100, category: "acoustic" },
  { id: "6", name: "Modern Tech", artist: "Stock Music", duration: 110, category: "tech" },
  { id: "7", name: "Inspirational Piano", artist: "Stock Music", duration: 140, category: "piano" },
  { id: "8", name: "Funky Groove", artist: "Stock Music", duration: 95, category: "funk" },
];

export const AudioLibrary = ({ open, onClose, onSelectAudio }: AudioLibraryProps) => {
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [category, setCategory] = useState("all");

  const filteredTracks = SAMPLE_TRACKS.filter((track) => {
    const matchesSearch = track.name.toLowerCase().includes(search.toLowerCase()) ||
      track.artist.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || track.category === category;
    return matchesSearch && matchesCategory;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = (id: string) => {
    setPlayingId(playingId === id ? null : id);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-green-500" />
            Bibliothèque Audio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Upload */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une musique..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Importer
            </Button>
          </div>

          {/* Categories */}
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all">Tout</TabsTrigger>
              <TabsTrigger value="corporate">Corporate</TabsTrigger>
              <TabsTrigger value="pop">Pop</TabsTrigger>
              <TabsTrigger value="cinematic">Cinéma</TabsTrigger>
              <TabsTrigger value="lofi">Lo-Fi</TabsTrigger>
              <TabsTrigger value="acoustic">Acoustic</TabsTrigger>
            </TabsList>

            <TabsContent value={category} className="mt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {filteredTracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    >
                      {/* Play button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 rounded-full bg-green-500/10 hover:bg-green-500/20"
                        onClick={() => togglePlay(track.id)}
                      >
                        {playingId === track.id ? (
                          <Pause className="h-4 w-4 text-green-500" />
                        ) : (
                          <Play className="h-4 w-4 text-green-500 ml-0.5" />
                        )}
                      </Button>

                      {/* Track info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{track.name}</p>
                        <p className="text-xs text-muted-foreground">{track.artist}</p>
                      </div>

                      {/* Duration */}
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatDuration(track.duration)}
                      </span>

                      {/* Add button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                        onClick={() => {
                          onSelectAudio(track);
                          onClose();
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
