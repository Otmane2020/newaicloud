import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { useTranslation } from "@/lib/language";

export default function OrdersManagement() {
  const { t } = useTranslation();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t.chat.ordersManagement.title}
        </CardTitle>
        <CardDescription>
          {t.chat.ordersManagement.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">{t.chat.ordersManagement.comingSoon}</p>
          <p className="text-sm mt-2">
            {t.chat.ordersManagement.comingSoonDesc}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}