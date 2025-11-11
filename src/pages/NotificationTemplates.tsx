import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/lib/language';
import { toast } from 'sonner';
import { Mail, Bell, Monitor, Edit, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  title_fr: string;
  title_en: string;
  message_fr: string;
  message_en: string;
  email_subject_fr: string | null;
  email_subject_en: string | null;
  email_body_fr: string | null;
  email_body_en: string | null;
  action_label_fr: string | null;
  action_label_en: string | null;
  action_url: string | null;
  send_email: boolean;
  send_in_app: boolean;
  send_browser: boolean;
  is_active: boolean;
}

export default function NotificationTemplates() {
  const { t, language } = useTranslation();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as NotificationTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error(t.notificationTemplates.loadError);
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = async (templateId: string, channel: 'send_email' | 'send_in_app' | 'send_browser', value: boolean) => {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({ [channel]: value })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, [channel]: value } : t
      ));

      toast.success(t.notificationTemplates.updateSuccess);
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error(t.notificationTemplates.updateError);
    }
  };

  const toggleActive = async (templateId: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({ is_active: value })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, is_active: value } : t
      ));

      toast.success(t.notificationTemplates.statusUpdated);
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error(t.notificationTemplates.updateError);
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      optimization: 'bg-green-500',
      usage: 'bg-red-500',
      sync: 'bg-blue-500',
      seo: 'bg-purple-500',
      blog: 'bg-orange-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary',
    };
    return variants[priority] || 'outline';
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, NotificationTemplate[]>);

  const handlePreview = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {t.notificationTemplates.title}
        </h1>
        <p className="text-muted-foreground">
          {t.notificationTemplates.subtitle}
        </p>
      </div>

      <Tabs defaultValue={Object.keys(groupedTemplates)[0]} className="space-y-4">
        <TabsList>
          {Object.keys(groupedTemplates).map(category => (
            <TabsTrigger key={category} value={category} className="capitalize">
              <Badge className={`mr-2 ${getCategoryBadge(category)}`}>
                {groupedTemplates[category].length}
              </Badge>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
          <TabsContent key={category} value={category}>
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{category}</CardTitle>
                <CardDescription>
                  {`${categoryTemplates.length} ${t.notificationTemplates.templates}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.notificationTemplates.name}</TableHead>
                      <TableHead>{t.notificationTemplates.priority}</TableHead>
                      <TableHead className="text-center">
                        <Mail className="h-4 w-4 inline mr-1" />
                        Email
                      </TableHead>
                      <TableHead className="text-center">
                        <Bell className="h-4 w-4 inline mr-1" />
                        In-App
                      </TableHead>
                      <TableHead className="text-center">
                        <Monitor className="h-4 w-4 inline mr-1" />
                        {t.notificationTemplates.browser}
                      </TableHead>
                      <TableHead>{t.notificationTemplates.status}</TableHead>
                      <TableHead>{t.notificationTemplates.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryTemplates.map(template => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{template.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{template.code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadge(template.priority)}>
                            {template.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={template.send_email}
                            onCheckedChange={(checked) => toggleChannel(template.id, 'send_email', checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={template.send_in_app}
                            onCheckedChange={(checked) => toggleChannel(template.id, 'send_in_app', checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={template.send_browser}
                            onCheckedChange={(checked) => toggleChannel(template.id, 'send_browser', checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={template.is_active}
                            onCheckedChange={(checked) => toggleActive(template.id, checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(template)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {t.notificationTemplates.preview}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {selectedTemplate && (
              <div className="space-y-6">
                {/* In-App Preview */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    {t.notificationTemplates.inApp}
                  </h3>
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-semibold">
                        {language === 'fr' ? selectedTemplate.title_fr : selectedTemplate.title_en}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-2">
                        {language === 'fr' ? selectedTemplate.message_fr : selectedTemplate.message_en}
                      </p>
                      {selectedTemplate.action_label_fr && (
                        <Button size="sm" className="mt-3">
                          {language === 'fr' ? selectedTemplate.action_label_fr : selectedTemplate.action_label_en}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Email Preview */}
                {selectedTemplate.send_email && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </h3>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="mb-2">
                          <span className="font-semibold">Subject:</span>{' '}
                          {language === 'fr' ? selectedTemplate.email_subject_fr : selectedTemplate.email_subject_en}
                        </div>
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: language === 'fr' ? selectedTemplate.email_body_fr || '' : selectedTemplate.email_body_en || ''
                          }}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
