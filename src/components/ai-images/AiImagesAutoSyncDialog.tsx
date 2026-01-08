import React from 'react';
import { Loader2, CheckCircle2, Package, Image } from 'lucide-react';

interface AiImagesAutoSyncDialogProps {
  visible: boolean;
  progress: number;
  currentStep: 'products' | 'images' | 'completed';
  itemsSynced: number;
  storeName?: string;
}

const SHOPIFY_FONT = "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";

export function AiImagesAutoSyncDialog({
  visible,
  progress,
  currentStep,
  itemsSynced,
  storeName
}: AiImagesAutoSyncDialogProps) {
  const isFr = navigator.language?.startsWith("fr");
  
  if (!visible) return null;

  const isComplete = progress >= 99;
  
  const stepConfig = {
    products: { 
      icon: Package, 
      label: isFr ? 'Produits' : 'Products' 
    },
    images: { 
      icon: Image, 
      label: 'Images' 
    },
    completed: { 
      icon: CheckCircle2, 
      label: isFr ? 'Terminé' : 'Completed' 
    },
  };

  const config = stepConfig[currentStep];
  const CurrentIcon = config.icon;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(4px)',
      fontFamily: SHOPIFY_FONT,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        padding: '32px',
        width: '400px',
        border: '1px solid #e5e7eb',
      }}>
        {/* Shopify Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '16px',
            backgroundColor: 'rgba(149, 191, 70, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(149, 191, 70, 0.2)',
          }}>
            <svg viewBox="0 0 24 24" width="40" height="40" fill="#95bf46">
              <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.756a.457.457 0 0 0-.40-.378c-.158-.012-2.759-.210-2.759-.210s-1.829-1.797-2.016-1.984a.455.455 0 0 0-.378-.122l-.979.303C13.025.918 12.497 0 11.411 0 10.292 0 9.27.987 8.779 2.458l-1.323.41c-.436-.024-2.199.68-2.199.68s-.22.032-.273.213c-.047.165-3.096 10.633-3.096 10.633l9.5 1.78 4.949-.195zM11.121 2.977c-.459.142-.972.301-1.521.471.293-1.13.854-1.683 1.34-1.893.185.34.181.87.181 1.422zm-.985-2.057c.514.073.842.613 1.053 1.243-.717.222-1.495.463-2.282.707.44-1.182 1.012-1.825 1.229-1.95zM9.793 8.76c.084 1.38 3.723 1.681 3.929 4.913.16 2.544-1.349 4.286-3.526 4.424-2.614.166-4.054-1.378-4.054-1.378l.553-2.345s1.441 1.09 2.596 1.016c.755-.048 1.026-.66 1-.088-.066-1.79-3.073-1.684-3.259-4.654-.158-2.502 1.484-5.037 5.108-5.267 1.395-.089 2.107.267 2.107.267l-.823 3.079s-.923-.422-2.016-.333c-1.599.129-1.615 1.107-1.615 1.366z"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#111',
            marginBottom: '4px'
          }}>
            {isComplete 
              ? (isFr ? 'Import terminé !' : 'Import completed!') 
              : (isFr ? 'Synchronisation en cours' : 'Synchronizing...')}
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            {storeName?.replace('.myshopify.com', '') || (isFr ? 'Votre boutique Shopify' : 'Your Shopify store')}
          </p>
        </div>

        {/* Current step indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isComplete ? 'rgba(34, 197, 94, 0.1)' : 'rgba(149, 191, 70, 0.1)',
          }}>
            {isComplete ? (
              <CheckCircle2 size={20} color="#22c55e" />
            ) : (
              <Loader2 size={20} color="#95bf46" style={{ animation: 'spin 1s linear infinite' }} />
            )}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '999px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
          }}>
            <CurrentIcon size={16} color="#95bf46" />
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#111' }}>
              {isComplete ? (isFr ? 'Import terminé' : 'Import completed') : config.label}
            </span>
            {itemsSynced > 0 && (
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                • {itemsSynced}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
            <span style={{ color: '#6b7280' }}>
              {isFr ? 'Progression' : 'Progress'}
            </span>
            <span style={{ 
              fontWeight: 600, 
              color: isComplete ? '#22c55e' : '#95bf46',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div style={{
            height: '10px',
            backgroundColor: '#e5e7eb',
            borderRadius: '999px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: isComplete 
                ? '#22c55e' 
                : 'linear-gradient(90deg, #95bf46, #5f8e3e)',
              borderRadius: '999px',
              transition: 'width 0.3s ease-out',
              position: 'relative',
            }}>
              {!isComplete && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                  animation: 'shimmer 1.5s infinite',
                }} />
              )}
            </div>
          </div>
        </div>

        {/* Helper text */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
          {isComplete 
            ? (isFr ? 'Fermeture automatique...' : 'Closing automatically...') 
            : (isFr ? 'Veuillez patienter pendant l\'import de vos données...' : 'Please wait while importing your data...')}
        </p>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
