import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Facebook, Instagram } from "lucide-react";

interface SocialPageSelectorProps {
  userId?: string;
  selectedFacebookPages: string[];
  selectedInstagramAccounts: string[];
  onFacebookChange: (pageIds: string[]) => void;
  onInstagramChange: (accountIds: string[]) => void;
  compact?: boolean;
}

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  auto_share_enabled: boolean;
}

interface InstagramAccount {
  id: string;
  account_id: string;
  account_name: string;
  auto_share_enabled: boolean;
}

export function SocialPageSelector({
  userId,
  selectedFacebookPages,
  selectedInstagramAccounts,
  onFacebookChange,
  onInstagramChange,
  compact = false
}: SocialPageSelectorProps) {
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadConnections();
  }, [userId]);

  const loadConnections = async () => {
    try {
      const [fbResult, igResult] = await Promise.all([
        supabase
          .from('facebook_page_connections')
          .select('id, page_id, page_name, auto_share_enabled')
          .eq('user_id', userId),
        supabase
          .from('instagram_account_connections')
          .select('id, account_id, account_name, auto_share_enabled')
          .eq('user_id', userId)
      ]);

      setFacebookPages(fbResult.data || []);
      setInstagramAccounts(igResult.data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFacebookPage = (pageId: string, checked: boolean) => {
    if (checked) {
      onFacebookChange([...selectedFacebookPages, pageId]);
    } else {
      onFacebookChange(selectedFacebookPages.filter(id => id !== pageId));
    }
  };

  const toggleInstagramAccount = (accountId: string, checked: boolean) => {
    if (checked) {
      onInstagramChange([...selectedInstagramAccounts, accountId]);
    } else {
      onInstagramChange(selectedInstagramAccounts.filter(id => id !== accountId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasNoConnections = facebookPages.length === 0 && instagramAccounts.length === 0;

  if (hasNoConnections) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Aucun compte connecté. Connectez vos comptes dans l'onglet Connexions.
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {/* Facebook Pages */}
      {facebookPages.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Facebook className="h-4 w-4 text-blue-600" />
            Pages Facebook
          </Label>
          <div className={compact ? "space-y-1.5" : "space-y-2"}>
            {facebookPages.map((page) => (
              <label
                key={page.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedFacebookPages.includes(page.page_id)}
                  onCheckedChange={(checked) => 
                    toggleFacebookPage(page.page_id, checked as boolean)
                  }
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {page.page_name?.[0]?.toUpperCase() || 'F'}
                  </div>
                  <span className="text-sm truncate">{page.page_name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Instagram Accounts */}
      {instagramAccounts.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Instagram className="h-4 w-4 text-pink-600" />
            Comptes Instagram
          </Label>
          <div className={compact ? "space-y-1.5" : "space-y-2"}>
            {instagramAccounts.map((account) => (
              <label
                key={account.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedInstagramAccounts.includes(account.account_id)}
                  onCheckedChange={(checked) => 
                    toggleInstagramAccount(account.account_id, checked as boolean)
                  }
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {account.account_name?.[0]?.toUpperCase() || 'I'}
                  </div>
                  <span className="text-sm truncate">@{account.account_name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SocialPageSelector;
