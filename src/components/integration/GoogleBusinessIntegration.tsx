import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, ExternalLink, Loader2, MapPin, RefreshCw, Unplug } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface GoogleBusinessConnection {
  status: 'connected' | 'api_access_required' | 'error';
  googleAccountName: string | null;
  accountDisplayName: string | null;
  accountsCount: number;
  locationsCount: number;
  locationTitles: string[];
  tokenExpiresAt: string | null;
  apiError: string | null;
  connectedAt: string;
  updatedAt: string;
}

export function GoogleBusinessIntegration() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connection, setConnection] = useState<GoogleBusinessConnection | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-business-oauth', {
        body: { action: 'status' },
      });
      if (error) throw error;
      setConnection(data?.connected ? data.connection : null);
    } catch (error) {
      console.error('Unable to load Google Business status', error);
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const googleStatus = searchParams.get('google');
    const googleError = searchParams.get('google_error');
    if (!googleStatus && !googleError) return;

    if (googleStatus === 'connected') {
      toast.success('Google Business Profile connected');
      void loadStatus();
    } else if (googleStatus === 'api_access_required') {
      toast.warning('Google account connected, but Business Profile API access still needs to be enabled.');
      void loadStatus();
    } else if (googleStatus === 'error') {
      toast.error('Google connected, but Business Profile data could not be loaded.');
      void loadStatus();
    } else if (googleError) {
      const messages: Record<string, string> = {
        oauth_denied: 'Google authorization was cancelled.',
        missing_callback_params: 'Google returned an incomplete OAuth response.',
        invalid_state: 'The Google connection session expired. Please try again.',
        token_exchange_failed: 'Google authorization could not be completed. Please try again.',
      };
      toast.error(messages[googleError] || 'Google Business connection failed.');
    }

    const next = new URLSearchParams(searchParams);
    next.delete('google');
    next.delete('google_error');
    setSearchParams(next, { replace: true });
  }, [loadStatus, searchParams, setSearchParams]);

  const connect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-business-oauth', {
        body: { action: 'start' },
      });
      if (error) throw error;
      if (!data?.authUrl) throw new Error('Missing Google authorization URL');
      window.location.assign(data.authUrl);
    } catch (error) {
      console.error('Google Business connection failed', error);
      toast.error('Unable to start Google Business authorization.');
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('google-business-oauth', {
        body: { action: 'disconnect' },
      });
      if (error) throw error;
      setConnection(null);
      toast.success('Google Business Profile disconnected');
    } catch (error) {
      console.error('Google Business disconnect failed', error);
      toast.error('Unable to disconnect Google Business Profile.');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Building2 className="h-5 w-5" />
              Google Business Profile
            </CardTitle>
            <CardDescription>
              Connect your Google Business Profile to manage business locations and power local catalog workflows.
            </CardDescription>
          </div>
          {connection ? (
            <Badge variant="secondary" className="w-fit gap-1.5 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
          </div>
        ) : connection ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Google account</div>
                <div className="font-medium">{connection.accountDisplayName || connection.googleAccountName || 'Connected account'}</div>
                <div className="mt-1 text-sm text-muted-foreground">{connection.accountsCount} accessible account{connection.accountsCount === 1 ? '' : 's'}</div>
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> Locations
                </div>
                <div className="font-medium">{connection.locationsCount} business location{connection.locationsCount === 1 ? '' : 's'}</div>
                {connection.locationTitles.length > 0 ? (
                  <div className="mt-1 truncate text-sm text-muted-foreground">{connection.locationTitles.join(' · ')}</div>
                ) : null}
              </div>
            </div>

            {connection.status === 'api_access_required' ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Business Profile API access required</AlertTitle>
                <AlertDescription>
                  OAuth succeeded, but Google returned restricted API access. Enable/request Google Business Profile API access in the same Google Cloud project, then reconnect.
                </AlertDescription>
              </Alert>
            ) : connection.status === 'error' ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Google data unavailable</AlertTitle>
                <AlertDescription>{connection.apiError || 'The account is authorized but Google Business data could not be loaded.'}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void loadStatus()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => void connect()} disabled={connecting}>
                {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                Reauthorize
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void disconnect()} disabled={disconnecting} className="text-destructive hover:text-destructive">
                {disconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium">No Google Business Profile connected</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in with the Google account that owns or manages your business locations.
              </p>
            </div>
            <Button onClick={() => void connect()} disabled={connecting}>
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
              Connect Google Business
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
