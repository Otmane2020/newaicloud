import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, Mail, Clock, ShoppingCart, Users, Send, Play, 
  Pause, Settings, CheckCircle, XCircle, RefreshCw 
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

export function AutomationsPanel() {
  const { toast } = useToast();
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingBulk, setSendingBulk] = useState(false);
  
  // Automation rules (stored locally for now, can be moved to DB)
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: '1',
      name: 'Panier abandonné - 1h',
      trigger: 'cart_abandoned',
      delay: 60, // minutes
      template: 'cart_abandoned',
      enabled: true,
      sentCount: 0
    },
    {
      id: '2',
      name: 'Onboarding abandonné - 24h',
      trigger: 'onboarding_abandoned',
      delay: 1440, // 24 hours
      template: 'onboarding_abandoned',
      enabled: true,
      sentCount: 0
    },
    {
      id: '3',
      name: 'Rappel promo - 48h',
      trigger: 'cart_abandoned',
      delay: 2880, // 48 hours
      template: 'reminder_24h',
      enabled: false,
      sentCount: 0
    }
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const { data: logs, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setEmailLogs(logs || []);
    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      
      // Get abandoned carts without recovery email
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
            body: { 
              email: cart.email, 
              template: 'cart_abandoned'
            }
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
    const colors: Record<string, string> = {
      sent: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      opened: 'bg-blue-100 text-blue-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const sentToday = emailLogs.filter(l => 
    l.sent_at && new Date(l.sent_at).toDateString() === new Date().toDateString()
  ).length;
  
  const successRate = emailLogs.length > 0 
    ? Math.round((emailLogs.filter(l => l.status === 'sent').length / emailLogs.length) * 100)
    : 0;

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
                  rule.enabled ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-muted'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${rule.enabled ? 'bg-green-100' : 'bg-muted'}`}>
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
                  <div className="text-sm text-muted-foreground">
                    {rule.sentCount} envoyés
                  </div>
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

      {/* Email Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Historique des emails
          </CardTitle>
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
