import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/language";

interface ServerStatusAlertProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ServerStatusAlert({ onRetry, isRetrying }: ServerStatusAlertProps) {
  const { language } = useTranslation();
  
  return (
    <Alert variant="destructive" className="mb-6 border-2">
      <WifiOff className="h-5 w-5" />
      <AlertTitle className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        {language === 'fr' ? 'Serveur indisponible' : 'Server Unavailable'}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>
          {language === 'fr' 
            ? 'Le serveur ne répond pas actuellement. Cela peut être dû à une maintenance ou une surcharge temporaire.'
            : 'The server is not responding. This may be due to maintenance or temporary overload.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              disabled={isRetrying}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {language === 'fr' ? 'Réessayer' : 'Retry'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a 
              href="https://status.supabase.com" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {language === 'fr' ? 'Vérifier le statut' : 'Check status'}
            </a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function ConnectionTimeoutAlert() {
  const { language } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Alert variant="destructive" className="border-2">
          <WifiOff className="h-5 w-5" />
          <AlertTitle className="text-lg">
            {language === 'fr' ? 'Erreur de connexion (522)' : 'Connection Error (522)'}
          </AlertTitle>
          <AlertDescription className="mt-3 space-y-4">
            <p>
              {language === 'fr' 
                ? 'La connexion au serveur a expiré. Le serveur est temporairement indisponible.'
                : 'Connection to the server timed out. The server is temporarily unavailable.'}
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside opacity-90">
              <li>{language === 'fr' ? 'Réessayez dans quelques minutes' : 'Try again in a few minutes'}</li>
              <li>{language === 'fr' ? 'Vérifiez votre connexion internet' : 'Check your internet connection'}</li>
              <li>{language === 'fr' ? 'Le service peut être en maintenance' : 'The service may be under maintenance'}</li>
            </ul>
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {language === 'fr' ? 'Rafraîchir' : 'Refresh'}
              </Button>
              <Button variant="outline" asChild>
                <a 
                  href="https://status.supabase.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {language === 'fr' ? 'Statut serveur' : 'Server status'}
                </a>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}