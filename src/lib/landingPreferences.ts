import { supabase } from "@/integrations/supabase/client";

export interface LandingPreferences {
  layout: string;
  designStyle: string;
  contentLength: string;
  paletteId: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  customHighlights?: string[];
}

export async function getUserDefaultPreferences(
  userId: string
): Promise<LandingPreferences | null> {
  try {
    console.log("📋 Chargement des préférences par défaut pour l'utilisateur:", userId);

    const { data, error } = await supabase
      .from("landing_page_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("is_default", true)
      .single();

    if (error || !data) {
      console.log("ℹ️ Aucune préférence par défaut trouvée");
      return null;
    }

    console.log("✅ Préférences chargées:", {
      layout: data.layout,
      designStyle: data.design_style,
      paletteId: data.palette_id,
    });

    return {
      layout: data.layout,
      designStyle: data.design_style,
      contentLength: data.content_length,
      paletteId: data.palette_id,
      colorScheme: {
        primary: data.color_primary,
        secondary: data.color_secondary,
        accent: data.color_accent,
        background: data.color_background,
        surface: data.color_surface,
        text: data.color_text,
        textMuted: data.color_text_muted,
      },
      customHighlights: data.custom_highlights || undefined,
    };
  } catch (err) {
    console.error("❌ Erreur lors du chargement des préférences:", err);
    return null;
  }
}
