import { useState } from 'react';
import { Search, Package, Sparkles, Code, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function ProductSearch() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Code Liquid pour intégrer la recherche sur Shopify
  const liquidCode = `<!-- Recherche Intelligente de Produits - Powered by IA -->
<div id="smart-product-search" style="width: 100%; max-width: 800px; margin: 2rem auto;">
  <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 24px;">
    <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: bold; color: #333;">
      🔍 Recherche Intelligente
    </h2>
    <p style="margin: 0 0 20px 0; color: #666;">
      Décrivez ce que vous cherchez en langage naturel
    </p>
    <input 
      type="text" 
      id="smart-search-input"
      placeholder="Ex: canapé scandinave bleu pour salon moins de 500€"
      style="width: 100%; padding: 12px 16px; border: 2px solid #e5e5e5; border-radius: 8px; font-size: 16px; transition: border-color 0.2s;"
      onfocus="this.style.borderColor='#3b82f6'"
      onblur="this.style.borderColor='#e5e5e5'"
    />
    <button 
      onclick="performSmartSearch()"
      style="margin-top: 12px; width: 100%; padding: 12px 24px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s;"
      onmouseover="this.style.transform='scale(1.02)'"
      onmouseout="this.style.transform='scale(1)'"
    >
      Rechercher avec IA
    </button>
  </div>
  <div id="search-results" style="margin-top: 24px;"></div>
</div>

<script>
function performSmartSearch() {
  const input = document.getElementById('smart-search-input');
  const resultsDiv = document.getElementById('search-results');
  const query = input.value.trim();
  
  if (!query) {
    alert('Veuillez entrer une recherche');
    return;
  }
  
  resultsDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><div style="font-size: 24px; margin-bottom: 12px;">⏳</div>Analyse de votre recherche...</div>';
  
  // Appel à votre API backend pour recherche IA
  fetch('https://votre-api.com/search?seller_id=${user?.id}&q=' + encodeURIComponent(query))
    .then(response => response.json())
    .then(data => {
      if (data.products && data.products.length > 0) {
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">';
        data.products.forEach(product => {
          html += \`
            <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
              <img src="\${product.image}" alt="\${product.title}" style="width: 100%; height: 200px; object-fit: cover;">
              <div style="padding: 16px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">\${product.title}</h3>
                <p style="margin: 0 0 12px 0; color: #059669; font-size: 20px; font-weight: bold;">\${product.price}€</p>
                <a href="\${product.url}" style="display: block; text-align: center; padding: 8px 16px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Voir le produit</a>
              </div>
            </div>
          \`;
        });
        html += '</div>';
        resultsDiv.innerHTML = html;
      } else {
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><div style="font-size: 24px; margin-bottom: 12px;">😕</div>Aucun produit trouvé. Essayez une autre recherche.</div>';
      }
    })
    .catch(error => {
      console.error('Erreur:', error);
      resultsDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;"><div style="font-size: 24px; margin-bottom: 12px;">❌</div>Erreur lors de la recherche</div>';
    });
}

// Recherche avec touche Entrée
document.getElementById('smart-search-input').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    performSmartSearch();
  }
});
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(liquidCode);
    setCopied(true);
    toast.success('Code copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Search className="w-8 h-8 text-primary" />
          Recherche de Produits Intelligente
        </h2>
        <p className="text-muted-foreground">
          Intégrez une recherche intelligente alimentée par l'IA dans votre boutique Shopify
        </p>
      </div>

      {/* Preview Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Recherche en Langage Naturel</h3>
            <p className="text-muted-foreground mb-4">
              Permettez à vos clients de rechercher des produits en décrivant simplement ce qu'ils veulent. 
              L'IA comprend les intentions et trouve les meilleurs résultats.
            </p>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border-2 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ex: canapé scandinave bleu pour salon moins de 500€"
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                  disabled
                />
              </div>
              <Button size="sm" className="w-full">
                Rechercher avec IA
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Liquid Code Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Code Liquid Shopify</h3>
              <p className="text-sm text-muted-foreground">Copiez et collez ce code dans votre thème</p>
            </div>
          </div>
          <Button onClick={handleCopy} variant="outline">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copié!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copier
              </>
            )}
          </Button>
        </div>

        <Textarea
          readOnly
          value={liquidCode}
          className="font-mono text-xs h-96 resize-none bg-secondary"
        />

        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            📝 Instructions d'installation :
          </p>
          <ol className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1 ml-4 list-decimal">
            <li>Copiez le code ci-dessus</li>
            <li>Dans votre admin Shopify, allez dans <strong>Boutique en ligne → Thèmes</strong></li>
            <li>Cliquez sur <strong>Modifier le code</strong></li>
            <li>Ouvrez le fichier de page où vous voulez la recherche (ex: <code>page.search.liquid</code> ou <code>template-page.liquid</code>)</li>
            <li>Collez le code à l'endroit désiré</li>
            <li>Sauvegardez et prévisualisez</li>
          </ol>
        </div>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="font-semibold">IA Avancée</h4>
          </div>
          <p className="text-sm text-muted-foreground">Comprend les requêtes en langage naturel et les intentions d'achat</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="font-semibold">Recherche Rapide</h4>
          </div>
          <p className="text-sm text-muted-foreground">Résultats instantanés avec scoring de pertinence intelligent</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="font-semibold">Facile à Intégrer</h4>
          </div>
          <p className="text-sm text-muted-foreground">Plug & play - aucune configuration complexe requise</p>
        </Card>
      </div>
    </div>
  );
}