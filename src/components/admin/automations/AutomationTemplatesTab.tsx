import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, Save, Eye, Edit2, ShoppingCart, Users, Gift, Mail
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  icon: any;
  variables: string[];
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'cart_abandoned',
    name: 'Panier abandonné',
    subject: '🛒 Votre panier vous attend - CatalogueOptimize AI',
    description: 'Email envoyé 1h après abandon du panier',
    icon: ShoppingCart,
    variables: ['{{customer_name}}', '{{cart_url}}', '{{product_list}}']
  },
  {
    id: 'onboarding_abandoned',
    name: 'Onboarding abandonné',
    subject: '🎁 Votre essai gratuit vous attend - CatalogueOptimize AI',
    description: 'Rappel pour utilisateurs n\'ayant pas finalisé leur inscription',
    icon: Users,
    variables: ['{{customer_name}}', '{{signup_date}}']
  },
  {
    id: 'reminder_24h',
    name: 'Rappel promo 24h',
    subject: '⏰ Plus que 24h pour profiter de -50% - CatalogueOptimize AI',
    description: 'Offre promotionnelle -50% avec code WELCOME50',
    icon: Gift,
    variables: ['{{customer_name}}', '{{promo_code}}', '{{expiry_date}}']
  }
];

export function AutomationTemplatesTab() {
  const { toast } = useToast();
  const [templates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  const getPreviewHtml = (templateId: string) => {
    const previews: Record<string, string> = {
      cart_abandoned: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 28px; font-weight: bold; color: #6366f1;">CatalogueOptimize AI</div>
          </div>
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin: 20px 0;">
            <h1 style="margin-top: 0;">Vous avez oublié quelque chose ! 🛒</h1>
            <p>Nous avons remarqué que vous n'avez pas finalisé votre inscription.</p>
            <div style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3>Votre sélection vous attend :</h3>
              <p>Finalisez votre inscription et commencez à optimiser votre boutique dès maintenant !</p>
            </div>
            <center>
              <a href="#" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Finaliser mon inscription →
              </a>
            </center>
          </div>
        </div>
      `,
      onboarding_abandoned: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 28px; font-weight: bold; color: #6366f1;">CatalogueOptimize AI</div>
          </div>
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin: 20px 0;">
            <h1 style="margin-top: 0;">Vous êtes si proche de booster vos ventes ! 🚀</h1>
            <p>Votre essai gratuit de 7 jours vous attend toujours !</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3>Ce que vous obtenez gratuitement :</h3>
              <p style="color: #22c55e;">✓ Optimisation SEO automatique de vos produits</p>
              <p style="color: #22c55e;">✓ Génération de landing pages par IA</p>
              <p style="color: #22c55e;">✓ Amélioration des textes alternatifs d'images</p>
              <p style="color: #22c55e;">✓ Aucune carte bancaire requise</p>
            </div>
            <center>
              <a href="#" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Activer mon essai gratuit →
              </a>
            </center>
          </div>
        </div>
      `,
      reminder_24h: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 28px; font-weight: bold; color: #6366f1;">CatalogueOptimize AI</div>
          </div>
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin: 20px 0;">
            <h1 style="margin-top: 0;">🎉 Offre spéciale pour vous !</h1>
            <p>Parce que nous voulons vous aider à réussir, voici une offre exclusive :</p>
            <div style="background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="margin: 0;">Code promo</p>
              <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">WELCOME50</div>
              <p style="margin: 5px 0 0 0;">-50% sur votre premier mois</p>
            </div>
            <p>Cette offre expire dans <strong>24 heures</strong>. Ne la ratez pas !</p>
            <center>
              <a href="#" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Profiter de l'offre →
              </a>
            </center>
          </div>
        </div>
      `
    };
    return previews[templateId] || '<p>Aucun aperçu disponible</p>';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Templates d'emails
        </h3>
        <p className="text-sm text-muted-foreground">
          Gérez les modèles d'emails utilisés pour les automatisations
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => {
          const Icon = template.icon;
          return (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {template.id}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                <div className="text-xs text-muted-foreground mb-3">
                  <strong>Sujet:</strong> {template.subject}
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.variables.map(v => (
                    <Badge key={v} variant="secondary" className="text-xs font-mono">
                      {v}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setPreviewTemplate(template.id)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Aperçu
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Modifier
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Aperçu du template
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="border rounded-lg overflow-hidden">
              <div 
                className="bg-white"
                dangerouslySetInnerHTML={{ __html: getPreviewHtml(previewTemplate) }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Modifier le template
            </DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Sujet de l'email</Label>
                <Input defaultValue={editingTemplate.subject} />
              </div>
              <div>
                <Label>Variables disponibles</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {editingTemplate.variables.map(v => (
                    <Badge key={v} variant="secondary" className="text-xs font-mono cursor-pointer hover:bg-primary hover:text-primary-foreground">
                      {v}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cliquez sur une variable pour la copier
                </p>
              </div>
              <div>
                <Label>Contenu HTML (avancé)</Label>
                <Textarea 
                  rows={10}
                  className="font-mono text-xs"
                  placeholder="Le contenu HTML du template..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Annuler
                </Button>
                <Button onClick={() => {
                  toast({ title: 'Template sauvegardé' });
                  setEditingTemplate(null);
                }}>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
