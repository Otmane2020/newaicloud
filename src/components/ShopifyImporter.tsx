import { useState } from 'react';
import { Store, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface ShopifyImporterProps {
  onImportComplete: () => void;
}

export function ShopifyImporter({ onImportComplete }: ShopifyImporterProps) {
  const [shopName, setShopName] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/import-products`;

      console.log('Starting import from:', shopName);
      console.log('API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          shopName: shopName.trim().replace('.myshopify.com', ''),
          apiToken: apiToken.trim(),
        }),
      });

      console.log('Response status:', response.status);

      let data;
      try {
        data = await response.json();
        console.log('Response data:', data);
      } catch (parseErr) {
        console.error('Failed to parse response:', parseErr);
        throw new Error(`Server returned invalid response (status ${response.status})`);
      }

      if (!response.ok) {
        const errorMessage = data.error || `Request failed with status ${response.status}`;
        console.error('Import failed:', errorMessage);
        throw new Error(errorMessage);
      }

      const productCount = data.count || 0;
      console.log('Successfully imported', productCount, 'products');
      setSuccess(`Successfully imported ${productCount} product${productCount !== 1 ? 's' : ''}!`);
      setShopName('');
      setApiToken('');

      // Wait a moment before triggering the refresh to ensure database has processed
      setTimeout(() => {
        onImportComplete();
      }, 500);
    } catch (err) {
      console.error('Import error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background rounded-lg shadow-md p-6 max-w-md w-full border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Store className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Import Shopify Products</h2>
      </div>

      <form onSubmit={handleImport} className="space-y-4">
        <div>
          <label htmlFor="shopName" className="block text-sm font-medium mb-1">
            Shop Name
          </label>
          <input
            type="text"
            id="shopName"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="mystore or mystore.myshopify.com"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition bg-background"
            required
            disabled={loading}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Enter your Shopify store name (without https://)
          </p>
        </div>

        <div>
          <label htmlFor="apiToken" className="block text-sm font-medium mb-1">
            API Access Token
          </label>
          <input
            type="password"
            id="apiToken"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="shpat_xxxxxxxxxxxxx"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition bg-background"
            required
            disabled={loading}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Admin API access token with read_products permission
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-primary">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Import Products
            </>
          )}
        </button>
      </form>
    </div>
  );
}
