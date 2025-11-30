import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, Star, MessageSquare, Play } from "lucide-react";

interface StoryboardSection {
  type: string;
  start: number;
  end: number;
  text?: string;
  animation?: string;
  style?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  duration: number;
  icon: React.ElementType;
  color: string;
  sections: StoryboardSection[];
}

interface TemplateGalleryProps {
  onApplyTemplate: (sections: StoryboardSection[]) => void;
}

const TEMPLATES: Template[] = [
  {
    id: "transformation",
    name: "Avant/Après NEWAI",
    description: "Perfect for showing the transformation your product provides",
    duration: 30,
    icon: Zap,
    color: "from-yellow-500 to-orange-500",
    sections: [
      { type: "hook", start: 0, end: 3, text: "⚡ Tu perds des ventes à cause de mauvaises images ?" },
      { type: "problem", start: 3, end: 10, text: "Avant : 3h pour chaque fiche produit…" },
      { type: "solution", start: 10, end: 20, text: "NEWAI génère tout en 12 secondes" },
      { type: "result", start: 20, end: 25, animation: "before_after_split" },
      { type: "cta", start: 25, end: 30, text: "Teste NEWAI Gratuitement 🚀", style: "glow_bounce" },
    ],
  },
  {
    id: "feature_highlight",
    name: "Feature Highlight",
    description: "Showcase multiple features in a fast-paced format",
    duration: 20,
    icon: Star,
    color: "from-purple-500 to-pink-500",
    sections: [
      { type: "hook", start: 0, end: 2, text: "🔥 Boost ton Shopify automatiquement" },
      { type: "solution", start: 2, end: 6, text: "✨ Images optimisées en 1 clic" },
      { type: "solution", start: 6, end: 10, text: "🤖 Titres + descriptions SEO automatisées" },
      { type: "solution", start: 10, end: 15, text: "🎥 Vidéo produit en 10 secondes" },
      { type: "cta", start: 15, end: 20, text: "Utilise NEWAI aujourd'hui", style: "tech_glow" },
    ],
  },
  {
    id: "quick_demo",
    name: "Quick Demo",
    description: "Short and punchy demo for maximum engagement",
    duration: 10,
    icon: Play,
    color: "from-cyan-500 to-blue-500",
    sections: [
      { type: "hook", start: 0, end: 2, text: "🚀 NEWAI en action" },
      { type: "solution", start: 2, end: 7, text: "Génération instantanée" },
      { type: "cta", start: 7, end: 10, text: "Essaye NEWAI maintenant", style: "pulse" },
    ],
  },
  {
    id: "testimonial",
    name: "Testimonial Style",
    description: "Customer success story format",
    duration: 20,
    icon: MessageSquare,
    color: "from-green-500 to-emerald-500",
    sections: [
      { type: "hook", start: 0, end: 3, text: "\"NEWAI a tout changé pour ma boutique\"" },
      { type: "problem", start: 3, end: 8, text: "J'avais du mal à créer des fiches produits..." },
      { type: "solution", start: 8, end: 14, text: "Maintenant tout est automatisé" },
      { type: "result", start: 14, end: 17, text: "x2 conversions en 7 jours" },
      { type: "cta", start: 17, end: 20, text: "Passe à NEWAI", style: "flash" },
    ],
  },
];

export function TemplateGallery({ onApplyTemplate }: TemplateGalleryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {TEMPLATES.map((template) => {
        const Icon = template.icon;
        
        return (
          <Card
            key={template.id}
            className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-all group"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${template.color} opacity-80`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {template.duration}s
                </Badge>
              </div>
              <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Timeline Preview */}
              <div className="flex gap-1 h-2">
                {template.sections.map((section, index) => {
                  const width = ((section.end - section.start) / template.duration) * 100;
                  const colors: Record<string, string> = {
                    hook: "bg-yellow-500",
                    problem: "bg-red-500",
                    solution: "bg-cyan-500",
                    result: "bg-green-500",
                    cta: "bg-purple-500",
                  };
                  
                  return (
                    <div
                      key={index}
                      className={`rounded-full ${colors[section.type] || "bg-gray-500"}`}
                      style={{ width: `${width}%` }}
                    />
                  );
                })}
              </div>

              {/* Section Labels */}
              <div className="flex flex-wrap gap-1">
                {template.sections.map((section, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {section.type}
                  </Badge>
                ))}
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => onApplyTemplate(template.sections)}
              >
                <Play className="w-4 h-4" />
                Use Template
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
