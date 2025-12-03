import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FacebookPageSelector } from '@/components/social/FacebookPageSelector';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface FacebookPage {
  id: string;
  name: string;
  token: string;
}

const SocialCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [showSelector, setShowSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Check for success message
      const success = searchParams.get('success');
      const message = searchParams.get('message');
      const errorParam = searchParams.get('error');
      
      if (success === 'true' && message) {
        toast.success(decodeURIComponent(message));
        navigate('/social-media', { replace: true });
        return;
      }
      
      if (errorParam) {
        toast.error(decodeURIComponent(errorParam));
        navigate('/social-media', { replace: true });
        return;
      }

      // Check for session ID (new method - database storage)
      const session = searchParams.get('session');
      if (session) {
        try {
          console.log('Fetching pending pages for session:', session);
          
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-page-oauth`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'get_pending_pages',
                sessionId: session
              })
            }
          );

          const result = await response.json();
          
          if (result.success && result.pages) {
            console.log('Loaded', result.pages.length, 'pages from session');
            setPages(result.pages);
            setUserId(result.userId);
            setSessionId(session);
            setShowSelector(true);
            setLoading(false);
          } else {
            console.error('Failed to load pages:', result.error);
            setError(result.error || 'Erreur lors du chargement des pages');
            setTimeout(() => navigate('/social-media', { replace: true }), 2000);
          }
        } catch (e) {
          console.error('Error fetching pending pages:', e);
          setError('Erreur de connexion au serveur');
          setTimeout(() => navigate('/social-media', { replace: true }), 2000);
        }
        return;
      }

      // Legacy support: Check for pages data in URL (old method)
      const pagesData = searchParams.get('pages');
      const userIdParam = searchParams.get('userId');

      if (pagesData && userIdParam) {
        try {
          const decodedPages = JSON.parse(decodeURIComponent(pagesData));
          setPages(decodedPages);
          setUserId(userIdParam);
          setShowSelector(true);
          setLoading(false);
        } catch (e) {
          console.error('Error parsing pages data:', e);
          setError('Erreur lors du décodage des données');
          setTimeout(() => navigate('/social-media', { replace: true }), 2000);
        }
        return;
      }

      // No valid params, redirect back
      navigate('/social-media', { replace: true });
    };

    loadData();
  }, [searchParams, navigate]);

  const handleSuccess = async (pageName: string, instagramName?: string | null) => {
    // Cleanup the session from database
    if (sessionId) {
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-page-oauth`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'cleanup_session',
              sessionId
            })
          }
        );
      } catch (e) {
        console.error('Error cleaning up session:', e);
      }
    }

    const successMessage = instagramName 
      ? `Facebook (${pageName}) et Instagram (${instagramName}) connectés avec succès!`
      : `Facebook (${pageName}) connecté avec succès!`;
    navigate(`/social-media?success=true&message=${encodeURIComponent(successMessage)}`, { replace: true });
  };

  const handleClose = () => {
    setShowSelector(false);
    navigate('/social-media', { replace: true });
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <p className="text-muted-foreground mt-2">Redirection...</p>
        </div>
      </div>
    );
  }

  if (loading || !showSelector) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Chargement des pages Facebook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <FacebookPageSelector
        open={showSelector}
        onOpenChange={handleClose}
        pages={pages}
        userId={userId}
        onSuccess={handleSuccess}
        multiSelect={true}
      />
    </div>
  );
};

export default SocialCallback;
