import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Copy, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/lib/language';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  html_body: string | null;
  category: string;
  variables: any;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface EmailTemplatesProps {
  onSelectTemplate?: (template: EmailTemplate) => void;
}

export function EmailTemplates({ onSelectTemplate }: EmailTemplatesProps) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [category, setCategory] = useState('general');
  const [variables, setVariables] = useState('nom, email, plan');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data?.map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : []
      })) || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: t.superAdmin.emailTemplates.toasts.loadError.split(' ')[0],
        description: t.superAdmin.emailTemplates.toasts.loadError,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSubject('');
    setBody('');
    setHtmlBody('');
    setCategory('general');
    setVariables('nom, email, plan');
    setEditingTemplate(null);
  };

  const openEditDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setSubject(template.subject);
    setBody(template.body);
    setHtmlBody(template.html_body || '');
    setCategory(template.category);
    setVariables(template.variables.join(', '));
    setIsDialogOpen(true);
  };

  const saveTemplate = async () => {
    if (!name || !subject || !body) {
      toast({
        title: t.common.error,
        description: t.superAdmin.emailTemplates.toasts.fillRequired,
        variant: 'destructive'
      });
      return;
    }

    try {
      const variablesArray = variables.split(',').map(v => v.trim()).filter(v => v);
      
      if (editingTemplate) {
        // Update
        const { error } = await supabase
          .from('email_templates')
          .update({
            name,
            subject,
            body,
            html_body: htmlBody || null,
            category,
            variables: variablesArray
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({ title: t.common.success, description: t.superAdmin.emailTemplates.toasts.updated });
      } else {
        // Create
        const { error } = await supabase
          .from('email_templates')
          .insert({
            name,
            subject,
            body,
            html_body: htmlBody || null,
            category,
            variables: variablesArray
          });

        if (error) throw error;
        toast({ title: t.common.success, description: t.superAdmin.emailTemplates.toasts.created });
      }

      setIsDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: t.common.error,
        description: error.message || t.superAdmin.emailTemplates.toasts.saveError,
        variant: 'destructive'
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm(t.superAdmin.emailTemplates.deleteConfirm)) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: t.common.success, description: t.superAdmin.emailTemplates.toasts.deleted });
      loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: t.common.error,
        description: t.superAdmin.emailTemplates.toasts.deleteError,
        variant: 'destructive'
      });
    }
  };

  const duplicateTemplate = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .insert({
          name: `${template.name} (Copie)`,
          subject: template.subject,
          body: template.body,
          html_body: template.html_body,
          category: template.category,
          variables: template.variables
        });

      if (error) throw error;
      
      toast({ title: t.common.success, description: t.superAdmin.emailTemplates.toasts.duplicated });
      loadTemplates();
    } catch (error: any) {
      console.error('Error duplicating template:', error);
      toast({
        title: t.common.error,
        description: t.superAdmin.emailTemplates.toasts.duplicateError,
        variant: 'destructive'
      });
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      onboarding: 'bg-green-500',
      support: 'bg-blue-500',
      sales: 'bg-purple-500',
      general: 'bg-gray-500'
    };
    return <Badge className={colors[category] || 'bg-gray-500'}>{category}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t.superAdmin.emailTemplates.title}</h2>
          <p className="text-muted-foreground">{t.superAdmin.emailTemplates.description}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              {t.superAdmin.emailTemplates.newTemplate}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? t.superAdmin.emailTemplates.editTemplate : t.superAdmin.emailTemplates.newTemplate}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">{t.superAdmin.emailTemplates.form.name} *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Bienvenue"
                  />
                </div>
                <div>
                  <Label htmlFor="category">{t.superAdmin.emailTemplates.form.category}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{t.superAdmin.emailTemplates.categories.general}</SelectItem>
                      <SelectItem value="onboarding">{t.superAdmin.emailTemplates.categories.onboarding}</SelectItem>
                      <SelectItem value="support">{t.superAdmin.emailTemplates.categories.support}</SelectItem>
                      <SelectItem value="sales">{t.superAdmin.emailTemplates.categories.sales}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="subject">{t.superAdmin.emailTemplates.form.subject} *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Bienvenue {{nom}} !"
                />
              </div>

              <div>
                <Label htmlFor="variables">{t.superAdmin.emailTemplates.form.variables}</Label>
                <Input
                  id="variables"
                  value={variables}
                  onChange={(e) => setVariables(e.target.value)}
                  placeholder={t.superAdmin.emailTemplates.form.variablesPlaceholder}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t.superAdmin.emailTemplates.form.variablesHelp}
                </p>
              </div>

              <div>
                <Label htmlFor="body">{t.superAdmin.emailTemplates.form.bodyText} *</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Bonjour {{nom}},&#10;&#10;Votre message ici..."
                  rows={6}
                />
              </div>

              <div>
                <Label htmlFor="htmlBody">{t.superAdmin.emailTemplates.form.bodyHtml}</Label>
                <Textarea
                  id="htmlBody"
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder="<div><p>Bonjour {{nom}},</p>...</div>"
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t.superAdmin.emailTemplates.buttons.cancel}
                </Button>
                <Button onClick={saveTemplate}>
                  {editingTemplate ? t.superAdmin.emailTemplates.buttons.update : t.superAdmin.emailTemplates.buttons.create}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{template.subject}</p>
                </div>
                {getCategoryBadge(template.category)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">{template.body}</p>
                
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(template.variables) ? template.variables : []).map((variable: string) => (
                    <Badge key={variable} variant="outline" className="text-xs">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground">
                  {t.superAdmin.emailTemplates.usageCount.replace('{count}', template.usage_count.toString())}
                </div>

                <div className="flex gap-2 pt-2">
                  {onSelectTemplate && (
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={() => onSelectTemplate(template)}
                    >
                      {t.superAdmin.emailTemplates.buttons.use}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(template)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => duplicateTemplate(template)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.superAdmin.emailTemplates.preview.title}: {previewTemplate.name}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <Label>{t.superAdmin.emailTemplates.preview.subject}</Label>
                  <p className="font-semibold">{previewTemplate.subject}</p>
                </div>
                {previewTemplate.html_body ? (
                  <div>
                    <Label>{t.superAdmin.emailTemplates.preview.htmlPreview}</Label>
                    <div 
                      className="border rounded-lg p-4 mt-2"
                      dangerouslySetInnerHTML={{ __html: previewTemplate.html_body }}
                    />
                  </div>
                ) : (
                  <div>
                    <Label>{t.superAdmin.emailTemplates.preview.body}</Label>
                    <p className="whitespace-pre-wrap border rounded-lg p-4 mt-2">
                      {previewTemplate.body}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
