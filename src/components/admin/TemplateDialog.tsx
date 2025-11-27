import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/language';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  html_body: string | null;
  category: string;
  variables: string[];
  usage_count: number;
  is_favorite?: boolean;
}

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: EmailTemplate[];
  onApplyTemplate: (template: EmailTemplate) => void;
}

export function TemplateDialog({ open, onOpenChange, templates, onApplyTemplate }: TemplateDialogProps) {
  const { t, tf } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFavorites, setShowFavorites] = useState(false);

  const categories = ['all', ...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(search.toLowerCase()) ||
                         template.subject.toLowerCase().includes(search.toLowerCase()) ||
                         template.body.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesFavorites = !showFavorites || template.is_favorite;

    return matchesSearch && matchesCategory && matchesFavorites;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.dialogs.templates.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.dialogs.templates.searchPlaceholder}
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={showFavorites ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavorites(!showFavorites)}
                className="gap-2"
              >
                <Star className={cn("h-4 w-4", showFavorites && "fill-yellow-500 text-yellow-500")} />
                {t.dialogs.templates.favorites}
              </Button>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-background"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? t.dialogs.templates.allCategories : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
            {filteredTemplates.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-muted-foreground">{t.dialogs.templates.noTemplates}</p>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={() => onApplyTemplate(template)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: EmailTemplate;
  onApply: () => void;
}

function TemplateCard({ template, onApply }: TemplateCardProps) {
  const { t, tf } = useTranslation();
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 group"
      onClick={onApply}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{template.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.subject}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Badge variant="secondary">{template.category}</Badge>
            {template.is_favorite && (
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {template.body}
        </p>
        
        {template.variables.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.variables.map((variable) => (
              <Badge key={variable} variant="outline" className="text-xs">
                {`{{${variable}}}`}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{tf('dialogs.templates.usedTimes', { count: template.usage_count })}</span>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onApply();
            }}
          >
            {t.dialogs.templates.apply}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
