import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type TemplateStyle = 'gold' | 'red-promo' | 'minimal' | 'tech' | 'black-friday' | 'story';

interface CreativeTemplateSelectorProps {
  selected: TemplateStyle;
  onSelect: (style: TemplateStyle) => void;
}

const templates: { id: TemplateStyle; name: string; preview: string; description: string }[] = [
  { 
    id: 'minimal', 
    name: 'Minimal White', 
    preview: 'bg-white border-2 border-border',
    description: 'Clean & Modern'
  },
  { 
    id: 'gold', 
    name: 'Gold Premium', 
    preview: 'bg-gradient-to-br from-amber-200 to-yellow-500',
    description: 'Luxe & Élégant'
  },
  { 
    id: 'red-promo', 
    name: 'Red Promo', 
    preview: 'bg-gradient-to-br from-red-500 to-rose-600',
    description: 'Urgence & Ventes'
  },
  { 
    id: 'tech', 
    name: 'Tech Gradient', 
    preview: 'bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600',
    description: 'Moderne & Tech'
  },
  { 
    id: 'black-friday', 
    name: 'Black Friday', 
    preview: 'bg-gradient-to-br from-gray-900 to-black',
    description: 'Dark & Premium'
  },
  { 
    id: 'story', 
    name: 'Story Format', 
    preview: 'bg-gradient-to-b from-pink-500 via-purple-500 to-indigo-500',
    description: 'Vertical 9:16'
  },
];

export function CreativeTemplateSelector({ selected, onSelect }: CreativeTemplateSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template.id)}
          className={cn(
            "relative flex flex-col items-center p-2 rounded-lg border-2 transition-all",
            selected === template.id 
              ? "border-primary bg-primary/5" 
              : "border-transparent hover:border-muted-foreground/30"
          )}
        >
          <div 
            className={cn(
              "w-full aspect-square rounded-md mb-1.5",
              template.preview
            )}
          >
            {selected === template.id && (
              <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </div>
          <span className="text-xs font-medium text-center leading-tight">
            {template.name}
          </span>
          <span className="text-[10px] text-muted-foreground text-center">
            {template.description}
          </span>
        </button>
      ))}
    </div>
  );
}
