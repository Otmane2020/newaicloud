import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Calendar } from "lucide-react";

interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CampaignWizard({ open, onOpenChange, onSuccess }: CampaignWizardProps) {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [autoPost, setAutoPost] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("blog_campaigns")
        .insert([
          {
            user_id: user.id,
            name,
            frequency,
            auto_post: autoPost,
            is_active: true,
          },
        ]);

      if (error) throw error;

      toast.success("Campagne créée avec succès !");
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setName("");
      setFrequency("weekly");
      setAutoPost(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création de la campagne");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Nouvelle campagne automatique
          </DialogTitle>
          <DialogDescription>
            Configurez une campagne pour générer des articles de blog automatiquement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la campagne</Label>
            <Input
              id="name"
              placeholder="Ex: Articles hebdomadaires produits"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Fréquence</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidienne</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuelle</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {frequency === "daily" && "Un article sera généré chaque jour"}
              {frequency === "weekly" && "Un article sera généré chaque semaine"}
              {frequency === "monthly" && "Un article sera généré chaque mois"}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-post">Publication automatique</Label>
              <p className="text-sm text-muted-foreground">
                Publier automatiquement sur Shopify après génération
              </p>
            </div>
            <Switch
              id="auto-post"
              checked={autoPost}
              onCheckedChange={setAutoPost}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Créer la campagne
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
