import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Adresse email invalide" })
});

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    try {
      emailSchema.parse({ email });
    } catch (error: any) {
      toast.error(error.errors[0]?.message || 'Email invalide');
      return;
    }

    setLoading(true);

    try {
      // Generate reset link with unique token
      const resetLink = `${window.location.origin}/update-password`;
      
      // Use custom Resend email function instead of Supabase native email
      const { error } = await supabase.functions.invoke('send-reset-password-email', {
        body: {
          email: email.trim(),
          resetLink,
          language: 'fr',
        },
      });

      if (error) throw error;

      setSent(true);
      toast.success('Email de réinitialisation envoyé !');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="p-8 shadow-elegant">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                NewAI
              </span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2">
            Mot de passe oublié
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            {sent
              ? 'Vérifiez votre boîte mail pour réinitialiser votre mot de passe'
              : 'Entrez votre email pour recevoir un lien de réinitialisation'}
          </p>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="vous@exemple.com"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </Button>
            </form>
          ) : (
            <Button
              onClick={() => navigate('/auth?mode=login')}
              className="w-full"
            >
              Retour à la connexion
            </Button>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/auth?mode=login')}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
