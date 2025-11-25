import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Mail,
  Send,
  Plus,
  TestTube,
  Reply,
  Trash2,
  Archive,
  FileText,
  AlertCircle,
  Search,
  Menu,
  X,
  RefreshCw,
  Filter,
  Star,
  StarOff,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { EmailSidebar } from "./EmailSidebar";
import { TemplateDialog } from "./TemplateDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/use-debounce";
import { MobileSidebar } from "./MobileSidebar";
import { EmailSkeleton } from "./EmailSkeleton";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  html_body: string | null;
  category: string;
  variables: string[];
  usage_count: number;
  is_favorite?: boolean;
}

interface AdminEmail {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  html_body: string | null;
  status: "sent" | "pending" | "failed" | "received" | "read";
  direction: "incoming" | "outgoing";
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
    priority?: "high" | "normal" | "low";
  };
}

interface EmailStats {
  inbox: number;
  sent: number;
  drafts: number;
  trash: number;
  spam: number;
  starred: number;
}

interface EmailFilters {
  status: string[];
  dateRange: {
    from: string;
    to: string;
  };
  hasAttachments: boolean;
  unreadOnly: boolean;
  starredOnly: boolean;
}

export function EmailInbox() {
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats>({
    inbox: 0,
    sent: 0,
    drafts: 0,
    trash: 0,
    spam: 0,
    starred: 0,
  });
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<AdminEmail | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<EmailFilters>({
    status: [],
    dateRange: { from: "", to: "" },
    hasAttachments: false,
    unreadOnly: false,
    starredOnly: false,
  });
  const [refreshing, setRefreshing] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const debouncedSearch = useDebounce(search, 300);

  // Form state
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isHtmlMode, setIsHtmlMode] = useState(false);

  // Load emails with error handling and performance optimization
  const loadEmails = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("admin_emails")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200); // Limit for performance

      if (error) throw error;
      setEmails((data || []) as AdminEmail[]);
    } catch (error) {
      console.error("Error loading emails:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  // Load email statistics
  const loadEmailStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("admin_emails")
        .select("direction, status, is_read, folder");

      if (error) throw error;

      const stats = {
        inbox:
          data?.filter((e) => e.direction === "incoming" && e.folder !== "trash" && e.folder !== "spam").length || 0,
        sent: data?.filter((e) => e.direction === "outgoing").length || 0,
        drafts: data?.filter((e) => e.folder === "drafts").length || 0,
        trash: data?.filter((e) => e.folder === "trash").length || 0,
        spam: data?.filter((e) => e.folder === "spam").length || 0,
        starred: 0,
      };

      setEmailStats(stats);
    } catch (error) {
      console.error("Error loading email stats:", error);
    }
  }, []);

  // Load email templates
  const loadTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("is_favorite", { ascending: false });

      if (error) throw error;
      setTemplates(
        data?.map((t) => ({
          ...t,
          variables: Array.isArray(t.variables) 
            ? t.variables.map(v => typeof v === 'string' ? v : String(v))
            : [],
        })) || [],
      );
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  }, []);

  // Setup realtime subscription
  useEffect(() => {
    loadEmails();
    loadEmailStats();
    loadTemplates();

    const channel = supabase
      .channel("admin-emails")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_emails" }, () => {
        loadEmails();
        loadEmailStats();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [loadEmails, loadEmailStats, loadTemplates]);

  // Get unread count for folder
  const getUnreadCount = useCallback(
    (folder: string) => {
      return emails.filter((e) => {
        let inFolder = false;
        if (folder === "inbox") {
          inFolder = e.direction === "incoming" && e.folder !== "trash" && e.folder !== "spam";
        } else if (folder === "sent") {
          inFolder = e.direction === "outgoing";
        } else {
          inFolder = e.folder === folder;
        }
        return inFolder && !e.is_read;
      }).length;
    },
    [emails],
  );

  // Mark email as read
  const markAsRead = useCallback(
    async (emailId: string) => {
      try {
        const { error } = await supabase
          .from("admin_emails")
          .update({
            is_read: true,
            status: "read",
          })
          .eq("id", emailId);

        if (error) throw error;

        setEmails((prev) =>
          prev.map((email) => (email.id === emailId ? { ...email, is_read: true, status: "read" } : email)),
        );

        loadEmailStats();
      } catch (error) {
        console.error("Error marking email as read:", error);
      }
    },
    [loadEmailStats],
  );

  // Toggle star status (disabled - column doesn't exist in DB)
  const toggleStar = useCallback(
    async (emailId: string, currentlyStarred: boolean) => {
      toast({
        title: "Feature unavailable",
        description: "Star feature is not available in the current database schema.",
        variant: "destructive",
      });
    },
    [loadEmailStats],
  );

  // Apply template to compose form
  const applyTemplate = useCallback(
    async (template: EmailTemplate) => {
      try {
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

        const defaultData = {
          nom: to ? to.split("@")[0] : "",
          email: to || "",
          plan: "Trial",
          subject: subject || "",
        };

        const data = { ...defaultData, ...userData };

        let newSubject = template.subject;
        let newBody = template.html_body || template.body;

        template.variables.forEach((variable: string) => {
          const regex = new RegExp(`{{${variable}}}`, "g");
          const value = data[variable as keyof typeof data] || "";
          newSubject = newSubject.replace(regex, value);
          newBody = newBody.replace(regex, value);
        });

        setSubject(newSubject);
        setBody(newBody);
        setTemplatesOpen(false);

        await supabase
          .from("email_templates")
          .update({ usage_count: template.usage_count + 1 })
          .eq("id", template.id);

        toast({
          title: "Template appliqué",
          description: `Template "${template.name}" appliqué avec succès`,
        });
      } catch (error) {
        console.error("Error applying template:", error);
        toast({
          title: "Erreur",
          description: "Impossible d'appliquer le template",
          variant: "destructive",
        });
      }
    },
    [to, subject, toast],
  );

  // Send email
  const sendEmail = useCallback(async () => {
    if (!to || !subject || !body) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
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
          htmlBody: isHtmlMode ? body : `<p>${body.replace(/\n/g, "<br>")}</p>`,
        },
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Email envoyé avec succès",
      });

      const newEmail: AdminEmail = {
        id: crypto.randomUUID(),
        from_email: "support@newai.sale",
        to_email: to,
        subject,
        body,
        html_body: isHtmlMode ? body : `<p>${body.replace(/\n/g, "<br>")}</p>`,
        status: "sent",
        direction: "outgoing",
        folder: "sent",
        is_read: true,
        created_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        error_message: null,
        metadata: null,
      };

      setEmails((prev) => [newEmail, ...prev]);
      setEmailStats((stats) => ({
        ...stats,
        sent: stats.sent + 1,
      }));

      setTo("");
      setSubject("");
      setBody("");
      setReplyTo(null);
      setComposeOpen(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [to, subject, body, isHtmlMode, toast]);

  // Move email to folder
  const moveToFolder = useCallback(
    async (emailId: string, folder: string) => {
      try {
        const { error } = await supabase.from("admin_emails").update({ folder }).eq("id", emailId);

        if (error) throw error;

        toast({
          title: "Email déplacé",
          description: `Email déplacé vers ${folder}`,
        });

        loadEmails();
        loadEmailStats();
      } catch (error) {
        console.error("Error moving email:", error);
        toast({
          title: "Erreur",
          description: "Impossible de déplacer l'email",
          variant: "destructive",
        });
      }
    },
    [loadEmails, loadEmailStats, toast],
  );

  // Handle reply
  const handleReply = useCallback((email: AdminEmail) => {
    setReplyTo(email.from_email);
    setTo(email.from_email);
    setSubject(`Re: ${email.subject}`);
    setBody(
      `\n\n--- Email original ---\nDe: ${email.from_email}\nDate: ${format(new Date(email.created_at), "dd/MM/yyyy HH:mm")}\n\n${email.body}`,
    );
    setComposeOpen(true);
  }, []);

  // Simulate incoming email
  const simulateIncomingEmail = useCallback(async () => {
    try {
      const testEmail = {
        from: "client.test@example.com",
        to: "support@newai.sale",
        subject: `Test Email - ${new Date().toLocaleTimeString("fr-FR")}`,
        text: "Bonjour,\n\nCeci est un email de test pour vérifier la réception.\n\nCordialement",
        html: "<p>Bonjour,</p><p>Ceci est un email de test pour vérifier la réception.</p><p>Cordialement</p>",
      };

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
        metadata: {
          email_id: "simulated_" + Math.random().toString(36).substring(2),
          content_available: true,
          content_source: "simulation",
        },
      });

      if (error) throw error;

      toast({
        title: "Email de test reçu",
        description: "Un email de test a été ajouté à votre boîte de réception",
      });

      await loadEmails();
      await loadEmailStats();
    } catch (error: any) {
      console.error("Error simulating email:", error);
      toast({
        title: "Erreur",
        description: "Impossible de simuler l'email: " + error.message,
        variant: "destructive",
      });
    }
  }, [loadEmails, loadEmailStats, toast]);

  // Get status badge
  const getStatusBadge = useCallback((status: string) => {
    const colors: Record<string, string> = {
      sent: "bg-green-600 text-white",
      pending: "bg-yellow-600 text-white",
      failed: "bg-red-600 text-white",
      received: "bg-blue-600 text-white",
      read: "bg-gray-600 text-white",
    };
    return <Badge className={cn(colors[status] || "bg-gray-600 text-white", "text-xs")}>{status}</Badge>;
  }, []);

  // Filter emails based on active folder, search, and filters
  const filteredEmails = useMemo(() => {
    return emails.filter((e) => {
      // Folder filter
      let inFolder = false;
      if (activeFolder === "inbox") {
        inFolder = e.direction === "incoming" && e.folder !== "trash" && e.folder !== "spam";
      } else if (activeFolder === "sent") {
        inFolder = e.direction === "outgoing";
      } else if (activeFolder === "starred") {
        inFolder = false; // starred feature not available
      } else {
        inFolder = e.folder === activeFolder;
      }

      if (!inFolder) return false;

      // Search filter
      if (debouncedSearch.trim()) {
        const keyword = debouncedSearch.toLowerCase();
        const matchesSearch =
          e.subject?.toLowerCase().includes(keyword) ||
          e.body?.toLowerCase().includes(keyword) ||
          e.from_email?.toLowerCase().includes(keyword) ||
          e.to_email?.toLowerCase().includes(keyword);
        if (!matchesSearch) return false;
      }

      // Additional filters
      if (filters.unreadOnly && e.is_read) return false;
      if (filters.starredOnly) return false; // starred feature not available
      if (filters.hasAttachments && !e.metadata?.attachments_count) return false;

      return true;
    });
  }, [emails, activeFolder, debouncedSearch, filters]);

  // Mark as read when opening dialog
  useEffect(() => {
    if (selectedEmail && !selectedEmail.is_read) {
      markAsRead(selectedEmail.id);
    }
  }, [selectedEmail, markAsRead]);

  // Clean state on folder change
  useEffect(() => {
    setSelectedEmail(null);
    setSearch("");
  }, [activeFolder]);

  const isSuperAdmin = user?.email === "oben.rockman@gmail.com";

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEmails();
    await loadEmailStats();
  }, [loadEmails, loadEmailStats]);

  if (loading) {
    return <EmailSkeleton />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        activeFolder={activeFolder}
        onFolderChange={setActiveFolder}
        stats={emailStats}
        onRefresh={handleRefresh}
        loading={refreshing}
      />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 border-r bg-muted/10">
        <EmailSidebar
          activeFolder={activeFolder}
          onFolderChange={setActiveFolder}
          stats={emailStats}
          onRefresh={handleRefresh}
          loading={refreshing}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {activeFolder === "inbox" && "Boîte de réception"}
                {activeFolder === "sent" && "Emails envoyés"}
                {activeFolder === "drafts" && "Brouillons"}
                {activeFolder === "trash" && "Corbeille"}
                {activeFolder === "spam" && "Spam"}
                {activeFolder === "starred" && "Étoilés"}
                {getUnreadCount(activeFolder) > 0 && (
                  <Badge variant="default" className="ml-2">
                    {getUnreadCount(activeFolder)}
                  </Badge>
                )}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-10 w-40 md:w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <Button variant="outline" size="sm" onClick={simulateIncomingEmail} className="hidden sm:flex gap-2">
                <TestTube className="h-4 w-4" />
                <span className="hidden md:inline">Test</span>
              </Button>

              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>

              <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nouveau</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>{replyTo ? "Répondre" : "Nouvel email"}</DialogTitle>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <p className="text-sm text-muted-foreground">Utilisez un template pour gagner du temps</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Templates
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

                    <div className="flex items-center justify-between">
                      <Label htmlFor="body">Message</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsHtmlMode(!isHtmlMode)}>
                        {isHtmlMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {isHtmlMode ? "HTML" : "Texte"}
                      </Button>
                    </div>

                    <Textarea
                      id="body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={isHtmlMode ? "Votre message HTML..." : "Votre message..."}
                      rows={12}
                      className="font-mono text-sm"
                    />

                    <Button onClick={sendEmail} disabled={sending} className="w-full" size="lg">
                      {sending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Envoyer
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Email List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {filteredEmails.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {debouncedSearch ? "Aucun email trouvé" : "Aucun email dans ce dossier"}
                </p>
              </div>
            ) : (
              filteredEmails.map((email) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  activeFolder={activeFolder}
                  isSelected={selectedEmail?.id === email.id}
                  onSelect={() => setSelectedEmail(email)}
                  onToggleStar={() => toggleStar(email.id, false)}
                  getStatusBadge={getStatusBadge}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Email Detail Dialog */}
      {selectedEmail && (
        <EmailDetailDialog
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
          onReply={handleReply}
          onMoveToFolder={moveToFolder}
          getStatusBadge={getStatusBadge}
        />
      )}

      {/* Template Selection Dialog */}
      <TemplateDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        templates={templates}
        onApplyTemplate={applyTemplate}
      />
    </div>
  );
}

// Email List Item Component
interface EmailListItemProps {
  email: AdminEmail;
  activeFolder: string;
  isSelected: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  getStatusBadge: (status: string) => JSX.Element;
}

function EmailListItem({
  email,
  activeFolder,
  isSelected,
  onSelect,
  onToggleStar,
  getStatusBadge,
}: EmailListItemProps) {
  return (
    <div
      className={cn(
        "p-4 border rounded-lg cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-primary/20",
        !email.is_read ? "bg-primary/5 border-primary/20" : "bg-background",
        isSelected && "ring-2 ring-primary border-primary",
      )}
      onClick={onSelect}
    >
      <div className="flex gap-3">
        {/* Star Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
        >
          <StarOff className="h-4 w-4 text-muted-foreground" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {!email.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    !email.is_read ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {activeFolder === "sent" ? `À: ${email.to_email}` : `De: ${email.from_email}`}
                </p>
              </div>
              <p className={cn("font-semibold truncate", !email.is_read ? "text-foreground" : "text-muted-foreground")}>
                {email.subject}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
              {getStatusBadge(email.status)}
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(email.created_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </p>
            </div>
          </div>

          <p className={cn("text-sm line-clamp-2", !email.is_read ? "text-foreground" : "text-muted-foreground")}>
            {email.body || email.html_body?.replace(/<[^>]+>/g, "").substring(0, 120) || "Aucun aperçu disponible"}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-4 mt-2">
            {email.metadata?.attachments_count && email.metadata.attachments_count > 0 && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{email.metadata.attachments_count}</span>
              </div>
            )}

            {email.metadata?.priority === "high" && (
              <Badge variant="destructive" className="text-xs">
                Important
              </Badge>
            )}
          </div>

          {email.error_message && <p className="text-xs text-red-600 mt-2 truncate">Erreur: {email.error_message}</p>}
        </div>
      </div>
    </div>
  );
}

// Email Detail Dialog Component
interface EmailDetailDialogProps {
  email: AdminEmail;
  onClose: () => void;
  onReply: (email: AdminEmail) => void;
  onMoveToFolder: (emailId: string, folder: string) => void;
  getStatusBadge: (status: string) => JSX.Element;
}

function EmailDetailDialog({ email, onClose, onReply, onMoveToFolder, getStatusBadge }: EmailDetailDialogProps) {
  return (
    <Dialog open={!!email} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{email.subject}</span>
            {getStatusBadge(email.status)}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6">
            {/* Email Header */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-semibold">De:</span> {email.from_email}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">À:</span> {email.to_email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(email.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {email.direction === "incoming" && (
                  <Button size="sm" onClick={() => onReply(email)}>
                    <Reply className="h-4 w-4 mr-2" />
                    Répondre
                  </Button>
                )}

                {email.folder !== "trash" ? (
                  <Button size="sm" variant="outline" onClick={() => onMoveToFolder(email.id, "trash")}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => onMoveToFolder(email.id, "inbox")}>
                    <Archive className="h-4 w-4 mr-2" />
                    Restaurer
                  </Button>
                )}
              </div>
            </div>

            {/* Warning Banner */}
            {email.metadata?.content_available === false && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">Contenu email non disponible</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Resend ne fournit pas le contenu des emails entrants via l'API. Pour afficher le contenu complet,
                      configurez l'inbound parsing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Email Body */}
            <div className="border-t pt-4">
              <div className="bg-muted/30 rounded-lg p-4">
                {email.html_body && email.html_body.trim() && email.html_body !== "<html></html>" ? (
                  <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: email.html_body }}
                  />
                ) : email.body && email.body.trim() ? (
                  <pre className="whitespace-pre-wrap text-sm font-sans">{email.body}</pre>
                ) : (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground text-sm">Email reçu sans contenu texte</p>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments */}
            {email.metadata?.attachments && email.metadata.attachments.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Pièces jointes ({email.metadata.attachments.length})
                </h4>
                <div className="space-y-2">
                  {email.metadata.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {attachment.content_type} • {(attachment.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          // Download attachment logic
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {email.error_message && (
              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  <span className="font-semibold">Erreur:</span> {email.error_message}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
