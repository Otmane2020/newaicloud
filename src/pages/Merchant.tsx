import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleMerchant } from '@/components/seo/GoogleMerchant';
import { GoogleMerchantSettings } from '@/components/seo/GoogleMerchantSettings';

export default function Merchant() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'feed');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['feed', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Google Merchant
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          Gérez votre flux Google Shopping
        </p>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'feed' && <GoogleMerchant />}
        {activeTab === 'settings' && <GoogleMerchantSettings />}
      </div>
    </div>
  );
}
