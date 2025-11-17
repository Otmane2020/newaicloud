import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Globe, Plus, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface Domain {
  id: string;
  domain: string;
  verified: boolean;
}

interface GSCDomainSelectorProps {
  domains: Domain[];
  selectedDomain: string;
  onDomainChange: (domain: string) => void;
  onAddDomain: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function GSCDomainSelector({
  domains,
  selectedDomain,
  onDomainChange,
  onAddDomain,
  onRefresh,
  loading
}: GSCDomainSelectorProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 flex-1">
        <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <Select value={selectedDomain} onValueChange={onDomainChange} disabled={loading}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t.googleSearchConsole.domain.selectPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (
              <SelectItem key={domain.id} value={domain.domain}>
                <div className="flex items-center gap-2">
                  <span>{domain.domain}</span>
                  {domain.verified && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">{t.googleSearchConsole.domain.verified}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      </Button>

      <Button variant="outline" onClick={onAddDomain} disabled={loading}>
        <Plus className="h-4 w-4 mr-2" />
        {t.googleSearchConsole.domain.add}
      </Button>
    </div>
  );
}
