import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { useTranslation } from '@/lib/language';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import {
  AlertTriangle,
  Bot,
  Check,
  Code2,
  Copy,
  Globe2,
  Image as ImageIcon,
  MessageCircleMore,
  Palette,
  Save,
  Send,
  Settings2,
  ShoppingCart,
  Sparkles,
  Store,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: any[];
}

type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

type AssistantSettings = {
  assistantName: string;
  welcomeMessage: string;
  tone: string;
  defaultLanguage: string;
  responseLength: string;
  customInstructions: string;
  widgetPosition: WidgetPosition;
  primaryColor: string;
  salesFocus: boolean;
  productRecommendations: boolean;
  orderSupport: boolean;
  logoUrl: string;
};

const defaultSettings: AssistantSettings = {
  assistantName: 'Sales Assistant',
  welcomeMessage: 'Bonjour ! Comment puis-je vous aider à trouver le bon produit aujourd’hui ?',
  tone: 'professional',
  defaultLanguage: 'fr',
  responseLength: 'medium',
  customInstructions: '',
  widgetPosition: 'bottom-right',
  primaryColor: '#6d28d9',
  salesFocus: true,
  productRecommendations: true,
  orderSupport: true,
  logoUrl: '',
};

function AssistantAvatar({ name, logoUrl, size = 'md' }: { name: string; logoUrl?: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name || 'AI').trim().slice(0, 2).toUpperCase();
  const sizeClass = size === 'lg' ? 'h-14 w-14 rounded-2xl' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl';

  if (logoUrl) {
    return (
      <div className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden border border-slate-200 bg-white p-1 shadow-sm`}>
        <img src={logoUrl} alt={name || 'Assistant logo'} className="h-full w-full object-contain" />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} grid shrink-0 place-items-center bg-violet-600 text-sm font-bold text-white shadow-sm`}>
      {initials}
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const { language, t } = useTranslation();
  const { limits, refresh: refreshLimits } = useUsageLimits();
  const navigate = useNavigate();
  const fr = language === 'fr';

  const [settings, setSettings] = useState<AssistantSettings>({
    ...defaultSettings,
    welcomeMessage: t.chatPage?.defaultWelcome || t.seo.chat.welcome || defaultSettings.welcomeMessage,
    assistantName: t.chatPage?.defaultAssistantName || defaultSettings.assistantName,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [enrichmentPercentage, setEnrichmentPercentage] = useState(100);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const brandName = selectedStore?.store_name || (fr ? 'Ma boutique' : 'My store');

  useEffect(() => {
    if (!user?.id || !selectedStore?.id) return;
    loadAssistantSettings();
    loadProducts();
    createSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedStore?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAssistantSettings = async () => {
    if (!user?.id) return;
    setSettingsLoading(true);

    try {
      const [{ data: chatSettings }, { data: branding }] = await Promise.all([
        supabase
          .from('chat_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('social_settings')
          .select('logo_url')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const next: AssistantSettings = {
        assistantName: (chatSettings as any)?.assistant_name || defaultSettings.assistantName,
        welcomeMessage: (chatSettings as any)?.embed_welcome_message || defaultSettings.welcomeMessage,
        tone: (chatSettings as any)?.tone || defaultSettings.tone,
        defaultLanguage: (chatSettings as any)?.default_language || defaultSettings.defaultLanguage,
        responseLength: (chatSettings as any)?.response_length || defaultSettings.responseLength,
        customInstructions: (chatSettings as any)?.custom_instructions || '',
        widgetPosition: ((chatSettings as any)?.embed_position || defaultSettings.widgetPosition) as WidgetPosition,
        primaryColor: (chatSettings as any)?.embed_primary_color || defaultSettings.primaryColor,
        salesFocus: (chatSettings as any)?.embed_sales_focus ?? true,
        productRecommendations: (chatSettings as any)?.embed_product_recommendations ?? true,
        orderSupport: (chatSettings as any)?.embed_order_support ?? true,
        logoUrl: (branding as any)?.logo_url || '',
      };

      setSettings(next);
      setMessages([{ role: 'assistant', content: next.welcomeMessage }]);
    } catch (error) {
      console.error('Error loading assistant settings:', error);
      setMessages([{ role: 'assistant', content: defaultSettings.welcomeMessage }]);
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.id) return;
    setSavingSettings(true);

    try {
      const { error: chatError } = await supabase
        .from('chat_settings')
        .upsert({
          user_id: user.id,
          assistant_name: settings.assistantName.trim() || defaultSettings.assistantName,
          tone: settings.tone,
          default_language: settings.defaultLanguage,
          response_length: settings.responseLength,
          custom_instructions: settings.customInstructions,
          embed_enabled: true,
          embed_position: settings.widgetPosition,
          embed_welcome_message: settings.welcomeMessage,
          embed_primary_color: settings.primaryColor,
          embed_button_text: settings.assistantName.trim() || defaultSettings.assistantName,
          embed_sales_focus: settings.salesFocus,
          embed_product_recommendations: settings.productRecommendations,
          embed_order_support: settings.orderSupport,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id' });

      if (chatError) throw chatError;

      const { data: existingBranding, error: brandingReadError } = await supabase
        .from('social_settings')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (brandingReadError) throw brandingReadError;

      if (existingBranding) {
        const { error } = await supabase
          .from('social_settings')
          .update({ logo_url: settings.logoUrl || null, updated_at: new Date().toISOString() } as any)
          .eq('user_id', user.id);
        if (error) throw error;
      } else if (settings.logoUrl) {
        const { error } = await supabase
          .from('social_settings')
          .insert({ user_id: user.id, logo_url: settings.logoUrl } as any);
        if (error) throw error;
      }

      setMessages((current) => {
        if (current.length === 0) return [{ role: 'assistant', content: settings.welcomeMessage }];
        const next = [...current];
        if (next[0]?.role === 'assistant') next[0] = { ...next[0], content: settings.welcomeMessage };
        return next;
      });

      toast.success(fr ? 'Paramètres de l’assistant enregistrés' : 'Assistant settings saved');
    } catch (error: any) {
      console.error('Error saving assistant settings:', error);
      toast.error(fr ? 'Impossible d’enregistrer les paramètres' : 'Could not save settings', {
        description: error?.message,
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const createSession = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: fr ? 'Nouvelle conversation' : 'New conversation',
          message_count: 1,
          last_message: settings.welcomeMessage,
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
    } catch (error) {
      console.error('Error creating chat session:', error);
    }
  };

  const loadProducts = async () => {
    if (!user?.id || !selectedStore?.id) return;

    try {
      const allProducts: any[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('shopify_products')
          .select('*')
          .eq('seller_id', user.id)
          .eq('store_id', selectedStore.id)
          .range(page * pageSize, page * pageSize + pageSize - 1)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data?.length) break;
        allProducts.push(...data);
        hasMore = data.length === pageSize;
        page += 1;
      }

      setProducts(allProducts);
      if (allProducts.length > 0) {
        const enriched = allProducts.filter((product) => product.enrichment_status === 'enriched').length;
        setEnrichmentPercentage(Math.round((enriched / allProducts.length) * 100));
      }
    } catch (error) {
      console.error('Error loading chat products:', error);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!limits?.canUseChat) {
      setShowUpgradeDialog(true);
      return;
    }

    const history = [...messages, { role: 'user' as const, content: text }];
    setMessages(history);
    setInput('');
    setLoading(true);

    if (sessionId) {
      await supabase.from('chat_messages').insert({ session_id: sessionId, role: 'user', content: text });
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-smart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          userMessage: text,
          history: history.slice(0, -1),
          sellerId: user?.id,
          storeId: selectedStore?.id,
          assistantName: settings.assistantName,
          tone: settings.tone,
          defaultLanguage: settings.defaultLanguage,
          responseLength: settings.responseLength,
          customInstructions: settings.customInstructions,
          salesFocus: settings.salesFocus,
          productRecommendations: settings.productRecommendations,
          orderSupport: settings.orderSupport,
        }),
      });

      if (!response.ok) throw new Error(`Chat request failed (${response.status})`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
      let assistantProducts: any[] = [];

      setMessages((current) => [...current, { role: 'assistant', content: '', products: [] }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try {
            const payload = JSON.parse(line.slice(6));
            assistantContent += payload.content || '';
            if (Array.isArray(payload.products) && payload.products.length > 0) {
              assistantProducts = payload.products.map((suggested: any) => {
                const catalogProduct = products.find(
                  (product) => product.id === suggested.id || product.shopify_id === suggested.shopify_id,
                );
                return { ...catalogProduct, ...suggested, image_url: suggested.image_url || catalogProduct?.image_url };
              });
            }

            setMessages((current) => {
              const next = [...current];
              next[next.length - 1] = {
                role: 'assistant',
                content: assistantContent,
                products: assistantProducts,
              };
              return next;
            });
          } catch (error) {
            console.error('Chat SSE parse error:', error);
          }
        }
      }

      if (sessionId && assistantContent) {
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: assistantContent,
          products: assistantProducts.length > 0 ? assistantProducts : null,
        });
      }

      if (user?.id) {
        await supabase.rpc('increment_usage', {
          p_seller_id: user.id,
          p_field: 'chat_responses_count',
          p_increment: 1,
        });
        await refreshLimits();
      }
    } catch (error: any) {
      console.error('Error sending chat message:', error);
      toast.error(fr ? 'Le chat ne répond pas pour le moment' : 'The chat is not responding right now', {
        description: error?.message,
      });
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: fr
            ? 'Désolé, je rencontre un problème technique. Réessayez dans un instant.'
            : 'Sorry, I ran into a technical issue. Please try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const embedCode = useMemo(() => {
    const assistantName = JSON.stringify(settings.assistantName || defaultSettings.assistantName);
    const welcome = JSON.stringify(settings.welcomeMessage || defaultSettings.welcomeMessage);
    const logoUrl = JSON.stringify(settings.logoUrl || '');
    const brand = JSON.stringify(brandName);
    const color = JSON.stringify(settings.primaryColor || defaultSettings.primaryColor);
    const position = JSON.stringify(settings.widgetPosition);
    const apiUrl = JSON.stringify(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-smart`);
    const apiKey = JSON.stringify(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '');
    const sellerId = JSON.stringify(user?.id || 'YOUR_SELLER_ID');
    const storeId = JSON.stringify(selectedStore?.id || 'YOUR_STORE_ID');

    return `<!-- CatalogueOptimize AI Sales Assistant -->
<div id="catalog-ai-sales-assistant"></div>
<script>
(function () {
  const config = {
    assistantName: ${assistantName},
    welcomeMessage: ${welcome},
    logoUrl: ${logoUrl},
    brandName: ${brand},
    primaryColor: ${color},
    position: ${position},
    sellerId: ${sellerId},
    storeId: ${storeId},
    apiUrl: ${apiUrl},
    apiKey: ${apiKey}
  };

  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.zIndex = '99999';
  root.style.fontFamily = 'Inter, ui-sans-serif, system-ui, sans-serif';
  if (config.position.includes('bottom')) root.style.bottom = '20px'; else root.style.top = '20px';
  if (config.position.includes('right')) root.style.right = '20px'; else root.style.left = '20px';

  const logo = config.logoUrl
    ? '<img src="' + config.logoUrl + '" alt="" style="width:34px;height:34px;object-fit:contain;border-radius:10px;background:white;padding:3px">'
    : '<div style="width:34px;height:34px;border-radius:10px;background:white;color:' + config.primaryColor + ';display:grid;place-items:center;font-weight:800">AI</div>';

  root.innerHTML = '<div id="catalog-ai-window" style="display:none;width:min(390px,calc(100vw - 32px));height:560px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 24px 70px rgba(15,23,42,.22);overflow:hidden;margin-bottom:12px">' +
    '<div style="padding:16px;background:' + config.primaryColor + ';color:#fff;display:flex;gap:10px;align-items:center">' + logo + '<div><div style="font-weight:800">' + config.assistantName + '</div><div style="font-size:12px;opacity:.85">' + config.brandName + ' · Online</div></div></div>' +
    '<div id="catalog-ai-messages" style="height:410px;overflow:auto;padding:16px;background:#f8fafc"></div>' +
    '<div style="display:flex;gap:8px;padding:12px;border-top:1px solid #e2e8f0"><input id="catalog-ai-input" placeholder="Ask about a product..." style="flex:1;border:1px solid #cbd5e1;border-radius:12px;padding:10px 12px;outline:none"><button id="catalog-ai-send" style="border:0;border-radius:12px;background:' + config.primaryColor + ';color:white;padding:0 14px;cursor:pointer">Send</button></div>' +
    '</div>' +
    '<button id="catalog-ai-toggle" style="width:58px;height:58px;border:0;border-radius:18px;background:' + config.primaryColor + ';color:white;box-shadow:0 14px 35px rgba(15,23,42,.22);cursor:pointer;font-size:22px">✦</button>';
  document.body.appendChild(root);

  const panel = root.querySelector('#catalog-ai-window');
  const toggle = root.querySelector('#catalog-ai-toggle');
  const messages = root.querySelector('#catalog-ai-messages');
  const input = root.querySelector('#catalog-ai-input');
  const send = root.querySelector('#catalog-ai-send');
  let history = [];

  function addMessage(role, text) {
    const item = document.createElement('div');
    item.style.cssText = 'max-width:82%;margin:8px 0;padding:10px 12px;border-radius:14px;line-height:1.45;font-size:14px;' + (role === 'user' ? 'margin-left:auto;background:' + config.primaryColor + ';color:white' : 'background:white;border:1px solid #e2e8f0;color:#0f172a');
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  }

  addMessage('assistant', config.welcomeMessage);
  toggle.onclick = function () { panel.style.display = panel.style.display === 'block' ? 'none' : 'block'; };

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    addMessage('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    const assistantBubble = addMessage('assistant', '');
    let content = '';

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.apiKey },
        body: JSON.stringify({ userMessage: text, history: history.slice(-8), sellerId: config.sellerId, storeId: config.storeId })
      });
      if (!response.ok || !response.body) throw new Error('Chat request failed');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        const lines = buffer.split('\\n');
        buffer = lines.pop() || '';
        lines.forEach(function (line) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') return;
          try {
            const data = JSON.parse(line.slice(6));
            content += data.content || '';
            assistantBubble.textContent = content;
          } catch (_) {}
        });
      }
      history.push({ role: 'assistant', content: content });
    } catch (_) {
      assistantBubble.textContent = 'Unable to answer right now. Please try again.';
    }
  }

  send.onclick = sendMessage;
  input.addEventListener('keydown', function (event) { if (event.key === 'Enter') sendMessage(); });
})();
</script>`;
  }, [brandName, selectedStore?.id, settings, user?.id]);

  const copyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success(fr ? 'Code copié' : 'Code copied');
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-10">
      {enrichmentPercentage < 100 && products.length > 0 && (
        <Alert className="rounded-2xl border-amber-200 bg-amber-50 text-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">
              {fr
                ? `${enrichmentPercentage}% du catalogue est enrichi. L’assistant sera plus précis avec un catalogue complet.`
                : `${enrichmentPercentage}% of the catalog is enriched. The assistant performs better with complete product data.`}
            </span>
            <Button size="sm" variant="outline" onClick={() => navigate('/product-source')} className="w-fit border-amber-300 bg-white">
              {fr ? 'Compléter le catalogue' : 'Complete catalog'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-violet-50/60 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 text-white shadow-sm shadow-violet-200">
              <MessageCircleMore className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">AI Sales Assistant</h1>
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                {fr
                  ? 'Personnalisez votre vendeur IA, testez ses réponses et installez-le sur votre boutique.'
                  : 'Customize your AI seller, test responses and install it on your storefront.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-600">
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> {products.length} {fr ? 'produits' : 'products'}
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-600">
                  <Store className="mr-1.5 h-3.5 w-3.5" /> {brandName}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowEmbed((value) => !value)} className="rounded-xl border-slate-200 bg-white">
              <Code2 className="mr-2 h-4 w-4" />
              {showEmbed ? (fr ? 'Masquer le code' : 'Hide embed') : (fr ? 'Code d’intégration' : 'Embed code')}
            </Button>
            <Button onClick={saveSettings} disabled={savingSettings || settingsLoading} className="rounded-xl bg-violet-600 text-white hover:bg-violet-700">
              {savingSettings ? <Sparkles className="mr-2 h-4 w-4 animate-pulse" /> : <Save className="mr-2 h-4 w-4" />}
              {savingSettings ? (fr ? 'Enregistrement…' : 'Saving…') : (fr ? 'Enregistrer' : 'Save changes')}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="space-y-5 border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Settings2 className="h-4 w-4 text-violet-600" />
                {fr ? 'Identité' : 'Identity'}
              </div>
              <Card className="space-y-4 rounded-2xl border-slate-200 bg-white p-4 shadow-none">
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <AssistantAvatar name={settings.assistantName} logoUrl={settings.logoUrl} size="lg" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{settings.assistantName || defaultSettings.assistantName}</div>
                    <div className="truncate text-xs text-slate-500">{brandName}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assistant-name">{fr ? 'Nom de l’assistant' : 'Assistant name'}</Label>
                  <Input
                    id="assistant-name"
                    value={settings.assistantName}
                    onChange={(event) => setSettings((current) => ({ ...current, assistantName: event.target.value }))}
                    placeholder="Lina, Alex, Sales AI…"
                    className="rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand-name">{fr ? 'Boutique' : 'Store name'}</Label>
                  <Input id="brand-name" value={brandName} disabled className="rounded-xl border-slate-200 bg-slate-50 text-slate-500" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo-url" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-slate-400" /> Logo / avatar URL
                  </Label>
                  <Input
                    id="logo-url"
                    value={settings.logoUrl}
                    onChange={(event) => setSettings((current) => ({ ...current, logoUrl: event.target.value }))}
                    placeholder="https://…/logo.png"
                    className="rounded-xl border-slate-200 bg-white"
                  />
                  <p className="text-xs text-slate-400">
                    {fr ? 'Le logo de votre branding est utilisé par défaut.' : 'Your existing brand logo is used by default.'}
                  </p>
                </div>
              </Card>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MessageCircleMore className="h-4 w-4 text-violet-600" />
                {fr ? 'Conversation' : 'Conversation'}
              </div>
              <Card className="space-y-4 rounded-2xl border-slate-200 bg-white p-4 shadow-none">
                <div className="space-y-2">
                  <Label htmlFor="welcome-message">{fr ? 'Message d’accueil' : 'Welcome message'}</Label>
                  <Textarea
                    id="welcome-message"
                    value={settings.welcomeMessage}
                    onChange={(event) => setSettings((current) => ({ ...current, welcomeMessage: event.target.value }))}
                    rows={3}
                    className="resize-none rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{fr ? 'Ton' : 'Tone'}</Label>
                    <Select value={settings.tone} onValueChange={(value) => setSettings((current) => ({ ...current, tone: value }))}>
                      <SelectTrigger className="rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="persuasive">Persuasive</SelectItem>
                        <SelectItem value="empathetic">Empathetic</SelectItem>
                        <SelectItem value="consultative">Consultative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> {fr ? 'Langue' : 'Language'}</Label>
                    <Select value={settings.defaultLanguage} onValueChange={(value) => setSettings((current) => ({ ...current, defaultLanguage: value }))}>
                      <SelectTrigger className="rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{fr ? 'Longueur des réponses' : 'Response length'}</Label>
                  <Select value={settings.responseLength} onValueChange={(value) => setSettings((current) => ({ ...current, responseLength: value }))}>
                    <SelectTrigger className="rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">{fr ? 'Courte' : 'Concise'}</SelectItem>
                      <SelectItem value="medium">{fr ? 'Équilibrée' : 'Balanced'}</SelectItem>
                      <SelectItem value="detailed">{fr ? 'Détaillée' : 'Detailed'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles className="h-4 w-4 text-violet-600" />
                {fr ? 'Comportement commercial' : 'Sales behavior'}
              </div>
              <Card className="space-y-4 rounded-2xl border-slate-200 bg-white p-4 shadow-none">
                {[
                  ['salesFocus', fr ? 'Focus vente' : 'Sales focus'],
                  ['productRecommendations', fr ? 'Recommandations produits' : 'Product recommendations'],
                  ['orderSupport', fr ? 'Support commandes' : 'Order support'],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-3 py-2.5">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <Switch
                      checked={Boolean(settings[key as keyof AssistantSettings])}
                      onCheckedChange={(checked) => setSettings((current) => ({ ...current, [key]: checked }))}
                    />
                  </div>
                ))}

                <div className="space-y-2">
                  <Label htmlFor="custom-instructions">{fr ? 'Instructions personnalisées' : 'Custom instructions'}</Label>
                  <Textarea
                    id="custom-instructions"
                    value={settings.customInstructions}
                    onChange={(event) => setSettings((current) => ({ ...current, customInstructions: event.target.value }))}
                    placeholder={fr ? 'Ex. Mettre en avant la livraison, les promotions et les produits en stock…' : 'E.g. Prioritize delivery, promotions and in-stock products…'}
                    rows={4}
                    className="resize-none rounded-xl border-slate-200 bg-white"
                  />
                </div>
              </Card>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Palette className="h-4 w-4 text-violet-600" /> Widget
              </div>
              <Card className="space-y-4 rounded-2xl border-slate-200 bg-white p-4 shadow-none">
                <div className="grid grid-cols-[1fr_88px] gap-3">
                  <div className="space-y-2">
                    <Label>{fr ? 'Position' : 'Position'}</Label>
                    <Select value={settings.widgetPosition} onValueChange={(value: WidgetPosition) => setSettings((current) => ({ ...current, widgetPosition: value }))}>
                      <SelectTrigger className="rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom right</SelectItem>
                        <SelectItem value="bottom-left">Bottom left</SelectItem>
                        <SelectItem value="top-right">Top right</SelectItem>
                        <SelectItem value="top-left">Top left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{fr ? 'Couleur' : 'Color'}</Label>
                    <Input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(event) => setSettings((current) => ({ ...current, primaryColor: event.target.value }))}
                      className="h-10 rounded-xl border-slate-200 bg-white p-1"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </aside>

          <main className="min-w-0 bg-white p-4 sm:p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">{fr ? 'Aperçu & test en direct' : 'Live preview & test'}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {fr ? 'Les changements visuels apparaissent immédiatement. Enregistrez pour les publier.' : 'Visual changes appear instantly. Save to publish them.'}
                </p>
              </div>
              <Badge variant="outline" className="rounded-full border-violet-200 bg-violet-50 text-violet-700">
                <Bot className="mr-1.5 h-3.5 w-3.5" /> chat-smart
              </Badge>
            </div>

            <Card className="flex min-h-[650px] flex-col overflow-hidden rounded-3xl border-slate-200 bg-slate-50 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <AssistantAvatar name={settings.assistantName} logoUrl={settings.logoUrl} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">{settings.assistantName || defaultSettings.assistantName}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {brandName} · {fr ? 'En ligne' : 'Online'}
                    </div>
                  </div>
                </div>
                <div className="h-7 w-7 rounded-full border border-slate-200" style={{ backgroundColor: settings.primaryColor }} aria-label="Primary color" />
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && <AssistantAvatar name={settings.assistantName} logoUrl={settings.logoUrl} size="sm" />}
                    <div className="max-w-[84%] space-y-2 sm:max-w-[75%]">
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm ${
                          message.role === 'user'
                            ? 'rounded-br-md text-white'
                            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                        }`}
                        style={message.role === 'user' ? { backgroundColor: settings.primaryColor } : undefined}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>

                      {message.products && message.products.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {message.products.slice(0, 4).map((product, productIndex) => (
                            <button
                              key={product.id || productIndex}
                              onClick={() => product.id && window.open(`/product-landing/${product.id}`, '_blank')}
                              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
                            >
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ShoppingCart className="h-4 w-4 text-slate-400" /></div>}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold text-slate-900">{product.title}</div>
                                {product.price != null && <div className="mt-1 text-xs text-slate-500">{product.price} {product.currency || 'EUR'}</div>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2.5">
                    <AssistantAvatar name={settings.assistantName} logoUrl={settings.logoUrl} size="sm" />
                    <div className="flex gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:240ms]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
                <div className="flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={fr ? 'Posez une question sur un produit…' : 'Ask a product question…'}
                    disabled={loading}
                    className="h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="h-10 w-10 rounded-xl p-0 text-white"
                    style={{ backgroundColor: settings.primaryColor }}
                    aria-label={fr ? 'Envoyer' : 'Send'}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-400">CatalogueOptimize AI · {products.length} {fr ? 'produits connectés' : 'connected products'}</p>
              </div>
            </Card>
          </main>
        </div>
      </section>

      {showEmbed && (
        <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Code2 className="h-4 w-4 text-violet-600" /> {fr ? 'Installation sur la boutique' : 'Storefront installation'}</div>
              <p className="mt-1 text-xs text-slate-500">{fr ? 'Copiez ce snippet dans votre thème. Il reprend le nom, le logo, la couleur et le message configurés.' : 'Copy this snippet into your theme. It uses your configured name, logo, color and welcome message.'}</p>
            </div>
            <Button variant="outline" onClick={copyEmbed} className="rounded-xl border-slate-200 bg-white">
              {copied ? <Check className="mr-2 h-4 w-4 text-emerald-600" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? (fr ? 'Copié' : 'Copied') : (fr ? 'Copier le code' : 'Copy code')}
            </Button>
          </div>
          <div className="p-4 sm:p-5">
            <Textarea readOnly value={embedCode} className="min-h-[260px] resize-y rounded-2xl border-slate-200 bg-slate-950 font-mono text-xs leading-5 text-slate-100" />
          </div>
        </Card>
      )}

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
