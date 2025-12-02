import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type TemplateStyle = "gold" | "red-promo" | "minimal" | "tech" | "black-friday" | "story";

interface CreativeTemplateSelectorProps {
  selected: TemplateStyle;
  onSelect: (style: TemplateStyle) => void;
}

const templates: {
  id: TemplateStyle;
  name: string;
  preview: string;
  description: string;
}[] = [
  {
    id: "minimal",
    name: "Minimal White",
    preview: "bg-white border border-gray-300",
    description: "Clean & Modern",
  },
  {
    id: "gold",
    name: "Gold Premium",
    preview: "bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-500",
    description: "Luxe & Élégant",
  },
  {
    id: "red-promo",
    name: "Red Promo",
    preview: "bg-gradient-to-br from-red-500 to-rose-600",
    description: "Urgence & Vente",
  },
  {
    id: "tech",
    name: "Tech Gradient",
    preview: "bg-gradient-to-br from-blue-700 via-purple-700 to-indigo-700",
    description: "Moderne & Futuriste",
  },
  {
    id: "black-friday",
    name: "Black Friday",
    preview: "bg-gradient-to-br from-gray-900 via-black to-gray-800",
    description: "Dark & Premium",
  },
  {
    id: "story",
    name: "Story Vertical",
    preview: "bg-gradient-to-b from-pink-500 via-purple-500 to-indigo-500",
    description: "Format 9:16",
  },
];

export function CreativeTemplateSelector({ selected, onSelect }: CreativeTemplateSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {templates.map((template) => {
        const isSelected = selected === template.id;
        return (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={cn(
              "relative group rounded-lg p-2 transition-all border",
              "hover:shadow-md hover:scale-[1.03] active:scale-[0.98]",
              isSelected
                ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                : "border-border hover:border-muted-foreground",
            )}
          >
            {/* Preview box */}
            <div
              className={cn(
                "w-full rounded-md mb-2 overflow-hidden relative shadow-sm transition-all",
                template.preview,
                isSelected && "ring-2 ring-primary/40",
              )}
            >
              {/* Subtle overlay for deep effect */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all"></div>

              {/* Selected badge */}
              {isSelected && (
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center shadow">
                  <Check className="h-3 w-3" />
                </div>
              )}

              {/* Responsive 1:1 preview */}
              <div className="aspect-square" />
            </div>

            <div className="text-center space-y-0.5">
              <p className={cn("text-xs font-semibold leading-tight", isSelected ? "text-primary" : "text-foreground")}>
                {template.name}
              </p>
              <p className="text-[10px] text-muted-foreground">{template.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
