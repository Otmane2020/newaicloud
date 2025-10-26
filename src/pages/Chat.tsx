import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Send, Bot, User, ShoppingCart, Sparkles, Code, Copy, Check, Settings as SettingsIcon } from 'lucide-react';
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
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat embed configuration
  const [chatPosition, setChatPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');
  const [welcomeMessage, setWelcomeMessage] = useState('Bonjour ! Comment puis-je vous aider aujourd\'hui ?');

  useEffect(() => {
    if (user) {
      loadProducts();
      createSession();
    }
  }, [user]);

  const createSession = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: 'Nouvelle conversation',
          message_count: 1,
          last_message: 'Bonjour ! Comment puis-je vous aider ?'
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

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

    // Save user message to session
    if (sessionId) {
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: input
      });

      await supabase
        .from('chat_sessions')
        .update({
          last_message: input,
          message_count: messages.length + 1,
          title: messages.length === 1 ? input.substring(0, 50) : undefined
        })
        .eq('id', sessionId);
    }

    try {
      // Create a context-aware prompt with product data
      const context = `Tu es un assistant commercial intelligent connecté à un catalogue Shopify. 
Voici le catalogue actuel (${products.length} produits):
${products.slice(0, 20).map(p => `- ${p.title}: ${p.price}€ ${p.description ? '- ' + p.description.substring(0, 100) : ''}`).join('\n')}

L'utilisateur demande: ${input}

Réponds de manière professionnelle et suggère des produits pertinents si approprié. Si tu suggères des produits, formate-les comme: [PRODUCT:id:title]`;

      const { data, error } = await supabase.functions.invoke('chat-smart', {
        body: { 
          userMessage: input,
          history: messages,
          sellerId: user?.id
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content || 'Désolé, je n\'ai pas pu traiter votre demande.',
        products: data.products || []
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to session
      if (sessionId) {
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: assistantMessage.content
        });

        await supabase
          .from('chat_sessions')
          .update({
            last_message: assistantMessage.content.substring(0, 200),
            message_count: messages.length + 2
          })
          .eq('id', sessionId);
      }
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

  // Generate embed code
  const embedCode = `<!-- Chat Intelligent Shopify - Powered by IA -->
<div id="smart-chat-widget"></div>

<script>
(function() {
  const config = {
    sellerId: '${user?.id || 'YOUR_SELLER_ID'}',
    position: '${chatPosition}',
    welcomeMessage: '${welcomeMessage}',
    apiUrl: 'https://votre-api.com/chat'
  };

  const positions = {
    'bottom-right': 'bottom: 20px; right: 20px;',
    'bottom-left': 'bottom: 20px; left: 20px;',
    'top-right': 'top: 20px; right: 20px;',
    'top-left': 'top: 20px; left: 20px;'
  };

  const widget = document.createElement('div');
  widget.id = 'smart-chat-container';
  widget.style.cssText = \`
    position: fixed;
    \${positions[config.position]}
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  \`;

  widget.innerHTML = \`
    <button id="chat-toggle" style="
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
      <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    </button>
    <div id="chat-window" style="
      display: none;
      width: 380px;
      height: 500px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      flex-direction: column;
      overflow: hidden;
      margin-bottom: 16px;
    ">
      <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 20px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 600;">💬 Assistant IA</h3>
        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">\${config.welcomeMessage}</p>
      </div>
      <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 16px;"></div>
      <div style="padding: 16px; border-top: 1px solid #e5e5e5;">
        <div style="display: flex; gap: 8px;">
          <input type="text" id="chat-input" placeholder="Votre message..." style="flex: 1; padding: 10px; border: 1px solid #e5e5e5; border-radius: 8px; outline: none;" />
          <button id="chat-send" style="padding: 10px 16px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border: none; border-radius: 8px; cursor: pointer;">Envoyer</button>
        </div>
      </div>
    </div>
  \`;

  document.body.appendChild(widget);

  const toggle = document.getElementById('chat-toggle');
  const window = document.getElementById('chat-window');
  const input = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');
  const messages = document.getElementById('chat-messages');

  toggle.onclick = () => {
    window.style.display = window.style.display === 'none' ? 'flex' : 'none';
  };

  send.onclick = sendMessage;
  input.onkeypress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    addMessage('user', message);
    input.value = '';

    // Call API
    fetch(config.apiUrl + '?seller_id=' + config.sellerId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
    .then(r => r.json())
    .then(data => {
      addMessage('assistant', data.response || 'Désolé, je n\\'ai pas compris.');
    })
    .catch(() => {
      addMessage('assistant', 'Erreur de connexion. Veuillez réessayer.');
    });
  }

  function addMessage(role, content) {
    const div = document.createElement('div');
    div.style.cssText = \`
      margin-bottom: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      \${role === 'user' ? 'background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; margin-left: 40px;' : 'background: #f3f4f6; margin-right: 40px;'}
      font-size: 14px;
      line-height: 1.5;
    \`;
    div.textContent = content;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
})();
</script>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Code copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary to-primary/50 rounded-2xl shadow-lg">
                <MessageSquare className="w-8 md:w-10 h-8 md:h-10 text-white" />
              </div>
              💬 Chat Smart AI
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Assistant intelligent connecté à votre catalogue Shopify
            </p>
            <div className="flex gap-2 mt-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {products.length} produits disponibles
              </Badge>
              <Badge variant="outline" className="bg-card">Propulsé par IA</Badge>
            </div>
          </div>
          <Button
            onClick={() => setShowEmbed(!showEmbed)}
            variant="outline"
            size="lg"
            className="bg-card hover:bg-card/80"
          >
            <Code className="w-4 h-4 mr-2" />
            {showEmbed ? 'Masquer' : 'Code Embed'}
          </Button>
        </div>

        {showEmbed && (
          <Card className="mb-6 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <SettingsIcon className="w-6 h-6 text-primary" />
                <div>
                  <h3 className="text-lg font-bold">Configuration du Chat Embed</h3>
                  <p className="text-sm text-muted-foreground">Personnalisez et intégrez le chat sur votre boutique</p>
                </div>
              </div>
              <Button onClick={handleCopyEmbed} variant="default">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copié!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copier le code
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="position">Position du widget</Label>
                <Select value={chatPosition} onValueChange={(value: any) => setChatPosition(value)}>
                  <SelectTrigger id="position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bas droite</SelectItem>
                    <SelectItem value="bottom-left">Bas gauche</SelectItem>
                    <SelectItem value="top-right">Haut droite</SelectItem>
                    <SelectItem value="top-left">Haut gauche</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="welcome">Message d'accueil</Label>
                <Input
                  id="welcome"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Message d'accueil personnalisé"
                />
              </div>
            </div>

            <div>
              <Label>Code d'intégration Shopify</Label>
              <Textarea
                readOnly
                value={embedCode}
                className="font-mono text-xs h-64 resize-none bg-secondary mt-2"
              />
            </div>

            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                📝 Instructions d'installation :
              </p>
              <ol className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1 ml-4 list-decimal">
                <li>Copiez le code ci-dessus</li>
                <li>Dans Shopify, allez dans <strong>Boutique en ligne → Thèmes</strong></li>
                <li>Cliquez sur <strong>Modifier le code</strong></li>
                <li>Ouvrez <code>theme.liquid</code></li>
                <li>Collez le code juste avant la balise <code>&lt;/body&gt;</code></li>
                <li>Sauvegardez</li>
              </ol>
            </div>
          </Card>
        )}

        <Card className="h-[calc(100vh-240px)] flex flex-col bg-card shadow-2xl border-4 border-primary/20 rounded-2xl overflow-hidden">
          {/* Header du chat avec design moderne */}
          <div className="px-6 py-5 border-b-2 bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">🤖 Assistant IA Intelligent</h3>
                <p className="text-xs text-white/90 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  En ligne • Prêt à vous aider
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-background">
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
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {/* Product suggestions */}
                  {message.products && message.products.length > 0 && (
                    <div className="space-y-2">
                      {message.products.map((product, idx) => (
                        <Card 
                          key={idx} 
                          className="p-3 flex items-center gap-3 hover:shadow-lg transition-all cursor-pointer group"
                          onClick={() => {
                            if (product.id) {
                              window.open(`/product-landing/${product.id}`, '_blank');
                            }
                          }}
                        >
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="w-16 h-16 object-cover rounded group-hover:scale-105 transition-transform"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{product.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.price} {product.currency || 'EUR'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              const shopUrl = product.shop_name?.includes('.myshopify.com') 
                                ? product.shop_name 
                                : `${product.shop_name}.myshopify.com`;
                              if (product.shop_name && product.handle) {
                                window.open(`https://${shopUrl}/products/${product.handle}`, '_blank');
                              } else {
                                toast.info('Voir plus de détails');
                              }
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

          {/* Input avec design moderne */}
          <div className="border-t-2 p-5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-muted/30 dark:to-muted/10">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="💬 Tapez votre message ici..."
                className="flex-1 bg-white dark:bg-card border-2 border-primary/30 focus:border-primary shadow-sm rounded-xl h-12 text-base"
                disabled={loading}
              />
              <Button 
                onClick={handleSend} 
                disabled={loading || !input.trim()}
                size="lg"
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg rounded-xl px-6 h-12"
              >
                <Send className="w-5 h-5" />
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
