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
import { useTranslation } from '@/lib/language';
import { MessageSquare, Send, Bot, User, ShoppingCart, Sparkles, Code, Copy, Check, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: any[];
}

interface StoreAvatarProps {
  storeName?: string;
}

const StoreAvatar = ({ storeName }: StoreAvatarProps) => {
  const getInitials = (name?: string) => {
    if (!name) return "NC";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md">
      {getInitials(storeName)}
    </div>
  );
};

export default function Chat() {
  const { user } = useAuth();
  const { t, tf } = useTranslation();
  const { limits, refresh: refreshLimits } = useUsageLimits();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: t.seo.chat.greeting
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [storeName, setStoreName] = useState<string>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat embed configuration
  const [chatPosition, setChatPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');
  const [welcomeMessage, setWelcomeMessage] = useState(t.seo.chat.welcome);

  useEffect(() => {
    if (user) {
      loadProducts();
      createSession();
      loadStoreName();
    }
  }, [user]);

  const loadStoreName = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/shopify_connections?seller_id=eq.${user.id}&select=store_name&limit=1`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        }
      );
      
      const data = await response.json();
      
      if (data?.[0]?.store_name) {
        setStoreName(data[0].store_name);
      }
    } catch (err) {
      console.error('Error loading store name:', err);
    }
  };

  const createSession = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: 'Nouvelle conversation',
          message_count: 1,
          last_message: t.seo.chat.welcome
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
    if (!input.trim() || loading) return;

    // ✅ Check chat limit
    if (!limits?.canUseChat) {
      setShowUpgradeDialog(true);
      return;
    }

    const userMessageText = input.trim();
    const userMessage: Message = {
      role: 'user',
      content: userMessageText
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Save user message to session
    if (sessionId) {
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: userMessageText
      });

      await supabase
        .from('chat_sessions')
        .update({
          last_message: userMessageText,
          message_count: messages.length + 1,
          title: messages.length === 1 ? userMessageText.substring(0, 50) : undefined
        })
        .eq('id', sessionId);
    }

    try {
      // ✅ Use SSE streaming
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-smart`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            userMessage: userMessageText,
            history: messages.slice(-5),
            sellerId: user?.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Network error");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      let assistantProducts: any[] = [];

      // ✅ Create temporary assistant message
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", products: [] },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || line === "data: [DONE]") continue;
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));
            assistantContent += data.content || "";
            if (data.products && data.products.length > 0) {
              assistantProducts = data.products;
            }

            // ✅ Update last assistant message
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantContent,
                products: assistantProducts,
              };
              return updated;
            });
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      }

      // Save assistant message to session after stream completes
      if (sessionId && assistantContent) {
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: assistantContent
        });

        await supabase
          .from('chat_sessions')
          .update({
            last_message: assistantContent.substring(0, 200),
            message_count: messages.length + 2
          })
          .eq('id', sessionId);

        // ✅ Increment chat_responses_count
        await supabase.rpc('increment_usage', {
          p_seller_id: user!.id,
          p_field: 'chat_responses_count',
          p_increment: 1
        });

        // Refresh limits
        await refreshLimits();
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      let errorMessage = t.seo.chat.fallback;
      
      if (error.message?.includes("Failed to fetch") || error.message?.includes("Network")) {
        errorMessage = t.seo.chat.errors?.network || errorMessage;
      } else if (error.message?.includes("401") || error.message?.includes("auth")) {
        errorMessage = t.seo.chat.errors?.auth || errorMessage;
      } else if (error.message?.includes("MISSING_API_KEY") || error.message?.includes("config")) {
        errorMessage = t.seo.chat.errors?.config || errorMessage;
      } else if (error.message?.includes("no products")) {
        errorMessage = t.seo.chat.errors?.search || errorMessage;
      }
      
      toast.error(errorMessage);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
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
  const storeInitials = storeName ? storeName.slice(0, 2).toUpperCase() : "NC";
  
  const embedCode = `<!-- Nicolas - Assistant Commercial IA -->
<div id="smart-chat-widget"></div>

<script>
(function() {
  const config = {
    sellerId: '${user?.id || 'YOUR_SELLER_ID'}',
    position: '${chatPosition}',
    welcomeMessage: '${welcomeMessage}',
    apiUrl: '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-smart',
    apiKey: '${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}'
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
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(59,130,246,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      position: relative;
    " onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 12px 30px rgba(59,130,246,0.5)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 8px 20px rgba(59,130,246,0.4)'">
      <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
      <span id="unread-badge" style="
        display: none;
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        font-size: 12px;
        font-weight: bold;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
      ">1</span>
    </button>
    <div id="chat-window" style="
      display: none;
      width: 400px;
      height: 600px;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      flex-direction: column;
      overflow: hidden;
      margin-bottom: 20px;
    ">
      <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #60a5fa, #a78bfa); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
            ${storeInitials}
          </div>
          <div>
            <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Nicolas</h3>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Votre conseiller commercial</p>
          </div>
        </div>
        <p style="margin: 0; font-size: 14px; opacity: 0.95; line-height: 1.5;">\${config.welcomeMessage}</p>
      </div>
      <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 20px; background: linear-gradient(to bottom, #f9fafb, #ffffff);"></div>
      <div style="padding: 20px; border-top: 2px solid #e5e7eb; background: white;">
        <div id="typing-indicator" style="display: none; padding: 8px 0; color: #6b7280; font-size: 13px;">
          <span style="animation: pulse 1.5s infinite;">Sophie est en train d'écrire...</span>
        </div>
        <div style="display: flex; gap: 12px;">
          <input type="text" id="chat-input" placeholder="Tapez votre message..." style="flex: 1; padding: 14px 16px; border: 2px solid #e5e7eb; border-radius: 12px; outline: none; font-size: 14px; transition: border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e5e7eb'" />
          <button id="chat-send" style="padding: 14px 20px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 8px rgba(59,130,246,0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(59,130,246,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(59,130,246,0.3)'">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          </button>
        </div>
        <p style="margin: 12px 0 0 0; font-size: 11px; color: #9ca3af; text-align: center;">Propulsé par IA • Réponses instantanées</p>
      </div>
    </div>
  \`;

  document.body.appendChild(widget);

  const toggle = document.getElementById('chat-toggle');
  const window = document.getElementById('chat-window');
  const input = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');
  const messages = document.getElementById('chat-messages');

  const badge = document.getElementById('unread-badge');
  const typing = document.getElementById('typing-indicator');
  let history = [];
  
  // Show welcome message and badge after 2s
  setTimeout(() => {
    if (window.style.display === 'none') {
      badge.style.display = 'flex';
    }
  }, 2000);

  toggle.onclick = () => {
    const isOpen = window.style.display === 'flex';
    window.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) {
      badge.style.display = 'none';
      input.focus();
    }
  };

  send.onclick = sendMessage;
  input.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    addMessage('user', message);
    history.push({ role: 'user', content: message });
    input.value = '';
    input.disabled = true;
    send.disabled = true;
    typing.style.display = 'block';

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.apiKey
        },
        body: JSON.stringify({
          userMessage: message,
          history: history.slice(-5),
          sellerId: config.sellerId,
          context: {
            includeKnowledge: true,
            includeProducts: true,
            includeOrders: true,
            includePages: true
          }
        })
      });

      if (!response.ok) throw new Error('Network error');
      if (!response.body) throw new Error('No response');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessage = '';
      let messageDiv = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line === 'data: [DONE]') continue;
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantMessage += data.content;
              if (!messageDiv) {
                messageDiv = addMessage('assistant', assistantMessage);
              } else {
                messageDiv.textContent = assistantMessage;
              }
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }

      if (assistantMessage) {
        history.push({ role: 'assistant', content: assistantMessage });
      }
    } catch (err) {
      console.error('Error:', err);
      addMessage('assistant', 'Désolée, j\\'ai rencontré un problème technique. Pouvez-vous réessayer ?');
    } finally {
      typing.style.display = 'none';
      input.disabled = false;
      send.disabled = false;
      input.focus();
    }
  }

  function addMessage(role, content) {
    const div = document.createElement('div');
    const isUser = role === 'user';
    
    div.style.cssText = \`
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      \${isUser ? 'flex-direction: row-reverse;' : 'flex-direction: row;'}
      animation: slideIn 0.3s ease;
    \`;
    
    const avatar = document.createElement('div');
    avatar.style.cssText = \`
      width: 36px;
      height: 36px;
      border-radius: 50%;
      \${isUser ? 'background: linear-gradient(135deg, #6b7280, #9ca3af);' : 'background: linear-gradient(135deg, #60a5fa, #a78bfa);'}
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 14px;
      font-weight: 600;
      color: white;
    \`;
    avatar.textContent = isUser ? 'U' : '${storeInitials}';
    
    const bubble = document.createElement('div');
    bubble.style.cssText = \`
      padding: 12px 16px;
      border-radius: 16px;
      \${isUser ? 'background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border-radius: 16px 16px 4px 16px;' : 'background: #f3f4f6; color: #1f2937; border-radius: 16px 16px 16px 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);'}
      font-size: 14px;
      line-height: 1.6;
      max-width: 280px;
      word-wrap: break-word;
    \`;
    bubble.textContent = content;
    
    div.appendChild(avatar);
    div.appendChild(bubble);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    
    return bubble;
  }
  
  // Add initial greeting
  setTimeout(() => {
    addMessage('assistant', config.welcomeMessage || 'Bonjour ! Je suis Nicolas, votre conseiller commercial. Comment puis-je vous aider aujourd\\'hui ?');
  }, 500);
})();
</script>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success(t.seo.chat.copiedToClipboard);
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
              {t.seo.chat.title}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              {t.seo.chat.subtitle}
            </p>
            <div className="flex gap-2 mt-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {tf('seo.chat.productsAvailable', { count: products.length })}
              </Badge>
              <Badge variant="outline" className="bg-card">{t.seo.chat.poweredByAI}</Badge>
            </div>
          </div>
          <Button
            onClick={() => setShowEmbed(!showEmbed)}
            variant="outline"
            size="lg"
            className="bg-card hover:bg-card/80"
          >
            <Code className="w-4 h-4 mr-2" />
            {showEmbed ? t.seo.chat.hide : t.seo.chat.codeEmbed}
          </Button>
        </div>

        {showEmbed && (
          <Card className="mb-6 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <SettingsIcon className="w-6 h-6 text-primary" />
                <div>
                  <h3 className="text-lg font-bold">{t.seo.chat.embedConfig.title}</h3>
                  <p className="text-sm text-muted-foreground">{t.seo.chat.embedConfig.subtitle}</p>
                </div>
              </div>
              <Button onClick={handleCopyEmbed} variant="default">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t.seo.chat.embedConfig.copied}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    {t.seo.chat.embedConfig.copyCode}
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="position">{t.seo.chat.embedConfig.position}</Label>
                <Select value={chatPosition} onValueChange={(value: any) => setChatPosition(value)}>
                  <SelectTrigger id="position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">{t.seo.chat.embedConfig.positions.bottomRight}</SelectItem>
                    <SelectItem value="bottom-left">{t.seo.chat.embedConfig.positions.bottomLeft}</SelectItem>
                    <SelectItem value="top-right">{t.seo.chat.embedConfig.positions.topRight}</SelectItem>
                    <SelectItem value="top-left">{t.seo.chat.embedConfig.positions.topLeft}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="welcome">{t.seo.chat.embedConfig.welcomeMessage}</Label>
                <Input
                  id="welcome"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder={t.seo.chat.embedConfig.welcomeMessage}
                />
              </div>
            </div>

            <div>
              <Label>{t.seo.chat.embedConfig.integrationCode}</Label>
              <Textarea
                readOnly
                value={embedCode}
                className="font-mono text-xs h-64 resize-none bg-secondary mt-2"
              />
            </div>

            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                {t.seo.chat.embedConfig.instructions.title}
              </p>
              <ol className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1 ml-4 list-decimal">
                <li>{t.seo.chat.embedConfig.instructions.step1}</li>
                <li>{t.seo.chat.embedConfig.instructions.step2}</li>
                <li>{t.seo.chat.embedConfig.instructions.step3}</li>
                <li>{t.seo.chat.embedConfig.instructions.step4}</li>
                <li>{t.seo.chat.embedConfig.instructions.step5}</li>
                <li>{t.seo.chat.embedConfig.instructions.step6}</li>
              </ol>
            </div>
          </Card>
        )}

        <Card className="h-[calc(100vh-240px)] flex flex-col bg-card shadow-2xl border-4 border-primary/20 rounded-2xl overflow-hidden">
          {/* Header du chat avec design moderne */}
          <div className="px-6 py-5 border-b-2 bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-white">
            <div className="flex items-center gap-3">
              <StoreAvatar storeName={storeName} />
              <div>
                <h3 className="font-bold text-lg">{t.seo.chat.title}</h3>
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
                  <div className="flex-shrink-0">
                    <StoreAvatar storeName={storeName} />
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

      <UpgradeDialog 
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="chat"
        usage={limits?.usage.chat_responses_count}
        limit={limits?.limits.max_chat_responses}
      />
    </div>
  );
}
