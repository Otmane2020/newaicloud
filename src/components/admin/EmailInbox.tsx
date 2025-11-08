import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send, Plus, TestTube, Reply, Trash2, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EmailSidebar } from './EmailSidebar';

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
  folder: string;
}

interface EmailStats {
  inbox: number;
  sent: number;
  drafts: number;
  trash: number;
  spam: number;
}

export function EmailInbox() {
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats>({ inbox: 0, sent: 0, drafts: 0, trash: 0, spam: 0 });
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<AdminEmail | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
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
        .select('direction, status, is_read, folder');

      if (error) throw error;

      const stats = {
        inbox: data?.filter(e => (e.folder === 'inbox' || (!e.folder && e.direction === 'incoming'))).length || 0,
        sent: data?.filter(e => (e.folder === 'sent' || (!e.folder && e.direction === 'outgoing'))).length || 0,
        drafts: data?.filter(e => e.folder === 'drafts').length || 0,
        trash: data?.filter(e => e.folder === 'trash').length || 0,
        spam: data?.filter(e => e.folder === 'spam').length || 0,
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
      setReplyTo(null);
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

  const moveToFolder = async (emailId: string, folder: string) => {
    try {
      const { error } = await supabase
        .from('admin_emails')
        .update({ folder })
        .eq('id', emailId);

      if (error) throw error;

      toast({
        title: 'Email déplacé',
        description: `Email déplacé vers ${folder}`
      });

      loadEmails();
      loadEmailStats();
    } catch (error) {
      console.error('Error moving email:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de déplacer l\'email',
        variant: 'destructive'
      });
    }
  };

  const handleReply = (email: AdminEmail) => {
    setReplyTo(email.from_email);
    setTo(email.from_email);
    setSubject(`Re: ${email.subject}`);
    setBody(`\n\n--- Email original ---\nDe: ${email.from_email}\nDate: ${format(new Date(email.created_at), 'dd/MM/yyyy HH:mm')}\n\n${email.body}`);
    setComposeOpen(true);
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
          folder: 'inbox',
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

  const filteredEmails = emails.filter(e => {
    if (activeFolder === 'inbox') return e.folder === 'inbox' || (!e.folder && e.direction === 'incoming');
    if (activeFolder === 'sent') return e.folder === 'sent' || (!e.folder && e.direction === 'outgoing');
    return e.folder === activeFolder;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[280px_1fr] gap-6">
      {/* Sidebar */}
      <EmailSidebar
        activeFolder={activeFolder}
        onFolderChange={setActiveFolder}
        stats={emailStats}
        onRefresh={() => {
          loadEmails();
          loadEmailStats();
        }}
        loading={loading}
      />

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="w-6 h-6" />
              {activeFolder === 'inbox' && 'Boîte de réception'}
              {activeFolder === 'sent' && 'Emails envoyés'}
              {activeFolder === 'drafts' && 'Brouillons'}
              {activeFolder === 'trash' && 'Corbeille'}
              {activeFolder === 'spam' && 'Spam'}
            </h2>
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
              <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {replyTo ? 'Répondre à l\'email' : 'Composer un email'}
                    </DialogTitle>
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
                        disabled={!!replyTo}
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
          </div>

          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-2">
              {filteredEmails.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun email dans ce dossier
                </p>
              ) : (
                filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold">
                          {activeFolder === 'sent' ? `À: ${email.to_email}` : `De: ${email.from_email}`}
                        </p>
                        <p className="text-sm text-muted-foreground">{email.subject}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(email.status)}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(email.created_at), 'dd MMM HH:mm', { locale: fr })}
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
                    <div className="flex gap-2">
                      {getStatusBadge(selectedEmail.status)}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {selectedEmail.direction === 'incoming' && (
                      <Button size="sm" variant="outline" onClick={() => handleReply(selectedEmail)}>
                        <Reply className="w-4 h-4 mr-2" />
                        Répondre
                      </Button>
                    )}
                    {selectedEmail.folder !== 'trash' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => moveToFolder(selectedEmail.id, 'trash')}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    )}
                    {selectedEmail.folder === 'trash' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => moveToFolder(selectedEmail.id, 'inbox')}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Restaurer
                      </Button>
                    )}
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
    </div>
  );
}
