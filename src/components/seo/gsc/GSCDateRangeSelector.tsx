import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface GSCDateRangeSelectorProps {
  value: '7' | '30' | '90';
  onChange: (value: '7' | '30' | '90') => void;
  disabled?: boolean;
}

export function GSCDateRangeSelector({ value, onChange, disabled }: GSCDateRangeSelectorProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">{t.googleSearchConsole.dateRange.last7Days}</SelectItem>
          <SelectItem value="30">{t.googleSearchConsole.dateRange.last30Days}</SelectItem>
          <SelectItem value="90">{t.googleSearchConsole.dateRange.last90Days}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
