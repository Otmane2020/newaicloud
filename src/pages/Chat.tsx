import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Send, Bot, User, ShoppingCart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: any[];
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant intelligent connecté à votre catalogue Shopify. Je peux vous aider à trouver des produits, obtenir des informations sur votre inventaire, et suggérer des articles à vos clients. Comment puis-je vous aider aujourd\'hui ?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('seller_id', user?.id)
        .limit(100);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Create a context-aware prompt with product data
      const context = `Tu es un assistant commercial intelligent connecté à un catalogue Shopify. 
Voici le catalogue actuel (${products.length} produits):
${products.slice(0, 20).map(p => `- ${p.title}: ${p.price}€ ${p.description ? '- ' + p.description.substring(0, 100) : ''}`).join('\n')}

L'utilisateur demande: ${input}

Réponds de manière professionnelle et suggère des produits pertinents si approprié. Si tu suggères des produits, formate-les comme: [PRODUCT:id:title]`;

      const { data, error } = await supabase.functions.invoke('chat-smart', {
        body: { 
          message: context,
          products: products.slice(0, 20)
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Désolé, je n\'ai pas pu traiter votre demande.'
      };

      // Parse product suggestions from response
      const productPattern = /\[PRODUCT:([^:]+):([^\]]+)\]/g;
      const suggestedProducts: any[] = [];
      let match;

      while ((match = productPattern.exec(assistantMessage.content)) !== null) {
        const productId = match[1];
        const product = products.find(p => p.id === productId);
        if (product) {
          suggestedProducts.push(product);
        }
      }

      if (suggestedProducts.length > 0) {
        assistantMessage.products = suggestedProducts;
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi du message');
      
      // Fallback response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Désolé, je rencontre un problème technique. Veuillez réessayer.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <MessageSquare className="w-10 h-10 text-primary" />
            Chat Smart
          </h1>
          <p className="text-muted-foreground text-lg">
            Assistant intelligent connecté à votre catalogue Shopify
          </p>
          <div className="flex gap-2 mt-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {products.length} produits disponibles
            </Badge>
            <Badge variant="outline">Propulsé par IA</Badge>
          </div>
        </div>

        <Card className="h-[calc(100vh-280px)] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                )}
                
                <div className={`flex flex-col gap-2 max-w-[80%]`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {/* Product suggestions */}
                  {message.products && message.products.length > 0 && (
                    <div className="space-y-2">
                      {message.products.map((product, idx) => (
                        <Card key={idx} className="p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-semibold">{product.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.price}€
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              toast.success('Produit ajouté au panier !');
                            }}
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <div className="bg-secondary rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Posez une question sur vos produits..."
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Appuyez sur Entrée pour envoyer • Shift+Entrée pour nouvelle ligne
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}