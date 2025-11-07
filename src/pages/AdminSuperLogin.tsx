import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export default function AdminSuperLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: isAdmin, error } = await supabase.rpc('has_role', {
            _user_id: session.user.id,
            _role: 'admin'
          });
          
          if (!error && isAdmin) {
            navigate('/superadmin');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setChecking(false);
      }
    };
    
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = loginSchema.parse({ email, password });
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (authError) {
        toast({
          variant: "destructive",
          title: "Erreur de connexion",
          description: "Email ou mot de passe invalide",
        });
        return;
      }

      if (!authData.user) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de récupérer les informations utilisateur",
        });
        return;
      }

      const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
        _user_id: authData.user.id,
        _role: 'admin'
      });

      if (roleError) {
        await supabase.auth.signOut();
        toast({
          variant: "destructive",
          title: "Erreur de vérification",
          description: "Impossible de vérifier les permissions",
        });
        return;
      }

      if (!isAdmin) {
        await supabase.auth.signOut();
        toast({
          variant: "destructive",
          title: "Accès refusé",
          description: "Vous n'avez pas les permissions administrateur requises",
        });
        return;
      }

      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans le panel d'administration",
      });

      navigate('/superadmin');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Erreur de validation",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Une erreur inattendue s'est produite",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="w-full max-w-md">
        <Card className="border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-2xl">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                <div className="relative bg-primary/10 p-4 rounded-full border border-primary/20">
                  <Shield className="h-10 w-10 text-primary" />
                </div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl font-bold">Super Administration</CardTitle>
              <CardDescription className="text-muted-foreground">
                Connexion sécurisée à l'espace administrateur
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email administrateur</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@newai.sale"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="bg-background/50"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Se connecter
                  </>
                )}
              </Button>
              <div className="pt-4 border-t border-border/50">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate('/')}
                  disabled={loading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour au site
                </Button>
              </div>
            </form>
            <div className="mt-6 p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Accès réservé aux administrateurs système. Toutes les tentatives de connexion sont enregistrées.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
