import { Loader2 } from "lucide-react";
import { Progress } from "./progress";

interface LoadingStateProps {
  message?: string;
  progress?: number;
  estimatedTime?: string;
  details?: string;
}

export function LoadingState({ message, progress, estimatedTime, details }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {message && (
        <p className="text-lg font-medium text-foreground">{message}</p>
      )}
      {progress !== undefined && (
        <div className="w-full max-w-md space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            {progress}%
          </p>
        </div>
      )}
      {estimatedTime && (
        <p className="text-sm text-muted-foreground">
          Temps estimé: {estimatedTime}
        </p>
      )}
      {details && (
        <p className="text-xs text-muted-foreground max-w-md text-center">
          {details}
        </p>
      )}
    </div>
  );
}
