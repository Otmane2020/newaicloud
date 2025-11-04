import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Code, ExternalLink, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function AISearchEmbed() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const liquidCode = `<!-- NewAI - Recherche Intelligente de Produits -->
<div id="newai-search-widget"></div>

<script>
(function() {
  const config = {
    sellerId: '${user?.id || 'YOUR_SELLER_ID'}',
    apiUrl: '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-smart',
    apiKey: '${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}'
  };

  const widget = document.createElement('div');
  widget.id = 'newai-search-container';
  widget.style.cssText = \`
    max-width: 1200px;
    margin: 40px auto;
    padding: 0 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  \`;

  widget.innerHTML = \`
    <div style="
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 20px;
      padding: 48px;
      box-shadow: 0 20px 60px rgba(59, 130, 246, 0.3);
      text-align: center;
      margin-bottom: 40px;
    ">
      <h1 style="color: white; font-size: 42px; font-weight: 800; margin: 0 0 16px 0;">
        Recherche IA Avancée
      </h1>
      <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 0;">
        Décrivez ce que vous cherchez et notre IA trouvera les produits parfaits pour vous
      </p>
    </div>

    <div style="
      background: white;
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      margin-bottom: 32px;
    ">
      <div style="display: flex; gap: 16px; align-items: center;">
        <input 
          type="text" 
          id="search-input" 
          placeholder="Ex: Table basse en bois style scandinave..."
          style="
            flex: 1;
            padding: 18px 24px;
            border: 2px solid #e5e7eb;
            border-radius: 14px;
            font-size: 16px;
            outline: none;
            transition: border-color 0.2s;
          "
          onfocus="this.style.borderColor='#3b82f6'"
          onblur="this.style.borderColor='#e5e7eb'"
        />
        <button 
          id="search-button"
          style="
            padding: 18px 32px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
            border: none;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(59,130,246,0.3);
            white-space: nowrap;
          "
          onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(59,130,246,0.4)'"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59,130,246,0.3)'"
        >
          🔍 Rechercher
        </button>
      </div>
      <div id="loading-indicator" style="display: none; margin-top: 24px; text-align: center; color: #6b7280;">
        <div style="display: inline-block; animation: spin 1s linear infinite; font-size: 24px;">⏳</div>
        <p style="margin: 8px 0 0 0;">Recherche en cours...</p>
      </div>
    </div>

    <div id="search-results" style="
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    "></div>

    <style>
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
  \`;

  document.getElementById('newai-search-widget').appendChild(widget);

  const input = document.getElementById('search-input');
  const button = document.getElementById('search-button');
  const loading = document.getElementById('loading-indicator');
  const results = document.getElementById('search-results');

  button.onclick = searchProducts;
  input.onkeypress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchProducts();
    }
  };

  async function searchProducts() {
    const query = input.value.trim();
    if (!query) {
      alert('Veuillez entrer une recherche');
      return;
    }

    button.disabled = true;
    input.disabled = true;
    loading.style.display = 'block';
    results.innerHTML = '';

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.apiKey
        },
        body: JSON.stringify({
          userMessage: query,
          history: [],
          sellerId: config.sellerId
        })
      });

      if (!response.ok) throw new Error('Erreur réseau');
      if (!response.body) throw new Error('Pas de réponse');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let products = [];

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
            if (data.products && data.products.length > 0) {
              products = data.products;
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }

      displayResults(products);
    } catch (error) {
      console.error('Error:', error);
      results.innerHTML = \`
        <div style="
          grid-column: 1 / -1;
          text-align: center;
          padding: 48px;
          background: #fef2f2;
          border-radius: 16px;
          border: 2px dashed #ef4444;
        ">
          <p style="color: #ef4444; font-size: 18px; margin: 0;">
            ❌ Erreur lors de la recherche. Veuillez réessayer.
          </p>
        </div>
      \`;
    } finally {
      button.disabled = false;
      input.disabled = false;
      loading.style.display = 'none';
    }
  }

  function displayResults(products) {
    if (!products || products.length === 0) {
      results.innerHTML = \`
        <div style="
          grid-column: 1 / -1;
          text-align: center;
          padding: 48px;
          background: #fef3c7;
          border-radius: 16px;
          border: 2px dashed #f59e0b;
        ">
          <p style="color: #92400e; font-size: 18px; margin: 0;">
            🔍 Aucun produit trouvé. Essayez une autre recherche.
          </p>
        </div>
      \`;
      return;
    }

    results.innerHTML = products.map(p => \`
      <div style="
        background: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        transition: all 0.3s;
        cursor: pointer;
      " onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 12px rgba(0,0,0,0.08)'">
        <div style="aspect-ratio: 1; overflow: hidden;">
          <img 
            src="\${p.image_url || '/placeholder.svg'}" 
            alt="\${p.title}"
            style="width: 100%; height: 100%; object-fit: cover;"
          />
        </div>
        <div style="padding: 16px;">
          <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.4; color: #1f2937;">
            \${p.title}
          </h3>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px; font-weight: 700; color: #3b82f6;">
              \${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: p.currency || 'EUR' }).format(p.price)}
            </span>
            \${p.compare_at_price && p.compare_at_price > p.price ? \`
              <span style="font-size: 14px; color: #9ca3af; text-decoration: line-through;">
                \${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: p.currency || 'EUR' }).format(p.compare_at_price)}
              </span>
            \` : ''}
          </div>
          \${p.ai_color || p.ai_material ? \`
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px;">
              \${p.ai_color ? \`<span style="background: #eff6ff; color: #1e40af; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">\${p.ai_color}</span>\` : ''}
              \${p.ai_material ? \`<span style="background: #f0fdf4; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">\${p.ai_material}</span>\` : ''}
            </div>
          \` : ''}
        </div>
      </div>
    \`).join('');
  }
})();
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(liquidCode);
    setCopied(true);
    toast.success('Code copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Code className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Intégrez la recherche IA dans votre boutique Shopify</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Copiez ce code Liquid et collez-le dans une page de votre thème Shopify pour activer la recherche intelligente par IA.
            </p>
            <div className="flex gap-2">
              <Badge variant="secondary">
                <ExternalLink className="w-3 h-3 mr-1" />
                Shopify Liquid
              </Badge>
              <Badge variant="secondary">
                <Sparkles className="w-3 h-3 mr-1" />
                Recherche IA
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-lg">Code Liquid à copier</h4>
            <Button onClick={handleCopy} variant="default" size="sm">
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

          <Textarea
            readOnly
            value={liquidCode}
            className="font-mono text-xs min-h-[500px] bg-slate-50 dark:bg-slate-900"
          />
        </div>
      </Card>

      <Card className="p-6 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <span className="text-2xl">📋</span>
          Instructions d'installation
        </h4>
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <Badge variant="outline" className="shrink-0">1</Badge>
            <span>Copiez le code Liquid ci-dessus</span>
          </li>
          <li className="flex gap-3">
            <Badge variant="outline" className="shrink-0">2</Badge>
            <span>Dans votre admin Shopify, allez dans <strong>Boutique en ligne → Pages</strong></span>
          </li>
          <li className="flex gap-3">
            <Badge variant="outline" className="shrink-0">3</Badge>
            <span>Créez une nouvelle page ou éditez une page existante</span>
          </li>
          <li className="flex gap-3">
            <Badge variant="outline" className="shrink-0">4</Badge>
            <span>Passez en mode <strong>"Afficher le code HTML"</strong></span>
          </li>
          <li className="flex gap-3">
            <Badge variant="outline" className="shrink-0">5</Badge>
            <span>Collez le code copié dans le contenu de la page</span>
          </li>
          <li className="flex gap-3">
            <Badge variant="outline" className="shrink-0">6</Badge>
            <span>Enregistrez et publiez la page. C'est prêt ! 🎉</span>
          </li>
        </ol>
      </Card>
    </div>
  );
}
