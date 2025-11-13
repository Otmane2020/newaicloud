import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Globe, ArrowRight } from 'lucide-react';

export default function TestRedirection() {
  const [shopifyDomain] = useState('qnxv91-2w.myshopify.com');
  const [publicDomain] = useState('decora-home.fr');
  const [currentUrl, setCurrentUrl] = useState('');
  const [isCorrectDomain, setIsCorrectDomain] = useState(false);

  useEffect(() => {
    const url = window.location.hostname;
    setCurrentUrl(url);
    setIsCorrectDomain(url === publicDomain);
  }, [publicDomain]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-center text-gray-900">
          Test de Redirection de Domaine
        </h1>
        
        <Card className="p-8 space-y-6">
          {/* Current Domain */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-700">Domaine actuel :</span>
            </div>
            <div className="text-2xl font-mono bg-gray-100 p-4 rounded-lg">
              {currentUrl}
            </div>
          </div>

          {/* Expected Domain */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-700">Domaine public attendu :</span>
            </div>
            <div className="text-2xl font-mono bg-green-50 p-4 rounded-lg text-green-700">
              {publicDomain}
            </div>
          </div>

          {/* Shopify Domain */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-700">Domaine Shopify :</span>
            </div>
            <div className="text-xl font-mono bg-purple-50 p-4 rounded-lg text-purple-700">
              {shopifyDomain}
            </div>
          </div>

          {/* Status */}
          <div className="pt-6 border-t">
            <div className="flex items-center gap-3">
              {isCorrectDomain ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-lg font-semibold text-green-600">
                      ✅ Redirection réussie !
                    </p>
                    <p className="text-sm text-gray-600">
                      Le domaine public est correctement configuré.
                    </p>
                  </div>
                  <Badge variant="default" className="ml-auto">Actif</Badge>
                </>
              ) : (
                <>
                  <XCircle className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-lg font-semibold text-orange-600">
                      ⚠️ Redirection non détectée
                    </p>
                    <p className="text-sm text-gray-600">
                      Vous êtes sur : <strong>{currentUrl}</strong>
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">En test</Badge>
                </>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-900">
            <p className="font-semibold mb-2">ℹ️ Comment tester :</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Accédez à cette page via <code className="bg-white px-1 rounded">{shopifyDomain}/testredirection</code></li>
              <li>Vérifiez si l'URL se transforme en <code className="bg-white px-1 rounded">{publicDomain}/testredirection</code></li>
              <li>Le statut ci-dessus indiquera si la redirection fonctionne</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}
