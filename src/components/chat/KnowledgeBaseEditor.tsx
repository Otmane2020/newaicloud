import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Brain, Loader2, Lightbulb, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface KnowledgeItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
  is_active: boolean;
}

const categories = [
  { value: 'delivery', label: '🚚 Livraison', icon: '🚚' },
  { value: 'return', label: '🔄 Retours', icon: '🔄' },
  { value: 'pickup', label: '📦 Points Retrait', icon: '📦' },
  { value: 'payment', label: '💳 Paiement', icon: '💳' },
  { value: 'support', label: '📱 Support', icon: '📱' },
  { value: 'general', label: 'ℹ️ Général', icon: 'ℹ️' },
];

const templates = [
  { category: 'delivery', question: 'Quels sont les délais de livraison ?', answer: 'Les délais de livraison standard sont de 3 à 5 jours ouvrés.' },
  { category: 'delivery', question: 'Quelles sont les zones de livraison ?', answer: 'Nous livrons en France métropolitaine, Corse et dans toute l\'Europe.' },
  { category: 'return', question: 'Quelle est la politique de retour ?', answer: 'Vous disposez de 14 jours pour retourner un article non utilisé.' },
  { category: 'pickup', question: 'Où puis-je retirer ma commande ?', answer: 'Le retrait en magasin est disponible dans nos points de vente.' },
  { category: 'payment', question: 'Quels moyens de paiement acceptez-vous ?', answer: 'Nous acceptons CB, Visa, Mastercard, PayPal et virement bancaire.' },
  { category: 'support', question: 'Comment vous contacter ?', answer: 'Vous pouvez nous contacter par email ou téléphone du lundi au vendredi.' },
];

export default function KnowledgeBaseEditor() {
  const { toast } = useToast();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('delivery');
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState('');
  const [testing, setTesting] = useState(false);

  const [formData, setFormData] = useState({
    category: 'delivery',
    question: '',
    answer: '',
    keywords: '',
    priority: 0,
  });

  const loadKnowledge = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_knowledge_base')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading knowledge:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la base de connaissances",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledge();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const keywords = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      if (editingItem) {
        const { error } = await supabase
          .from('chat_knowledge_base')
          .update({
            category: formData.category,
            question: formData.question,
            answer: formData.answer,
            keywords,
            priority: formData.priority,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: "Question mise à jour avec succès" });
      } else {
        const { error } = await supabase
          .from('chat_knowledge_base')
          .insert({
            user_id: user.id,
            category: formData.category,
            question: formData.question,
            answer: formData.answer,
            keywords,
            priority: formData.priority,
          });

        if (error) throw error;
        toast({ title: "Question ajoutée avec succès" });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({ category: 'delivery', question: '', answer: '', keywords: '', priority: 0 });
      loadKnowledge();
    } catch (error) {
      console.error('Error saving knowledge:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) return;

    try {
      const { error } = await supabase
        .from('chat_knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Question supprimée" });
      loadKnowledge();
    } catch (error) {
      console.error('Error deleting knowledge:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      question: item.question,
      answer: item.answer,
      keywords: item.keywords.join(', '),
      priority: item.priority,
    });
    setIsDialogOpen(true);
  };

  const useTemplate = (template: typeof templates[0]) => {
    setFormData({
      category: template.category,
      question: template.question,
      answer: template.answer,
      keywords: '',
      priority: 0,
    });
    setIsDialogOpen(true);
  };

  const testKnowledge = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-smart', {
        body: {
          messages: [{ role: 'user', content: testQuery }],
          context: { includeKnowledge: true },
        },
      });

      if (error) throw error;
      setTestResult(data.response || 'Aucune réponse');
    } catch (error) {
      console.error('Error testing:', error);
      toast({
        title: "Erreur",
        description: "Impossible de tester",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const getCategoryItems = (category: string) => {
    return items.filter(item => item.category === category);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Base de Connaissances
              </CardTitle>
              <CardDescription>
                Enrichissez les réponses de votre assistant avec vos informations
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingItem(null);
                  setFormData({ category: activeCategory, question: '', answer: '', keywords: '', priority: 0 });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Modifier la question' : 'Nouvelle question'}
                  </DialogTitle>
                  <DialogDescription>
                    Ajoutez des informations que l'assistant utilisera pour répondre
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Catégorie</Label>
                    <select
                      className="w-full mt-1 p-2 border rounded-md"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Question</Label>
                    <Input
                      value={formData.question}
                      onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                      required
                      placeholder="Quelle est la question ?"
                    />
                  </div>
                  <div>
                    <Label>Réponse</Label>
                    <Textarea
                      value={formData.answer}
                      onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                      required
                      rows={4}
                      placeholder="La réponse détaillée..."
                    />
                  </div>
                  <div>
                    <Label>Mots-clés (séparés par des virgules)</Label>
                    <Input
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      placeholder="livraison, délai, expédition"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingItem ? 'Mettre à jour' : 'Ajouter'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                {categories.map(cat => (
                  <TabsTrigger key={cat.value} value={cat.value}>
                    {cat.icon}
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map(cat => (
                <TabsContent key={cat.value} value={cat.value} className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    {getCategoryItems(cat.value).length} question(s) dans cette catégorie
                  </div>
                  
                  {getCategoryItems(cat.value).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Aucune question dans cette catégorie</p>
                    </div>
                  ) : (
                    getCategoryItems(cat.value).map(item => (
                      <Card key={item.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{item.question}</CardTitle>
                              <CardDescription className="mt-2 whitespace-pre-wrap">
                                {item.answer}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        {item.keywords.length > 0 && (
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {item.keywords.map(keyword => (
                                <Badge key={keyword} variant="secondary">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Questions suggérées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {templates.filter(t => t.category === activeCategory).map((template, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="justify-start text-left h-auto py-3"
                onClick={() => useTemplate(template)}
              >
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{template.question}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Tester le chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Posez une question pour tester la base..."
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
            />
            <Button onClick={testKnowledge} disabled={testing || !testQuery}>
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Tester
            </Button>
            {testResult && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold mb-2">Réponse de l'assistant :</p>
                <p className="whitespace-pre-wrap">{testResult}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}