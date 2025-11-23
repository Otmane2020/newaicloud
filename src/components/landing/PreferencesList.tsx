import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Star } from 'lucide-react';
import { useLandingPreferences } from '@/hooks/useLandingPreferences';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export function PreferencesList() {
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
    });
  }, []);

  const { preferences, isLoading, deletePreference, setAsDefault } = useLandingPreferences(userId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (!preferences || preferences.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configurations sauvegardées</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aucune configuration enregistrée. Créez une landing page pour sauvegarder votre première configuration.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurations sauvegardées ({preferences.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {preferences.map((pref) => (
          <div
            key={pref.id}
            className="border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{pref.palette_id}</h3>
                  {pref.is_default && (
                    <Badge variant="default">
                      <Star className="w-3 h-3 mr-1" />
                      Par défaut
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{pref.layout}</Badge>
                  <Badge variant="outline">{pref.design_style}</Badge>
                  <Badge variant="outline">{pref.content_length}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {!pref.is_default && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAsDefault(pref.id)}
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deletePreference(pref.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Primary</p>
                <div
                  className="w-full h-8 rounded border"
                  style={{ backgroundColor: `hsl(${pref.color_primary})` }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Secondary</p>
                <div
                  className="w-full h-8 rounded border"
                  style={{ backgroundColor: `hsl(${pref.color_secondary})` }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Accent</p>
                <div
                  className="w-full h-8 rounded border"
                  style={{ backgroundColor: `hsl(${pref.color_accent})` }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Background</p>
                <div
                  className="w-full h-8 rounded border"
                  style={{ backgroundColor: `hsl(${pref.color_background})` }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Surface</p>
                <div
                  className="w-full h-8 rounded border"
                  style={{ backgroundColor: `hsl(${pref.color_surface})` }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Text</p>
                <div
                  className="w-full h-8 rounded border"
                  style={{ backgroundColor: `hsl(${pref.color_text})` }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Muted</p>
                <div
                  className="w-full h-8 rounded border"
                  style={{ backgroundColor: `hsl(${pref.color_text_muted})` }}
                />
              </div>
            </div>

            {pref.custom_highlights && pref.custom_highlights.length > 0 && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Points forts personnalisés:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {pref.custom_highlights.map((highlight, idx) => (
                    <li key={idx}>{highlight}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Créé le {new Date(pref.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
