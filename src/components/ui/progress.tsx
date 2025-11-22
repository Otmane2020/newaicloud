import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/language";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  showPercentage?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, showPercentage = false, ...props }, ref) => {
  const { language } = useTranslation();
  
  return (
    <div className="w-full">
      {showPercentage && (
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="text-muted-foreground">
            {language === "fr" ? "Progression" : "Progress"}
          </span>
          <span className="font-semibold text-primary">{value || 0}%</span>
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className="h-full w-full flex-1 transition-all duration-500 ease-out relative overflow-hidden"
          style={{ 
            transform: `translateX(-${100 - (value || 0)}%)`,
            background: 'linear-gradient(90deg, hsl(var(--primary-dark)) 0%, hsl(var(--primary)) 50%, hsl(var(--primary-light)) 100%)'
          }}
        >
          <div 
            className="absolute inset-0 animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
            }}
          />
        </ProgressPrimitive.Indicator>
      </ProgressPrimitive.Root>
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
