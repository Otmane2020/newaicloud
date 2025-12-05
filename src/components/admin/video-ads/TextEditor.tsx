import { useState } from "react";
import { Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Palette, Plus, Trash2, Move, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface TextOverlay {
  id: string;
  text: string;
  font: string;
  size: number;
  color: string;
  position: { x: number; y: number };
  align: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
  animation: string | null;
  startTime: number;
  endTime: number;
}

interface TextEditorProps {
  texts: TextOverlay[];
  onTextsChange: (texts: TextOverlay[]) => void;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
  totalDuration: number;
}

const FONTS = [
  { id: "Inter", label: "Inter" },
  { id: "Roboto", label: "Roboto" },
  { id: "Poppins", label: "Poppins" },
  { id: "Montserrat", label: "Montserrat" },
  { id: "Playfair Display", label: "Playfair" },
  { id: "Bebas Neue", label: "Bebas" },
  { id: "Anton", label: "Anton" },
];

const COLORS = [
  "#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF",
  "#FFFF00", "#FF00FF", "#00FFFF", "#FF6B6B", "#4ECDC4",
  "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"
];

const TEXT_ANIMATIONS = [
  { id: "none", label: "Aucune" },
  { id: "fadeIn", label: "Fondu" },
  { id: "slideUp", label: "Glisser haut" },
  { id: "slideDown", label: "Glisser bas" },
  { id: "scaleIn", label: "Zoom" },
  { id: "typewriter", label: "Machine à écrire" },
  { id: "bounce", label: "Rebond" },
  { id: "glow", label: "Lueur" },
  { id: "shake", label: "Tremblement" },
];

export const TextEditor = ({ 
  texts, 
  onTextsChange, 
  selectedTextId, 
  onSelectText,
  totalDuration 
}: TextEditorProps) => {
  const selectedText = texts.find(t => t.id === selectedTextId);

  const addNewText = () => {
    const newText: TextOverlay = {
      id: `text-${Date.now()}`,
      text: "Nouveau texte",
      font: "Inter",
      size: 32,
      color: "#FFFFFF",
      position: { x: 50, y: 50 },
      align: "center",
      bold: false,
      italic: false,
      animation: null,
      startTime: 0,
      endTime: Math.min(5, totalDuration || 5),
    };
    onTextsChange([...texts, newText]);
    onSelectText(newText.id);
  };

  const updateText = (id: string, updates: Partial<TextOverlay>) => {
    onTextsChange(texts.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteText = (id: string) => {
    onTextsChange(texts.filter(t => t.id !== id));
    if (selectedTextId === id) {
      onSelectText(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-white">
            <Type className="h-4 w-4 text-cyan-400" />
            Texte
          </h3>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 gap-1 text-cyan-400 hover:bg-cyan-400/10"
            onClick={addNewText}
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Text List */}
          {texts.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun texte</p>
              <p className="text-xs mt-1">Cliquez sur "Ajouter" pour créer</p>
            </div>
          ) : (
            <div className="space-y-2">
              {texts.map((text) => (
                <div
                  key={text.id}
                  onClick={() => onSelectText(text.id)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all group",
                    selectedTextId === text.id
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-white/10 hover:border-white/20 bg-white/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-sm font-medium truncate max-w-[150px] text-white"
                      style={{ fontFamily: text.font }}
                    >
                      {text.text}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                      onClick={(e) => { e.stopPropagation(); deleteText(text.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
                    <span>{text.font}</span>
                    <span>•</span>
                    <span>{text.size}px</span>
                    <span>•</span>
                    <span>{text.startTime}s - {text.endTime}s</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Text Editor */}
          {selectedText && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
              {/* Text Input */}
              <div className="space-y-2">
                <Label className="text-xs text-white/70">Texte</Label>
                <Input
                  value={selectedText.text}
                  onChange={(e) => updateText(selectedText.id, { text: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Entrez votre texte..."
                />
              </div>

              {/* Font Selection */}
              <div className="space-y-2">
                <Label className="text-xs text-white/70">Police</Label>
                <Select
                  value={selectedText.font}
                  onValueChange={(v) => updateText(selectedText.id, { font: v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((font) => (
                      <SelectItem key={font.id} value={font.id} style={{ fontFamily: font.id }}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-white/70">Taille</Label>
                  <span className="text-xs text-white/50">{selectedText.size}px</span>
                </div>
                <Slider
                  value={[selectedText.size]}
                  onValueChange={([v]) => updateText(selectedText.id, { size: v })}
                  min={12}
                  max={120}
                  step={1}
                />
              </div>

              {/* Style Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={selectedText.bold ? "default" : "outline"}
                  onClick={() => updateText(selectedText.id, { bold: !selectedText.bold })}
                  className="h-8 w-8 p-0 border-white/10"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={selectedText.italic ? "default" : "outline"}
                  onClick={() => updateText(selectedText.id, { italic: !selectedText.italic })}
                  className="h-8 w-8 p-0 border-white/10"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <div className="h-6 w-px bg-white/10 mx-1" />
                <Button
                  size="sm"
                  variant={selectedText.align === "left" ? "default" : "outline"}
                  onClick={() => updateText(selectedText.id, { align: "left" })}
                  className="h-8 w-8 p-0 border-white/10"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={selectedText.align === "center" ? "default" : "outline"}
                  onClick={() => updateText(selectedText.id, { align: "center" })}
                  className="h-8 w-8 p-0 border-white/10"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={selectedText.align === "right" ? "default" : "outline"}
                  onClick={() => updateText(selectedText.id, { align: "right" })}
                  className="h-8 w-8 p-0 border-white/10"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label className="text-xs text-white/70 flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  Couleur
                </Label>
                <div className="flex flex-wrap gap-1">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateText(selectedText.id, { color })}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                        selectedText.color === color ? "border-white" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Animation */}
              <div className="space-y-2">
                <Label className="text-xs text-white/70 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Animation
                </Label>
                <Select
                  value={selectedText.animation || "none"}
                  onValueChange={(v) => updateText(selectedText.id, { animation: v === "none" ? null : v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEXT_ANIMATIONS.map((anim) => (
                      <SelectItem key={anim.id} value={anim.id}>
                        {anim.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-white/70">Début (s)</Label>
                  <Input
                    type="number"
                    value={selectedText.startTime}
                    onChange={(e) => updateText(selectedText.id, { startTime: parseFloat(e.target.value) || 0 })}
                    min={0}
                    max={totalDuration}
                    step={0.1}
                    className="bg-white/5 border-white/10 text-white h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white/70">Fin (s)</Label>
                  <Input
                    type="number"
                    value={selectedText.endTime}
                    onChange={(e) => updateText(selectedText.id, { endTime: parseFloat(e.target.value) || 0 })}
                    min={selectedText.startTime}
                    max={totalDuration}
                    step={0.1}
                    className="bg-white/5 border-white/10 text-white h-8"
                  />
                </div>
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label className="text-xs text-white/70 flex items-center gap-1">
                  <Move className="h-3 w-3" />
                  Position
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-white/50">X: {selectedText.position.x}%</span>
                    <Slider
                      value={[selectedText.position.x]}
                      onValueChange={([v]) => updateText(selectedText.id, { position: { ...selectedText.position, x: v } })}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/50">Y: {selectedText.position.y}%</span>
                    <Slider
                      value={[selectedText.position.y]}
                      onValueChange={([v]) => updateText(selectedText.id, { position: { ...selectedText.position, y: v } })}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
