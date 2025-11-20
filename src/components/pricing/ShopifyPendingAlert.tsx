import { ShoppingBag } from "lucide-react";

interface ShopifyPendingAlertProps {
  language: 'fr' | 'en';
}

export function ShopifyPendingAlert({ language }: ShopifyPendingAlertProps) {
  return (
    <div className="max-w-2xl mx-auto bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-10 flex items-start gap-4">
      <ShoppingBag className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
      <div>
        <p className="font-semibold text-blue-900 dark:text-blue-100">
          {language === 'fr' ? 'Connexion Shopify en attente' : 'Shopify Connection Pending'}
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {language === 'fr' 
            ? 'Vos 10 premiers produits seront importés automatiquement après activation.'
            : 'Your first 10 products will be imported automatically after activation.'}
        </p>
      </div>
    </div>
  );
}
