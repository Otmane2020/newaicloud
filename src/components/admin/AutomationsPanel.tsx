import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, Mail, Clock, ShoppingCart, Users, Send, 
  Settings, RefreshCw, Eye, History, CheckCircle, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string | null;
  template_code: string | null;
  status: string;
  sent_at: string | null;
  created_at: string | null;
  error_message: string | null;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  delay: number;
  template: string;
  enabled: boolean;
  sentCount: number;
}

// Email templates (same as edge function)
const EMAIL_TEMPLATES = {
  onboarding_abandoned: {
    subject: "🎁 Votre essai gratuit vous attend - NewAI",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
    .content { background: #f8fafc; border-radius: 12px; padding: 30px; margin: 20px 0; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .benefits { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .benefit { display: flex; align-items: center; margin: 10px 0; }
    .check { color: #22c55e; margin-right: 10px; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NewAI</div>
    </div>
    <div class="content">
      <h1>Vous êtes si proche de booster vos ventes ! 🚀</h1>
      <p>Nous avons remarqué que vous avez créé un compte mais n'avez pas encore activé votre essai gratuit.</p>
      <p><strong>Bonne nouvelle :</strong> Votre essai gratuit de 7 jours vous attend toujours !</p>
      <div class="benefits">
        <h3>Ce que vous obtenez gratuitement :</h3>
        <div class="benefit"><span class="check">✓</span> Optimisation SEO automatique de vos produits</div>
        <div class="benefit"><span class="check">✓</span> Génération de landing pages par IA</div>
        <div class="benefit"><span class="check">✓</span> Amélioration des textes alternatifs d'images</div>
        <div class="benefit"><span class="check">✓</span> Articles de blog générés automatiquement</div>
        <div class="benefit"><span class="check">✓</span> Aucune carte bancaire requise pour essayer</div>
      </div>
      <center>
        <a href="https://newai.sale/onboarding" class="cta">Activer mon essai gratuit →</a>
      </center>
    </div>
    <div class="footer">
      <p>NewAI - L'IA au service de votre e-commerce</p>
    </div>
  </div>
</body>
</html>
    `
  },
  cart_abandoned: {
    subject: "🛒 Votre panier vous attend - NewAI",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
    .content { background: #f8fafc; border-radius: 12px; padding: 30px; margin: 20px 0; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .cart-summary { background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NewAI</div>
    </div>
    <div class="content">
      <h1>Vous avez oublié quelque chose ! 🛒</h1>
      <p>Nous avons remarqué que vous n'avez pas finalisé votre inscription.</p>
      <div class="cart-summary">
        <h3>Votre sélection vous attend :</h3>
        <p>Finalisez votre inscription et commencez à optimiser votre boutique dès maintenant !</p>
      </div>
      <center>
        <a href="https://newai.sale/onboarding" class="cta">Finaliser mon inscription →</a>
      </center>
    </div>
    <div class="footer">
      <p>NewAI - L'IA au service de votre e-commerce</p>
    </div>
  </div>
</body>
</html>
    `
  },
  reminder_24h: {
    subject: "⏰ Plus que 24h pour profiter de -50% - NewAI",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
    .content { background: #f8fafc; border-radius: 12px; padding: 30px; margin: 20px 0; }
    .discount { background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .discount-code { font-size: 24px; font-weight: bold; letter-spacing: 2px; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NewAI</div>
    </div>
    <div class="content">
      <h1>🎉 Offre spéciale pour vous !</h1>
      <p>Parce que nous voulons vous aider à réussir, voici une offre exclusive :</p>
      <div class="discount">
        <p style="margin: 0;">Code promo</p>
        <div class="discount-code">WELCOME50</div>
        <p style="margin: 5px 0 0 0;">-50% sur votre premier mois</p>
      </div>
      <p>Cette offre expire dans <strong>24 heures</strong>. Ne la ratez pas !</p>
      <center>
        <a href="https://newai.sale/onboarding?promo=WELCOME50" class="cta">Profiter de l'offre →</a>
      </center>
    </div>
    <div class="footer">
      <p>NewAI - L'IA au service de votre e-commerce</p>
    </div>
  </div>
</body>
</html>
    `
  }
};

export function AutomationsPanel() {
  const { toast } = useToast();
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [templateCounts, setTemplateCounts] = useState<Record<string, number>>({});
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [historyTemplate, setHistoryTemplate] = useState<string | null>(null);
  const [templateEmails, setTemplateEmails] = useState<EmailLog[]>([]);
  
  // Automation rules
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: '1',
      name: 'Panier abandonné - 1h',
      trigger: 'cart_abandoned',
      delay: 60,
      template: 'cart_abandoned',
      enabled: true,
      sentCount: 0
    },
    {
      id: '2',
      name: 'Onboarding abandonné - 24h',
      trigger: 'onboarding_abandoned',
      delay: 1440,
      template: 'onboarding_abandoned',
      enabled: true,
      sentCount: 0
    },
    {
      id: '3',
      name: 'Rappel promo - 48h',
      trigger: 'cart_abandoned',
      delay: 2880,
      template: 'reminder_24h',
      enabled: false,
      sentCount: 0
    }
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get email logs
      const { data: logs, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setEmailLogs(logs || []);

      // Calculate counts per template
      const counts: Record<string, number> = {};
      (logs || []).forEach(log => {
        if (log.template_code) {
          counts[log.template_code] = (counts[log.template_code] || 0) + 1;
        }
      });
      setTemplateCounts(counts);

      // Update automation rules with real counts
      setAutomationRules(prev => prev.map(rule => ({
        ...rule,
        sentCount: counts[rule.template] || 0
      })));

    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateEmails = async (template: string) => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('template_code', template)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTemplateEmails(data || []);
    } catch (error) {
      console.error('Error loading template emails:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (historyTemplate) {
      loadTemplateEmails(historyTemplate);
    }
  }, [historyTemplate]);

  const toggleAutomation = (id: string) => {
    setAutomationRules(prev => 
      prev.map(rule => 
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
    toast({
      title: 'Automatisation mise à jour',
      description: 'Les paramètres ont été sauvegardés'
    });
  };

  const sendBulkRecoveryEmails = async () => {
    try {
      setSendingBulk(true);
      
      const { data: carts, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('recovery_email_sent', false)
        .eq('converted', false)
        .not('email', 'is', null)
        .limit(50);
      
      if (error) throw error;
      
      if (!carts || carts.length === 0) {
        toast({
          title: 'Aucun panier à relancer',
          description: 'Tous les paniers abandonnés ont déjà été relancés'
        });
        return;
      }
      
      let sent = 0;
      let failed = 0;
      
      for (const cart of carts) {
        if (!cart.email) continue;
        
        try {
          const { error: sendError } = await supabase.functions.invoke('send-recovery-email', {
            body: { email: cart.email, template: 'cart_abandoned' }
          });
          
          if (sendError) {
            failed++;
            continue;
          }
          
          await supabase
            .from('abandoned_carts')
            .update({ 
              recovery_email_sent: true, 
              recovery_email_sent_at: new Date().toISOString() 
            })
            .eq('id', cart.id);
          
          sent++;
        } catch {
          failed++;
        }
      }
      
      toast({
        title: 'Envoi terminé',
        description: `${sent} emails envoyés, ${failed} échecs`
      });
      
      loadData();
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer les emails',
        variant: 'destructive'
      });
    } finally {
      setSendingBulk(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'sent') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Envoyé
        </Badge>
      );
    }
    if (status === 'failed') {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Échoué
        </Badge>
      );
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const sentToday = emailLogs.filter(l => 
    l.sent_at && new Date(l.sent_at).toDateString() === new Date().toDateString()
  ).length;
  
  const successRate = emailLogs.length > 0 
    ? Math.round((emailLogs.filter(l => l.status === 'sent').length / emailLogs.length) * 100)
    : 0;

  const getTemplateLabel = (template: string) => {
    const labels: Record<string, string> = {
      onboarding_abandoned: 'Onboarding abandonné',
      cart_abandoned: 'Panier abandonné',
      reminder_24h: 'Rappel -50%'
    };
    return labels[template] || template;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-yellow-500" />
          <div>
            <h2 className="text-2xl font-bold">Automatisations</h2>
            <p className="text-muted-foreground">Emails de récupération automatiques</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={sendBulkRecoveryEmails} 
            disabled={sendingBulk}
            className="bg-gradient-to-r from-primary to-purple-600"
          >
            {sendingBulk ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Relancer tous les paniers
          </Button>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Emails envoyés aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{sentToday}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailLogs.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taux de succès</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Automatisations actives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {automationRules.filter(r => r.enabled).length}/{automationRules.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automation Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Règles d'automatisation
          </CardTitle>
          <CardDescription>
            Configurez les emails automatiques pour récupérer les paniers abandonnés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {automationRules.map(rule => (
              <div 
                key={rule.id} 
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  rule.enabled ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-muted/50 border-muted'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${rule.enabled ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}>
                    {rule.trigger === 'cart_abandoned' ? (
                      <ShoppingCart className="w-5 h-5" />
                    ) : (
                      <Users className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{rule.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Délai: {rule.delay < 60 ? `${rule.delay} min` : `${Math.round(rule.delay / 60)}h`}
                      <span className="mx-2">•</span>
                      Template: <Badge variant="outline">{rule.template}</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium">
                    <span className={rule.sentCount > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                      {rule.sentCount} envoyés
                    </span>
                  </div>
                  
                  {/* Preview Template Button */}
                  <Dialog open={previewTemplate === rule.template} onOpenChange={(open) => setPreviewTemplate(open ? rule.template : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Aperçu
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Mail className="w-5 h-5" />
                          Aperçu: {getTemplateLabel(rule.template)}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <span className="font-medium">Sujet:</span>
                          <span>{EMAIL_TEMPLATES[rule.template as keyof typeof EMAIL_TEMPLATES]?.subject}</span>
                        </div>
                        <ScrollArea className="h-[500px] border rounded-lg">
                          <iframe
                            srcDoc={EMAIL_TEMPLATES[rule.template as keyof typeof EMAIL_TEMPLATES]?.html}
                            className="w-full h-[500px]"
                            title="Email Preview"
                          />
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Email History Button */}
                  <Dialog open={historyTemplate === rule.template} onOpenChange={(open) => setHistoryTemplate(open ? rule.template : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <History className="w-4 h-4 mr-1" />
                        Historique
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <History className="w-5 h-5" />
                          Historique: {getTemplateLabel(rule.template)}
                        </DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[500px]">
                        {templateEmails.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Aucun email envoyé avec ce template</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Destinataire</TableHead>
                                <TableHead>Sujet</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Erreur</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {templateEmails.map(log => (
                                <TableRow key={log.id}>
                                  <TableCell className="font-mono text-sm">
                                    {log.recipient_email}
                                  </TableCell>
                                  <TableCell className="max-w-[200px] truncate">
                                    {log.subject || '-'}
                                  </TableCell>
                                  <TableCell>
                                    {getStatusBadge(log.status)}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {log.sent_at ? format(new Date(log.sent_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                                  </TableCell>
                                  <TableCell className="text-sm text-red-500 max-w-[150px] truncate">
                                    {log.error_message || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>

                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={rule.enabled} 
                      onCheckedChange={() => toggleAutomation(rule.id)}
                    />
                    <Label className="sr-only">Activer</Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Email Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Historique des emails
          </CardTitle>
          <CardDescription>
            Tous les emails envoyés ({emailLogs.length} au total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun email envoyé pour le moment</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {log.recipient_email}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.subject || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.template_code || 'custom'}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.sent_at ? format(new Date(log.sent_at), 'dd/MM HH:mm', { locale: fr }) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
