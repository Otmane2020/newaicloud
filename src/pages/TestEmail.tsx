import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TestEmail = () => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-welcome-email', {
        body: {
          email,
          fullName,
          language: 'fr'
        }
      });

      if (error) {
        throw error;
      }

      setResult({
        success: true,
        message: `Email envoyé avec succès à ${email}`
      });

      toast({
        title: "✅ Email envoyé",
        description: `L'email de test a été envoyé à ${email}`,
      });
    } catch (error: any) {
      console.error('Erreur:', error);
      setResult({
        success: false,
        message: error.message || "Erreur lors de l'envoi de l'email"
      });

      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Test Email SMTP
          </h1>
          <p className="text-muted-foreground">
            Testez la configuration SMTP avec O2Switch
          </p>
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Envoyer un email de test
            </CardTitle>
            <CardDescription>
              Configuration actuelle : ohio.o2switch.net:465 (support@newai.sale)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTestEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email destinataire</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemple@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Envoyer l'email de test
                  </>
                )}
              </Button>
            </form>

            {result && (
              <Alert 
                className={`mt-4 ${result.success ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-destructive bg-destructive/10'}`}
              >
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <AlertDescription className={result.success ? 'text-green-900 dark:text-green-100' : ''}>
                  {result.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-lg">Points à vérifier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>Vérifiez le dossier spam/courrier indésirable</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>Les emails peuvent prendre quelques minutes à arriver</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>L'adresse support@newai.sale doit être configurée sur O2Switch</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>Le mot de passe SMTP doit être correct dans les secrets</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestEmail;
