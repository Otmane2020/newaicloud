import { GoogleMerchant } from '@/components/seo/GoogleMerchant';
import { GoogleMerchantSettings } from '@/components/seo/GoogleMerchantSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Merchant() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="feed">Flux XML</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>
        
        <TabsContent value="feed" className="mt-6">
          <GoogleMerchant />
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6">
          <GoogleMerchantSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
