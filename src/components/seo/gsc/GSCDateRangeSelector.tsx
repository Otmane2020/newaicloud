import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface GSCDateRangeSelectorProps {
  value: '7' | '30' | '90';
  onChange: (value: '7' | '30' | '90') => void;
  disabled?: boolean;
}

export function GSCDateRangeSelector({ value, onChange, disabled }: GSCDateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">7 derniers jours</SelectItem>
          <SelectItem value="30">30 derniers jours</SelectItem>
          <SelectItem value="90">90 derniers jours</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
