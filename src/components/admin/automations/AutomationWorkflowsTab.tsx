import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, Clock, ShoppingCart, Users, Save, 
  Play, Pause, Trash2, Plus, Edit2, Mail
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AutomationWorkflow {
  id: string;
  name: string;
  trigger: 'cart_abandoned' | 'onboarding_abandoned' | 'trial_ending';
  delay_minutes: number;
  template: string;
  enabled: boolean;
  description: string;
}

const DEFAULT_WORKFLOWS: AutomationWorkflow[] = [
  {
    id: '1',
    name: 'Panier abandonné - 1h',
    trigger: 'cart_abandoned',
    delay_minutes: 60,
    template: 'cart_abandoned',
    enabled: true,
    description: "Envoi automatique d'un email de récupération 1 heure après l'abandon du panier"
  },
  {
    id: '2',
    name: 'Onboarding abandonné - 24h',
    trigger: 'onboarding_abandoned',
    delay_minutes: 1440,
    template: 'onboarding_abandoned',
    enabled: true,
    description: "Rappel aux utilisateurs qui n'ont pas terminé leur inscription après 24 heures"
  },
  {
    id: '3',
    name: 'Rappel promo - 48h',
    trigger: 'cart_abandoned',
    delay_minutes: 2880,
    template: 'reminder_24h',
    enabled: false,
    description: "Offre promotionnelle -50% envoyée 48h après l'abandon"
  }
];

const TEMPLATES = [
  { id: 'cart_abandoned', name: 'Panier abandonné', description: 'Email de récupération de panier' },
  { id: 'onboarding_abandoned', name: 'Onboarding abandonné', description: 'Rappel essai gratuit' },
  { id: 'reminder_24h', name: 'Rappel promo 24h', description: 'Offre -50% code WELCOME50' },
];

export function AutomationWorkflowsTab() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [editingWorkflow, setEditingWorkflow] = useState<AutomationWorkflow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('automation_workflows');
    if (saved) {
      setWorkflows(JSON.parse(saved));
    } else {
      setWorkflows(DEFAULT_WORKFLOWS);
    }
  }, []);

  const saveWorkflows = (newWorkflows: AutomationWorkflow[]) => {
    setWorkflows(newWorkflows);
    localStorage.setItem('automation_workflows', JSON.stringify(newWorkflows));
    toast({
      title: 'Workflows sauvegardés',
      description: 'Les automatisations ont été mises à jour'
    });
  };

  const toggleWorkflow = (id: string) => {
    const newWorkflows = workflows.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    );
    saveWorkflows(newWorkflows);
  };

  const deleteWorkflow = (id: string) => {
    const newWorkflows = workflows.filter(w => w.id !== id);
    saveWorkflows(newWorkflows);
  };

  const saveEditingWorkflow = () => {
    if (!editingWorkflow) return;
    
    const exists = workflows.find(w => w.id === editingWorkflow.id);
    let newWorkflows;
    
    if (exists) {
      newWorkflows = workflows.map(w => 
        w.id === editingWorkflow.id ? editingWorkflow : w
      );
    } else {
      newWorkflows = [...workflows, { ...editingWorkflow, id: Date.now().toString() }];
    }
    
    saveWorkflows(newWorkflows);
    setEditingWorkflow(null);
    setIsDialogOpen(false);
  };

  const formatDelay = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)} jour(s)`;
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'cart_abandoned': return <ShoppingCart className="w-5 h-5" />;
      case 'onboarding_abandoned': return <Users className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case 'cart_abandoned': return 'Panier abandonné';
      case 'onboarding_abandoned': return 'Onboarding abandonné';
      case 'trial_ending': return 'Fin d\'essai';
      default: return trigger;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Workflows d'automatisation
          </h3>
          <p className="text-sm text-muted-foreground">
            Configurez les emails automatiques de récupération
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingWorkflow({
              id: '',
              name: '',
              trigger: 'cart_abandoned',
              delay_minutes: 60,
              template: 'cart_abandoned',
              enabled: true,
              description: ''
            })}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingWorkflow?.id ? 'Modifier le workflow' : 'Nouveau workflow'}
              </DialogTitle>
            </DialogHeader>
            {editingWorkflow && (
              <div className="space-y-4">
                <div>
                  <Label>Nom du workflow</Label>
                  <Input 
                    value={editingWorkflow.name}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                    placeholder="Ex: Panier abandonné - 1h"
                  />
                </div>
                
                <div>
                  <Label>Déclencheur</Label>
                  <Select 
                    value={editingWorkflow.trigger}
                    onValueChange={(v) => setEditingWorkflow({ ...editingWorkflow, trigger: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cart_abandoned">Panier abandonné</SelectItem>
                      <SelectItem value="onboarding_abandoned">Onboarding abandonné</SelectItem>
                      <SelectItem value="trial_ending">Fin d'essai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Délai (en minutes)</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number"
                      value={editingWorkflow.delay_minutes}
                      onChange={(e) => setEditingWorkflow({ ...editingWorkflow, delay_minutes: parseInt(e.target.value) || 0 })}
                    />
                    <span className="text-sm text-muted-foreground self-center">
                      = {formatDelay(editingWorkflow.delay_minutes)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    60 = 1h, 1440 = 24h, 2880 = 48h
                  </p>
                </div>
                
                <div>
                  <Label>Template d'email</Label>
                  <Select 
                    value={editingWorkflow.template}
                    onValueChange={(v) => setEditingWorkflow({ ...editingWorkflow, template: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATES.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          <div>
                            <span>{t.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({t.description})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea 
                    value={editingWorkflow.description}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })}
                    placeholder="Décrivez le fonctionnement de ce workflow..."
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={editingWorkflow.enabled}
                    onCheckedChange={(v) => setEditingWorkflow({ ...editingWorkflow, enabled: v })}
                  />
                  <Label>Activer immédiatement</Label>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={saveEditingWorkflow}>
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Process Description */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
            <Mail className="w-4 h-4" />
            Comment fonctionne l'automatisation ?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          <p><strong>1. Détection :</strong> Le système détecte les paniers abandonnés et les inscriptions non finalisées</p>
          <p><strong>2. Délai :</strong> Après le délai configuré (ex: 1h), l'email de récupération est envoyé</p>
          <p><strong>3. Template :</strong> L'email utilise le template choisi avec personnalisation automatique</p>
          <p><strong>4. Suivi :</strong> Tous les envois sont enregistrés dans l'onglet "Emails envoyés"</p>
        </CardContent>
      </Card>

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.map(workflow => (
          <Card 
            key={workflow.id} 
            className={`border-l-4 ${workflow.enabled ? 'border-l-green-500 bg-green-50/50' : 'border-l-gray-300'}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${workflow.enabled ? 'bg-green-100' : 'bg-muted'}`}>
                    {getTriggerIcon(workflow.trigger)}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {workflow.name}
                      {workflow.enabled ? (
                        <Badge className="bg-green-100 text-green-800">Actif</Badge>
                      ) : (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{workflow.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Délai: {formatDelay(workflow.delay_minutes)}
                      </span>
                      <span>•</span>
                      <span>Déclencheur: {getTriggerLabel(workflow.trigger)}</span>
                      <span>•</span>
                      <span>Template: <Badge variant="outline" className="ml-1">{workflow.template}</Badge></span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setEditingWorkflow(workflow);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Switch 
                    checked={workflow.enabled}
                    onCheckedChange={() => toggleWorkflow(workflow.id)}
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive"
                    onClick={() => deleteWorkflow(workflow.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
