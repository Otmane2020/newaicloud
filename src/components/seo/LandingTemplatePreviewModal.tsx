import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, Sparkles, Layout, Palette } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: string;
  config: {
    style: string;
    layout: string;
    colorScheme: string;
  };
}

interface LandingTemplatePreviewModalProps {
  template: Template | null;
  allTemplates: Template[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: Template) => void;
}

export function LandingTemplatePreviewModal({
  template,
  allTemplates,
  open,
  onOpenChange,
  onSelect,
}: LandingTemplatePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!template) return null;

  const currentTemplate = allTemplates[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? allTemplates.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === allTemplates.length - 1 ? 0 : prev + 1));
  };

  const handleSelectTemplate = () => {
    onSelect(currentTemplate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-1">
                {currentTemplate.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {currentTemplate.description}
              </p>
            </div>
            <Badge variant="secondary" className="ml-4">
              {currentTemplate.category}
            </Badge>
          </div>

          {/* Preview Image */}
          <div className="flex-1 relative bg-gradient-to-br from-background to-muted/20 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <img
                src={currentTemplate.preview}
                alt={currentTemplate.name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-border"
              />
            </div>

            {/* Navigation Arrows */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            {/* Template Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
              <span className="text-sm font-medium">
                {currentIndex + 1} / {allTemplates.length}
              </span>
            </div>
          </div>

          {/* Template Details & Actions */}
          <div className="p-6 border-t bg-card">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Style Info */}
              <div className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Style</p>
                  <p className="text-sm font-semibold">{currentTemplate.config.style}</p>
                </div>
              </div>

              {/* Layout Info */}
              <div className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Layout className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Layout</p>
                  <p className="text-sm font-semibold">{currentTemplate.config.layout}</p>
                </div>
              </div>

              {/* Color Scheme Info */}
              <div className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Palette className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Couleurs</p>
                  <p className="text-sm font-semibold">{currentTemplate.config.colorScheme}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Fermer
              </Button>
              <Button
                onClick={handleSelectTemplate}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Utiliser ce template
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
