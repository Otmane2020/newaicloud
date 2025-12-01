import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Plus, TestTube, Reply, Trash2, Archive, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmailSidebar } from "./EmailSidebar";
import {
  Dialog as TemplateDialog,
  DialogContent as TemplateDialogContent,
  DialogHeader as TemplateDialogHeader,
  DialogTitle as TemplateDialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/language";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  html_body: string | null;
  category: string;
  variables: any;
  usage_count: number;
}

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
  metadata?: {
    email_id?: string;
    content_available?: boolean;
    content_source?: string;
    warning?: string;
    attachments?: Array<{
      id: string;
      filename: string;
      content_type: string;
      size: number;
    }>;
    attachments_count?: number;
  };
}

interface EmailStats {
  inbox: number;
  sent: number;
  drafts: number;
  trash: number;
  spam: number;
  unreadInbox?: number;
  unreadSent?: number;
  unreadDrafts?: number;
  unreadTrash?: number;
  unreadSpam?: number;
}

export function EmailInbox() {
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats>({ inbox: 0, sent: 0, drafts: 0, trash: 0, spam: 0 });
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<AdminEmail | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const { toast } = useToast();
  const { t, tf } = useTranslation();

  // Form state
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    loadEmails();
    loadEmailStats();
    loadTemplates();

    // Setup realtime subscription
    const channel = supabase
      .channel("admin-emails")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_emails",
        },
        () => {
          loadEmails();
          loadEmailStats();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadEmails = async () => {
    try {
      const { data, error } = await supabase.from("admin_emails").select("*").order("created_at", { ascending: false });

      if (error) throw error;
      setEmails((data || []) as AdminEmail[]);
    } catch (error) {
      console.error("Error loading emails:", error);
      toast({
        title: t.emailInboxPage.error,
        description: t.emailInboxPage.unableToLoad,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmailStats = async () => {
    try {
      const { data, error } = await supabase.from("admin_emails").select("direction, status, is_read, folder");

      if (error) throw error;

      const stats = {
        inbox: data?.filter((e) => e.direction === "incoming").length || 0,
        sent: data?.filter((e) => e.direction === "outgoing").length || 0,
        drafts: data?.filter((e) => e.folder === "drafts").length || 0,
        trash: data?.filter((e) => e.folder === "trash").length || 0,
        spam: data?.filter((e) => e.folder === "spam").length || 0,
        unreadInbox: data?.filter((e) => e.direction === "incoming" && !e.is_read).length || 0,
        unreadSent: 0, // Les emails envoyés n'ont pas de statut "non lu"
        unreadDrafts: data?.filter((e) => e.folder === "drafts" && !e.is_read).length || 0,
        unreadTrash: data?.filter((e) => e.folder === "trash" && !e.is_read).length || 0,
        unreadSpam: data?.filter((e) => e.folder === "spam" && !e.is_read).length || 0,
      };

      setEmailStats(stats);
    } catch (error) {
      console.error("Error loading email stats:", error);
    }
  };

  const getUnreadCount = (folder: string) => {
    // Les emails envoyés n'ont pas de statut "non lu"
    if (folder === "sent") return 0;
    
    return emails.filter((e) => {
      let inFolder = false;
      if (folder === "inbox") {
        inFolder = e.direction === "incoming";
      } else {
        inFolder = e.folder === folder;
      }
      return inFolder && !e.is_read;
    }).length;
  };

  const markAsRead = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from("admin_emails")
        .update({ is_read: true })
        .eq("id", emailId);

      if (error) {
        console.error("Error marking email as read:", error);
        return;
      }

      // Mettre à jour localement immédiatement
      setEmails((prev) =>
        prev.map((email) => (email.id === emailId ? { ...email, is_read: true } : email)),
      );

      loadEmailStats();
    } catch (error) {
      console.error("Error marking email as read:", error);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("is_active", true)
        .order("category");

      if (error) throw error;
      setTemplates(
        data?.map((t) => ({
          ...t,
          variables: Array.isArray(t.variables) ? t.variables : [],
        })) || [],
      );
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const applyTemplate = async (template: EmailTemplate) => {
    try {
      // Get user data from the recipient email if available
      let userData: any = {};

      if (to) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name, current_plan_id")
          .eq("email", to)
          .single();

        if (profile) {
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("name")
            .eq("id", profile.current_plan_id)
            .single();

          userData = {
            nom: profile.full_name || profile.email.split("@")[0],
            email: profile.email,
            plan: plan?.name || "Trial",
            subject: subject || "",
          };
        }
      }

      // Default values if no user data
      const defaultData = {
        nom: to ? to.split("@")[0] : "",
        email: to || "",
        plan: "Trial",
        subject: subject || "",
      };

      const data = { ...defaultData, ...userData };

      // Replace variables in subject and body
      let newSubject = template.subject;
      let newBody = template.html_body || template.body;

      const variablesArray = Array.isArray(template.variables) ? template.variables : [];
      variablesArray.forEach((variable: string) => {
        const regex = new RegExp(`{{${variable}}}`, "g");
        const value = data[variable as keyof typeof data] || "";
        newSubject = newSubject.replace(regex, value);
        newBody = newBody.replace(regex, value);
      });

      setSubject(newSubject);
      setBody(newBody);
      setTemplatesOpen(false);

      // Increment usage count
      await supabase
        .from("email_templates")
        .update({ usage_count: template.usage_count + 1 })
        .eq("id", template.id);

      toast({
        title: t.emailInboxPage.templateApplied,
        description: tf('emailInboxPage.templateAppliedDesc', { name: template.name }),
      });
    } catch (error) {
      console.error("Error applying template:", error);
    }
  };

  const sendEmail = async () => {
    if (!to || !subject || !body) {
      toast({
        title: t.emailInboxPage.error,
        description: t.emailInboxPage.fillAllFields,
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-admin-email", {
        body: {
          to,
          subject,
          body,
          htmlBody: `<p>${body.replace(/\n/g, "<br>")}</p>`,
        },
      });

      if (error) throw error;

      toast({
        title: t.emailInboxExtended.success,
        description: t.emailInboxPage.emailSent,
      });

      // Reset form
      setTo("");
      setSubject("");
      setBody("");
      setReplyTo(null);
      setComposeOpen(false);
      loadEmails();
      loadEmailStats();
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: t.emailInboxPage.error,
        description: error.message || t.emailInboxPage.unableToSend,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const moveToFolder = async (emailId: string, folder: string) => {
    try {
      const { error } = await supabase.from("admin_emails").update({ folder }).eq("id", emailId);

      if (error) throw error;

      toast({
        title: t.emailInboxPage.emailMoved,
        description: tf('emailInboxPage.movedTo', { folder }),
      });

      loadEmails();
      loadEmailStats();
    } catch (error) {
      console.error("Error moving email:", error);
      toast({
        title: t.emailInboxPage.error,
        description: t.emailInboxPage.unableToMove,
        variant: "destructive",
      });
    }
  };

  const handleReply = (email: AdminEmail) => {
    setReplyTo(email.from_email);
    setTo(email.from_email);
    setSubject(`Re: ${email.subject}`);
    setBody(
      `\n\n--- Email original ---\nDe: ${email.from_email}\nDate: ${format(new Date(email.created_at), "dd/MM/yyyy HH:mm")}\n\n${email.body}`,
    );
    setComposeOpen(true);
  };

  const simulateIncomingEmail = async () => {
    try {
      console.log("📧 Simulation d'un email reçu via webhook Resend...");

      // Simuler exactement le format du webhook Resend
      const testEmail = {
        from: "client.test@example.com",
        to: "support@newai.sale",
        subject: `Test Email - ${new Date().toLocaleTimeString("fr-FR")}`,
        text: "Bonjour,\n\nCeci est un email de test pour vérifier la réception.\n\nCordialement",
        html: "<p>Bonjour,</p><p>Ceci est un email de test pour vérifier la réception.</p><p>Cordialement</p>",
      };

      console.log("📤 Données de test:", testEmail);

      const { error } = await supabase.from("admin_emails").insert({
        from_email: testEmail.from,
        to_email: testEmail.to,
        subject: testEmail.subject,
        body: testEmail.text,
        html_body: testEmail.html,
        direction: "incoming",
        status: "received",
        folder: "inbox",
        is_read: false,
      });

      if (error) {
        console.error("❌ Erreur lors de l'insertion:", error);
        throw error;
      }

      console.log("✅ Email de test créé avec succès");

      toast({
        title: t.emailInboxPage.testReceived,
        description: t.emailInboxPage.testReceivedDesc,
      });

      await loadEmails();
      await loadEmailStats();
    } catch (error: any) {
      console.error("❌ Error simulating email:", error);
      toast({
        title: t.emailInboxPage.error,
        description: t.emailInboxPage.unableToSimulate + ": " + error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      sent: "bg-green-500",
      pending: "bg-yellow-500",
      failed: "bg-red-500",
      received: "bg-blue-500",
    };
    return <Badge className={colors[status] || "bg-gray-500"}>{status}</Badge>;
  };

  const filteredEmails = emails.filter((e) => {
    if (activeFolder === "inbox") {
      return e.direction === "incoming";
    }
    if (activeFolder === "sent") {
      return e.direction === "outgoing";
    }
    return e.folder === activeFolder;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const deleteEmail = async (emailId: string) => {
    try {
      const { error } = await supabase.from("admin_emails").delete().eq("id", emailId);

      if (error) throw error;

      toast({
        title: t.emailInboxExtended.emailDeleted,
        description: t.emailInboxExtended.emailDeletedDesc,
      });

      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
      loadEmails();
      loadEmailStats();
    } catch (error) {
      console.error("Error deleting email:", error);
      toast({
        title: t.emailInboxPage.error,
        description: t.emailInboxExtended.unableToDelete,
        variant: "destructive",
      });
    }
  };

  const deleteAllEmails = async () => {
    try {
      let query = supabase.from("admin_emails").delete();
      
      if (activeFolder === "inbox") {
        query = query.eq("direction", "incoming");
      } else if (activeFolder === "sent") {
        query = query.eq("direction", "outgoing");
      } else {
        query = query.eq("folder", activeFolder);
      }

      const { error } = await query;

      if (error) throw error;

      toast({
        title: t.emailInboxExtended.emailsDeleted,
        description: t.emailInboxExtended.allEmailsDeletedDesc,
      });

      setSelectedEmail(null);
      loadEmails();
      loadEmailStats();
    } catch (error) {
      console.error("Error deleting all emails:", error);
      toast({
        title: t.emailInboxPage.error,
        description: t.emailInboxExtended.unableToDelete,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:block">
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
      </div>

      {/* Mobile folder tabs */}
      <div className="flex lg:hidden overflow-x-auto gap-2 pb-2">
        {["inbox", "sent", "drafts", "trash", "spam"].map((folder) => {
          const unreadCount = getUnreadCount(folder);
          return (
            <Button
              key={folder}
              variant={activeFolder === folder ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFolder(folder)}
              className="whitespace-nowrap"
            >
              {folder === "inbox" && t.emailInboxPage.folders.inbox}
              {folder === "sent" && t.emailInboxPage.folders.sent}
              {folder === "drafts" && t.emailInboxPage.folders.drafts}
              {folder === "trash" && t.emailInboxPage.folders.trash}
              {folder === "spam" && t.emailInboxPage.folders.spam}
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
              <Mail className="w-5 h-5 lg:w-6 lg:h-6" />
              <span className="hidden sm:inline">
                {activeFolder === "inbox" && t.emailInboxPage.folders.inbox}
                {activeFolder === "sent" && t.emailInboxPage.folders.sent}
                {activeFolder === "drafts" && t.emailInboxPage.folders.drafts}
                {activeFolder === "trash" && t.emailInboxPage.folders.trash}
                {activeFolder === "spam" && t.emailInboxPage.folders.spam}
              </span>
              {getUnreadCount(activeFolder) > 0 && (
                <Badge variant="default" className="ml-2">
                  {getUnreadCount(activeFolder)} {t.emailInboxPage.unread}
                </Badge>
              )}
            </h2>
            <div className="flex flex-wrap gap-2">
              {filteredEmails.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={deleteAllEmails} 
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Supprimer tout</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={simulateIncomingEmail} className="gap-2">
                <TestTube className="w-4 h-4" />
                <span className="hidden sm:inline">Email Test</span>
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
                    <DialogTitle>{replyTo ? t.emailInboxPage.replyToEmail : t.emailInboxPage.composeEmail}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <p className="text-sm text-muted-foreground">Utilisez un template pour gagner du temps</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Choisir un template
                      </Button>
                    </div>

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
                    <Button onClick={sendEmail} disabled={sending} className="w-full">
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
            {filteredEmails.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucun email dans ce dossier</p>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  const weekAgo = new Date(today);
                  weekAgo.setDate(weekAgo.getDate() - 7);

                  const groups = {
                    today: filteredEmails.filter(e => new Date(e.created_at) >= today),
                    yesterday: filteredEmails.filter(e => {
                      const date = new Date(e.created_at);
                      return date >= yesterday && date < today;
                    }),
                    thisWeek: filteredEmails.filter(e => {
                      const date = new Date(e.created_at);
                      return date >= weekAgo && date < yesterday;
                    }),
                    older: filteredEmails.filter(e => new Date(e.created_at) < weekAgo)
                  };

                  return (
                    <>
                      {groups.today.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground mb-3 px-1">Aujourd'hui</h3>
                          <div className="space-y-2">
                            {groups.today.map((email) => (
                              <div
                                key={email.id}
                                onClick={() => {
                                  setSelectedEmail(email);
                                  if (!email.is_read) {
                                    markAsRead(email.id);
                                  }
                                }}
                                className={cn(
                                  "p-4 border rounded-lg cursor-pointer transition-colors",
                                  !email.is_read 
                                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/30" 
                                    : "bg-background hover:bg-muted/50"
                                )}
                              >
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    {!email.is_read && (
                                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className={cn(
                                        "font-medium truncate text-sm",
                                        !email.is_read && "font-bold text-foreground"
                                      )}>
                                        {activeFolder === 'sent' ? `À: ${email.to_email}` : `De: ${email.from_email}`}
                                      </p>
                                      <p className={cn(
                                        "text-sm mb-1 truncate",
                                        !email.is_read ? "font-semibold text-foreground" : "text-muted-foreground"
                                      )}>
                                        {email.subject}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                      {getStatusBadge(email.status)}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteEmail(email.id);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                      </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                                      {format(new Date(email.created_at), 'HH:mm', { locale: fr })}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {email.body?.replace(/<[^>]*>/g, '').substring(0, 120)}...
                                </p>
                                {email.metadata?.attachments_count && email.metadata.attachments_count > 0 && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <FileText className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {email.metadata.attachments_count} pièce{email.metadata.attachments_count > 1 ? 's' : ''} jointe{email.metadata.attachments_count > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {groups.yesterday.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground mb-3 px-1">Hier</h3>
                          <div className="space-y-2">
                            {groups.yesterday.map((email) => (
                              <div
                                key={email.id}
                                onClick={() => {
                                  setSelectedEmail(email);
                                  if (!email.is_read) {
                                    markAsRead(email.id);
                                  }
                                }}
                                className={cn(
                                  "p-4 border rounded-lg cursor-pointer transition-colors",
                                  !email.is_read 
                                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/30" 
                                    : "bg-background hover:bg-muted/50"
                                )}
                              >
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    {!email.is_read && (
                                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className={cn(
                                        "font-medium truncate text-sm",
                                        !email.is_read && "font-bold text-foreground"
                                      )}>
                                        {activeFolder === 'sent' ? `À: ${email.to_email}` : `De: ${email.from_email}`}
                                      </p>
                                      <p className={cn(
                                        "text-sm mb-1 truncate",
                                        !email.is_read ? "font-semibold text-foreground" : "text-muted-foreground"
                                      )}>
                                        {email.subject}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                      {getStatusBadge(email.status)}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteEmail(email.id);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                      </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                                      {format(new Date(email.created_at), 'HH:mm', { locale: fr })}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {email.body?.replace(/<[^>]*>/g, '').substring(0, 120)}...
                                </p>
                                {email.metadata?.attachments_count && email.metadata.attachments_count > 0 && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <FileText className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {email.metadata.attachments_count} pièce{email.metadata.attachments_count > 1 ? 's' : ''} jointe{email.metadata.attachments_count > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {groups.thisWeek.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground mb-3 px-1">Cette semaine</h3>
                          <div className="space-y-2">
                            {groups.thisWeek.map((email) => (
                              <div
                                key={email.id}
                                onClick={() => {
                                  setSelectedEmail(email);
                                  if (!email.is_read) {
                                    markAsRead(email.id);
                                  }
                                }}
                                className={cn(
                                  "p-4 border rounded-lg cursor-pointer transition-colors",
                                  !email.is_read 
                                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/30" 
                                    : "bg-background hover:bg-muted/50"
                                )}
                              >
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    {!email.is_read && (
                                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className={cn(
                                        "font-medium truncate text-sm",
                                        !email.is_read && "font-bold text-foreground"
                                      )}>
                                        {activeFolder === 'sent' ? `À: ${email.to_email}` : `De: ${email.from_email}`}
                                      </p>
                                      <p className={cn(
                                        "text-sm mb-1 truncate",
                                        !email.is_read ? "font-semibold text-foreground" : "text-muted-foreground"
                                      )}>
                                        {email.subject}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                      {getStatusBadge(email.status)}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteEmail(email.id);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                      </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                                      {format(new Date(email.created_at), 'dd MMM', { locale: fr })}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {email.body?.replace(/<[^>]*>/g, '').substring(0, 120)}...
                                </p>
                                {email.metadata?.attachments_count && email.metadata.attachments_count > 0 && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <FileText className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {email.metadata.attachments_count} pièce{email.metadata.attachments_count > 1 ? 's' : ''} jointe{email.metadata.attachments_count > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {groups.older.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground mb-3 px-1">Plus ancien</h3>
                          <div className="space-y-2">
                            {groups.older.map((email) => (
                              <div
                                key={email.id}
                                onClick={() => {
                                  setSelectedEmail(email);
                                  if (!email.is_read) {
                                    markAsRead(email.id);
                                  }
                                }}
                                className={cn(
                                  "p-4 border rounded-lg cursor-pointer transition-colors",
                                  !email.is_read 
                                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/30" 
                                    : "bg-background hover:bg-muted/50"
                                )}
                              >
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    {!email.is_read && (
                                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className={cn(
                                        "font-medium truncate text-sm",
                                        !email.is_read && "font-bold text-foreground"
                                      )}>
                                        {activeFolder === 'sent' ? `À: ${email.to_email}` : `De: ${email.from_email}`}
                                      </p>
                                      <p className={cn(
                                        "text-sm mb-1 truncate",
                                        !email.is_read ? "font-semibold text-foreground" : "text-muted-foreground"
                                      )}>
                                        {email.subject}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                      {getStatusBadge(email.status)}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteEmail(email.id);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                      </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                                      {format(new Date(email.created_at), 'dd/MM/yy', { locale: fr })}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {email.body?.replace(/<[^>]*>/g, '').substring(0, 120)}...
                                </p>
                                {email.metadata?.attachments_count && email.metadata.attachments_count > 0 && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <FileText className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {email.metadata.attachments_count} pièce{email.metadata.attachments_count > 1 ? 's' : ''} jointe{email.metadata.attachments_count > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
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
                        {format(new Date(selectedEmail.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <div className="flex gap-2">{getStatusBadge(selectedEmail.status)}</div>
                  </div>

                  {/* Warning banner for missing email content */}
                  {selectedEmail.metadata?.content_available === false && (
                    <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                            Contenu email non disponible
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Resend ne fournit pas le contenu des emails entrants via l'API. Pour afficher le contenu
                            complet, configurez l'inbound parsing ou utilisez un service tiers comme Mailgun.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {selectedEmail.direction === "incoming" && (
                      <Button size="sm" variant="outline" onClick={() => handleReply(selectedEmail)}>
                        <Reply className="w-4 h-4 mr-2" />
                        Répondre
                      </Button>
                    )}
                    {selectedEmail.folder !== "trash" && (
                      <Button size="sm" variant="outline" onClick={() => moveToFolder(selectedEmail.id, "trash")}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Corbeille
                      </Button>
                    )}
                    {selectedEmail.folder === "trash" && (
                      <Button size="sm" variant="outline" onClick={() => moveToFolder(selectedEmail.id, "inbox")}>
                        <Archive className="w-4 h-4 mr-2" />
                        Restaurer
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => {
                        deleteEmail(selectedEmail.id);
                        setSelectedEmail(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer définitivement
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <div className="bg-muted/30 rounded-lg p-4">
                      {selectedEmail.html_body && selectedEmail.html_body.trim() ? (
                        <div
                          className="prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }}
                        />
                      ) : selectedEmail.body && selectedEmail.body.trim() ? (
                        <p className="whitespace-pre-wrap text-sm">{selectedEmail.body}</p>
                      ) : (
                        <div className="text-center py-8">
                          <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground text-sm">Email reçu sans contenu texte</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachments Section */}
                  {selectedEmail.metadata?.attachments && selectedEmail.metadata.attachments.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Pièces jointes ({selectedEmail.metadata.attachments.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedEmail.metadata.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{attachment.filename}</p>
                                <p className="text-xs text-muted-foreground">
                                  {attachment.content_type} • {(attachment.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                try {
                                  // Download attachment via Resend API
                                  const { data, error } = await supabase.functions.invoke("download-email-attachment", {
                                    body: {
                                      emailId: selectedEmail.metadata?.email_id,
                                      attachmentId: attachment.id,
                                    },
                                  });

                                  if (error) throw error;

                                  // Open attachment in new tab or download
                                  toast({
                                    title: "Téléchargement",
                                    description: `Téléchargement de ${attachment.filename}...`,
                                  });
                                } catch (error: any) {
                                  toast({
                                    title: "Erreur",
                                    description: error.message || "Impossible de télécharger la pièce jointe",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Télécharger
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

          {/* Template Selection Dialog */}
          <TemplateDialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
            <TemplateDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <TemplateDialogHeader>
                <TemplateDialogTitle>Choisir un Template</TemplateDialogTitle>
              </TemplateDialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => applyTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{template.name}</h3>
                          <p className="text-sm text-muted-foreground">{template.subject}</p>
                        </div>
                        <Badge>{template.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm line-clamp-3">{template.body}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(Array.isArray(template.variables) ? template.variables : []).map((variable: string) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TemplateDialogContent>
          </TemplateDialog>
        </CardContent>
      </Card>
    </div>
  );
}
