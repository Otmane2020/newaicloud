import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send, Inbox, Archive, RefreshCw, Plus, TestTube } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminEmail {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  html_body: string | null;
  status: string;
  direction: string;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
  is_read: boolean;
}

interface EmailStats {
  total: number;
  received: number;
  sent: number;
  unread: number;
}

export function EmailInbox() {
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats>({ total: 0, received: 0, sent: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<AdminEmail | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    loadEmails();
    loadEmailStats();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('admin-emails')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_emails'
      }, () => {
        loadEmails();
        loadEmailStats();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_emails')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error loading emails:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les emails',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmailStats = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_emails')
        .select('direction, status, is_read');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        received: data?.filter(e => e.direction === 'incoming').length || 0,
        sent: data?.filter(e => e.direction === 'outgoing').length || 0,
        unread: data?.filter(e => e.direction === 'incoming' && e.is_read === false).length || 0,
      };

      setEmailStats(stats);
    } catch (error) {
      console.error('Error loading email stats:', error);
    }
  };

  const sendEmail = async () => {
    if (!to || !subject || !body) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-admin-email', {
        body: {
          to,
          subject,
          body,
          htmlBody: `<p>${body.replace(/\n/g, '<br>')}</p>`
        }
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Email envoyé avec succès'
      });

      // Reset form
      setTo('');
      setSubject('');
      setBody('');
      setComposeOpen(false);
      loadEmails();
      loadEmailStats();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer l\'email',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const simulateIncomingEmail = async () => {
    try {
      const { error } = await supabase
        .from('admin_emails')
        .insert({
          from_email: 'client@example.com',
          to_email: 'support@newai.sale',
          subject: 'Demande de support - Test',
          body: 'Bonjour, j\'ai besoin d\'aide avec mon compte. Ceci est un email de test.',
          html_body: '<p>Bonjour,</p><p>J\'ai besoin d\'aide avec mon compte. Ceci est un email de test.</p>',
          direction: 'incoming',
          status: 'received',
          is_read: false
        });

      if (error) throw error;

      toast({
        title: 'Email de test reçu',
        description: 'Un email de test a été ajouté à votre boîte de réception'
      });

      loadEmails();
      loadEmailStats();
    } catch (error: any) {
      console.error('Error simulating email:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de simuler l\'email',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      sent: 'bg-green-500',
      pending: 'bg-yellow-500',
      failed: 'bg-red-500',
      received: 'bg-blue-500'
    };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const sentEmails = emails.filter(e => e.direction === 'outgoing');
  const receivedEmails = emails.filter(e => e.direction === 'incoming');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Messagerie Admin
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={simulateIncomingEmail}
            className="gap-2"
          >
            <TestTube className="w-4 h-4" />
            Email Test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadEmails();
              loadEmailStats();
            }}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Composer un email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="to">À</Label>
                  <Input
                    id="to"
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="destinataire@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Objet</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Objet de l'email"
                  />
                </div>
                <div>
                  <Label htmlFor="body">Message</Label>
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Votre message..."
                    rows={10}
                  />
                </div>
                <Button
                  onClick={sendEmail}
                  disabled={sending}
                  className="w-full"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sent" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sent">
              <Send className="w-4 h-4 mr-2" />
              Envoyés ({sentEmails.length})
            </TabsTrigger>
            <TabsTrigger value="received">
              <Inbox className="w-4 h-4 mr-2" />
              Reçus ({receivedEmails.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sent">
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {sentEmails.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun email envoyé
                  </p>
                ) : (
                  sentEmails.map((email) => (
                    <div
                      key={email.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold">À: {email.to_email}</p>
                          <p className="text-sm text-muted-foreground">{email.subject}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(email.status)}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(email.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {email.body}
                      </p>
                      {email.error_message && (
                        <p className="text-xs text-red-600 mt-2">
                          Erreur: {email.error_message}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="received">
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {receivedEmails.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun email reçu
                  </p>
                ) : (
                  receivedEmails.map((email) => (
                    <div
                      key={email.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold">De: {email.from_email}</p>
                          <p className="text-sm text-muted-foreground">{email.subject}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(email.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {email.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Email Detail Dialog */}
        {selectedEmail && (
          <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedEmail.subject}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold">De:</span> {selectedEmail.from_email}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">À:</span> {selectedEmail.to_email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(selectedEmail.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  {getStatusBadge(selectedEmail.status)}
                </div>
                <div className="border-t pt-4">
                  {selectedEmail.html_body ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }} />
                  ) : (
                    <p className="whitespace-pre-wrap">{selectedEmail.body}</p>
                  )}
                </div>
                {selectedEmail.error_message && (
                  <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      <span className="font-semibold">Erreur:</span> {selectedEmail.error_message}
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
