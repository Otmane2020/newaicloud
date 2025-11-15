import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

interface GSCEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function GSCEmptyState({ icon, title, description, action }: GSCEmptyStateProps) {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
        <div className="p-4 bg-muted/50 rounded-full text-muted-foreground">
          {icon}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
        
        {action && (
          <Button onClick={action.onClick} size="lg" className="mt-4">
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
}
