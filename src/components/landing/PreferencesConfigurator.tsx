import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ConfigOption {
  id: string;
  option_key: string;
  option_label: string;
  option_value: any;
}

interface PreferencesConfiguratorProps {
  onConfigChange?: (config: {
    layout: string;
    designStyle: string;
    contentLength: string;
    colors: any;
    highlights: string[];
  }) => void;
}

export function PreferencesConfigurator({ onConfigChange }: PreferencesConfiguratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [layouts, setLayouts] = useState<ConfigOption[]>([]);
  const [designStyles, setDesignStyles] = useState<ConfigOption[]>([]);
  const [contentLengths, setContentLengths] = useState<ConfigOption[]>([]);
  const [colorSchemes, setColorSchemes] = useState<ConfigOption[]>([]);
  const [highlights, setHighlights] = useState<ConfigOption[]>([]);
  
  const [selectedLayout, setSelectedLayout] = useState('');
  const [selectedDesign, setSelectedDesign] = useState('');
  const [selectedLength, setSelectedLength] = useState('');
  const [selectedColorScheme, setSelectedColorScheme] = useState('');
  const [customColors, setCustomColors] = useState({
    primary: 'hsl(210, 100%, 50%)',
    secondary: 'hsl(200, 95%, 45%)',
    accent: 'hsl(45, 100%, 55%)',
    background: 'hsl(0, 0%, 100%)',
    surface: 'hsl(0, 0%, 98%)',
    text: 'hsl(0, 0%, 10%)',
    textMuted: 'hsl(0, 0%, 45%)'
  });
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([]);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    fetchConfigOptions();
  }, []);

  const fetchConfigOptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('landing_page_config_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setLayouts(data?.filter(d => d.category === 'layout') || []);
      setDesignStyles(data?.filter(d => d.category === 'design_style') || []);
      setContentLengths(data?.filter(d => d.category === 'content_length') || []);
      setColorSchemes(data?.filter(d => d.category === 'color_scheme') || []);
      setHighlights(data?.filter(d => d.category === 'highlight') || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les options de configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleColorSchemeChange = (schemeKey: string) => {
    setSelectedColorScheme(schemeKey);
    const scheme = colorSchemes.find(c => c.option_key === schemeKey);
    if (scheme?.option_value) {
      setCustomColors(scheme.option_value);
      notifyConfigChange(selectedLayout, selectedDesign, selectedLength, scheme.option_value, selectedHighlights);
    }
  };

  const notifyConfigChange = (layout: string, design: string, length: string, colors: any, highlights: string[]) => {
    if (onConfigChange) {
      onConfigChange({
        layout,
        designStyle: design,
        contentLength: length,
        colors,
        highlights
      });
    }
  };

  const handleHighlightToggle = (highlightKey: string) => {
    const newHighlights = selectedHighlights.includes(highlightKey)
      ? selectedHighlights.filter(h => h !== highlightKey)
      : [...selectedHighlights, highlightKey];
    
    setSelectedHighlights(newHighlights);
    notifyConfigChange(selectedLayout, selectedDesign, selectedLength, customColors, newHighlights);
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedLayout || !selectedDesign || !selectedLength || !selectedColorScheme) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Si défini comme défaut, désactiver les autres
      if (isDefault) {
        await supabase
          .from('landing_page_preferences')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('landing_page_preferences')
        .insert({
          user_id: user.id,
          layout: selectedLayout,
          design_style: selectedDesign,
          content_length: selectedLength,
          color_primary: customColors.primary,
          color_secondary: customColors.secondary,
          color_accent: customColors.accent,
          color_background: customColors.background,
          color_surface: customColors.surface,
          color_text: customColors.text,
          color_text_muted: customColors.textMuted,
          custom_highlights: selectedHighlights.length > 0 ? selectedHighlights : null,
          is_default: isDefault
        });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Préférence sauvegardée avec succès',
      });

      // Reset form
      setSelectedLayout('');
      setSelectedDesign('');
      setSelectedLength('');
      setSelectedColorScheme('');
      setSelectedHighlights([]);
      setIsDefault(false);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder la préférence',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Créer une nouvelle préférence</h2>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Layout *</Label>
            <Select value={selectedLayout} onValueChange={(val) => {
              setSelectedLayout(val);
              notifyConfigChange(val, selectedDesign, selectedLength, customColors, selectedHighlights);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un layout" />
              </SelectTrigger>
              <SelectContent>
                {layouts.map(layout => (
                  <SelectItem key={layout.id} value={layout.option_key}>
                    {layout.option_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Style de design *</Label>
            <Select value={selectedDesign} onValueChange={(val) => {
              setSelectedDesign(val);
              notifyConfigChange(selectedLayout, val, selectedLength, customColors, selectedHighlights);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un style" />
              </SelectTrigger>
              <SelectContent>
                {designStyles.map(style => (
                  <SelectItem key={style.id} value={style.option_key}>
                    {style.option_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Longueur du contenu *</Label>
            <Select value={selectedLength} onValueChange={(val) => {
              setSelectedLength(val);
              notifyConfigChange(selectedLayout, selectedDesign, val, customColors, selectedHighlights);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une longueur" />
              </SelectTrigger>
              <SelectContent>
                {contentLengths.map(length => (
                  <SelectItem key={length.id} value={length.option_key}>
                    {length.option_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Palette de couleurs *</Label>
            <Select value={selectedColorScheme} onValueChange={handleColorSchemeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une palette" />
              </SelectTrigger>
              <SelectContent>
                {colorSchemes.map(scheme => (
                  <SelectItem key={scheme.id} value={scheme.option_key}>
                    {scheme.option_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedColorScheme && (
          <div className="space-y-4">
            <Label>Prévisualisation des couleurs</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(customColors).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label className="text-sm capitalize">{key}</Label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-12 h-12 rounded border-2 border-border" 
                      style={{ backgroundColor: value }}
                    />
                    <Input
                      type="text"
                      value={value}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Label>Points forts à mettre en avant (optionnel)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {highlights.map(highlight => (
              <div key={highlight.id} className="flex items-center space-x-2">
                <Checkbox
                  id={highlight.id}
                  checked={selectedHighlights.includes(highlight.option_key)}
                  onCheckedChange={() => handleHighlightToggle(highlight.option_key)}
                />
                <label
                  htmlFor={highlight.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {highlight.option_label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isDefault"
            checked={isDefault}
            onCheckedChange={(checked) => setIsDefault(checked as boolean)}
          />
          <label
            htmlFor="isDefault"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Définir comme préférence par défaut
          </label>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sauvegarder la préférence
        </Button>
      </div>
    </Card>
  );
}
