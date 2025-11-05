import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Trash2, 
  Clock, 
  ChevronRight,
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
  ShoppingBag,
  Filter,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isAfter, isBefore, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ChatSession {
  id: string;
  title: string | null;
  last_message: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
  session_id: string;
  products?: any[];
}

interface Product {
  id: string;
  title: string;
  price: string;
  compare_at_price?: string;
  image_url?: string;
  category?: string;
}

interface RawChatMessage {
  id: string;
  content: string;
  role: string;
  created_at: string;
  session_id: string;
  products?: Json;
}

export default function ChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingSessions, setDeletingSessions] = useState<Set<string>>(new Set());
  
  // Filtres avancés
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [messageCountFilter, setMessageCountFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sessions, searchTerm, dateFilter, productFilter, messageCountFilter]);

  const applyFilters = async () => {
    let filtered = [...sessions];

    // Filtre de recherche textuelle
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(session =>
        session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par date
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.updated_at);
        switch (dateFilter) {
          case 'today':
            return sessionDate.toDateString() === now.toDateString();
          case 'week':
            return isAfter(sessionDate, subDays(now, 7));
          case 'month':
            return isAfter(sessionDate, subDays(now, 30));
          default:
            return true;
        }
      });
    }

    // Filtre par nombre de messages
    if (messageCountFilter !== 'all') {
      filtered = filtered.filter(session => {
        switch (messageCountFilter) {
          case 'few':
            return session.message_count <= 5;
          case 'medium':
            return session.message_count > 5 && session.message_count <= 15;
          case 'many':
            return session.message_count > 15;
          default:
            return true;
        }
      });
    }

    // Filtre par présence de produits
    if (productFilter !== 'all') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sessionIds = filtered.map(s => s.id);
      
      const { data: messagesWithProducts } = await supabase
        .from('chat_messages')
        .select('session_id, products')
        .in('session_id', sessionIds)
        .not('products', 'is', null);

      const sessionsWithProducts = new Set(
        messagesWithProducts
          ?.filter(msg => msg.products && Array.isArray(msg.products) && msg.products.length > 0)
          .map(msg => msg.session_id) || []
      );

      filtered = filtered.filter(session => {
        if (productFilter === 'with') {
          return sessionsWithProducts.has(session.id);
        } else if (productFilter === 'without') {
          return !sessionsWithProducts.has(session.id);
        }
        return true;
      });
    }

    setFilteredSessions(filtered);
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté pour voir votre historique');
        return;
      }

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Erreur lors du chargement des sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      setLoadingMessages(true);
      setSelectedSession(sessionId);
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        throw error;
      }
      
      console.log('Messages loaded:', data);
      
      const formattedMessages: ChatMessage[] = (data || []).map((msg: RawChatMessage) => {
        let products: any[] = [];
        
        if (msg.products) {
          if (Array.isArray(msg.products)) {
            products = msg.products;
          } else if (typeof msg.products === 'object') {
            products = [msg.products];
          }
        }
        
        return {
          ...msg,
          role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'assistant',
          products: products
        };
      });
      
      console.log('Formatted messages:', formattedMessages);
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erreur lors du chargement des messages');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) return;

    try {
      setDeletingSessions(prev => new Set(prev).add(sessionId));
      
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      toast.success('Conversation supprimée');
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (selectedSession === sessionId) {
        setSelectedSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const clearAllSessions = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes vos conversations ? Cette action est irréversible.')) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success('Toutes les conversations ont été supprimées');
      setSessions([]);
      setSelectedSession(null);
      setMessages([]);
    } catch (error) {
      console.error('Error clearing all sessions:', error);
      toast.error('Erreur lors de la suppression des conversations');
    } finally {
      setLoading(false);
    }
  };

  const formatLastMessage = useCallback((message: string | null) => {
    if (!message) return '';
    return message.length > 100 ? `${message.substring(0, 100)}...` : message;
  }, []);

  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white border rounded-lg p-3 mb-2 shadow-sm">
      <div className="flex items-start gap-3">
        {product.image_url && (
          <img 
            src={product.image_url} 
            alt={product.title}
            className="w-12 h-12 object-cover rounded"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {product.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-semibold text-primary">
              {product.price} €
            </span>
            {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
              <span className="text-xs text-muted-foreground line-through">
                {product.compare_at_price} €
              </span>
            )}
          </div>
          {product.category && (
            <Badge variant="outline" className="mt-1 text-xs">
              {product.category}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Chargement de l'historique...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Historique des conversations</h1>
            <p className="text-muted-foreground">
              {sessions.length} conversation{sessions.length !== 1 ? 's' : ''} au total
            </p>
          </div>
          {sessions.length > 0 && (
            <Button
              variant="outline"
              onClick={clearAllSessions}
              disabled={loading}
              className="text-destructive border-destructive hover:bg-destructive hover:text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Tout supprimer
            </Button>
          )}
        </div>

        {sessions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher dans les conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filtres
                  {(dateFilter !== 'all' || productFilter !== 'all' || messageCountFilter !== 'all') && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                      {[dateFilter, productFilter, messageCountFilter].filter(f => f !== 'all').length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Filtres avancés</h4>
                    {(dateFilter !== 'all' || productFilter !== 'all' || messageCountFilter !== 'all') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDateFilter('all');
                          setProductFilter('all');
                          setMessageCountFilter('all');
                        }}
                        className="h-auto p-1 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Réinitialiser
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Période</label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les périodes</SelectItem>
                        <SelectItem value="today">Aujourd'hui</SelectItem>
                        <SelectItem value="week">Cette semaine</SelectItem>
                        <SelectItem value="month">Ce mois-ci</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Produits suggérés</label>
                    <Select value={productFilter} onValueChange={setProductFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les conversations</SelectItem>
                        <SelectItem value="with">Avec produits</SelectItem>
                        <SelectItem value="without">Sans produits</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre de messages</label>
                    <Select value={messageCountFilter} onValueChange={setMessageCountFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="few">Courtes (≤ 5 messages)</SelectItem>
                        <SelectItem value="medium">Moyennes (6-15 messages)</SelectItem>
                        <SelectItem value="many">Longues ({'>'}15 messages)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <Card className="text-center">
          <CardContent className="py-16">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Aucune conversation</h3>
            <p className="text-muted-foreground mb-6">
              Vos conversations avec l'assistant IA apparaîtront ici
            </p>
            <Button onClick={loadSessions} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </CardContent>
        </Card>
      ) : filteredSessions.length === 0 ? (
        <Card className="text-center">
          <CardContent className="py-16">
            <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Aucun résultat</h3>
            <p className="text-muted-foreground">
              Aucune conversation ne correspond à votre recherche
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des sessions */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Conversations</h2>
              <Badge variant="secondary">{filteredSessions.length}</Badge>
            </div>
            
            <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {filteredSessions.map((session) => (
                <Card
                  key={session.id}
                  className={`cursor-pointer transition-all hover:shadow-md border-2 ${
                    selectedSession === session.id 
                      ? 'border-primary shadow-md' 
                      : 'border-transparent hover:border-muted-foreground/20'
                  }`}
                  onClick={() => loadMessages(session.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate text-left">
                          {session.title || 'Conversation sans titre'}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {formatDistanceToNow(new Date(session.updated_at), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        disabled={deletingSessions.has(session.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      >
                        {deletingSessions.has(session.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {session.last_message && (
                      <p className="text-sm text-muted-foreground text-left leading-relaxed">
                        {formatLastMessage(session.last_message)}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="outline" className="text-xs">
                        {session.message_count} message{session.message_count > 1 ? 's' : ''}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Messages de la session sélectionnée */}
          <div className="lg:col-span-2">
            {selectedSession ? (
              <Card className="h-[calc(100vh-12rem)] flex flex-col">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="flex items-center gap-2">
                    {loadingMessages && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    Messages de la conversation
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">Aucun message dans cette conversation</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map((message) => (
                        <div key={message.id}>
                          <div
                            className={`flex ${
                              message.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl p-4 transition-all ${
                                message.role === 'user'
                                  ? 'bg-primary text-primary-foreground rounded-br-none'
                                  : 'bg-muted border rounded-bl-none'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {message.content}
                              </p>
                              <p
                                className={`text-xs mt-2 ${
                                  message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}
                              >
                                {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                              </p>
                            </div>
                          </div>
                          
                          {/* Affichage des produits pour les messages de l'assistant */}
                          {message.role === 'assistant' && message.products && message.products.length > 0 && (
                            <div className="mt-3 ml-4 max-w-[85%]">
                              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                                <ShoppingBag className="w-4 h-4" />
                                Produits suggérés ({message.products.length})
                              </div>
                              <div className="grid gap-2">
                                {message.products.map((product, index) => (
                                  <ProductCard key={index} product={product} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-[calc(100vh-12rem)] flex items-center justify-center">
                <CardContent className="text-center">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Aucune conversation sélectionnée</h3>
                  <p className="text-muted-foreground">
                    Cliquez sur une conversation pour afficher les messages
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}