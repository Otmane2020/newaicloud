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
  const [showSelector, setShowSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    // Check for pages data (multiple pages scenario)
    const pagesData = searchParams.get('pages');
    const userIdParam = searchParams.get('userId');

    if (pagesData && userIdParam) {
      try {
        const decodedPages = JSON.parse(decodeURIComponent(pagesData));
        setPages(decodedPages);
        setUserId(userIdParam);
        setShowSelector(true);
      } catch (e) {
        console.error('Error parsing pages data:', e);
        setError('Erreur lors du décodage des données');
        setTimeout(() => navigate('/social-media', { replace: true }), 2000);
      }
    } else {
      // No valid params, redirect back
      navigate('/social-media', { replace: true });
    }
  }, [searchParams, navigate]);

  const handleSuccess = (pageName: string, instagramName?: string | null) => {
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

  if (!showSelector) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      />
    </div>
  );
};

export default SocialCallback;
