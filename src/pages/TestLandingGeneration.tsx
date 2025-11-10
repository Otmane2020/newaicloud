import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Smartphone, Monitor } from "lucide-react";

export default function TestLandingGeneration() {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const { toast } = useToast();

  const testProductData = {
    product_id: "test-product-123",
    productTitle: "Armoire Test Velmio",
    description: "Armoire moderne blanche laquée mate avec structure dorée",
    vendor: "Velmio",
    mainColor: "#5A3E2B",
    imageUrl: "https://cdn.shopify.com/s/files/1/0903/7578/2665/files/pr_viterbo_01_a_cfbea79b-6204-423c-bb80-f5c4eff16cef.jpg?v=1754406801",
    language: "fr",
  };

  const validateHTML = (htmlContent: string): string[] => {
    const problems: string[] = [];

    // Check for proper HTML structure
    if (!htmlContent.includes("<!DOCTYPE html>")) {
      problems.push("❌ Manque <!DOCTYPE html>");
    }
    if (!htmlContent.includes("<html")) {
      problems.push("❌ Manque balise <html>");
    }
    if (!htmlContent.includes("</body>")) {
      problems.push("❌ Manque balise fermante </body>");
    }

    // Check for forbidden CSS variables
    if (htmlContent.includes(":root")) {
      problems.push("❌ CSS :root trouvé (INTERDIT)");
    }
    if (htmlContent.includes("--primary-color")) {
      problems.push("❌ Variable CSS --primary-color trouvée (INTERDIT)");
    }
    if (htmlContent.match(/\.text-primary|\.bg-primary|\.border-primary/)) {
      problems.push("❌ Classes custom .text-primary/.bg-primary trouvées (INTERDIT)");
    }

    // Check for HEX colors
    if (htmlContent.match(/#[0-9A-Fa-f]{6}/)) {
      problems.push("❌ Couleurs HEX trouvées (doit utiliser HSL)");
    }

    // Check for duplicate responsive classes
    const duplicatePattern = /(sm|md|lg|xl):[^\s]+\s+[^\s]*\1:/;
    if (duplicatePattern.test(htmlContent)) {
      problems.push("❌ Classes responsive dupliquées détectées");
    }

    // Check for footer
    if (htmlContent.toLowerCase().includes("<footer")) {
      problems.push("⚠️ Footer trouvé (devrait être supprimé)");
    }

    // Check for proper HSL usage
    if (htmlContent.includes("hsl(") && htmlContent.includes("style=")) {
      problems.push("✅ Styles inline HSL utilisés correctement");
    } else {
      problems.push("⚠️ Aucun style inline HSL détecté");
    }

    // Check responsive classes
    if (htmlContent.includes("sm:") && htmlContent.includes("md:")) {
      problems.push("✅ Classes responsive Tailwind présentes");
    } else {
      problems.push("❌ Classes responsive manquantes");
    }

    return problems;
  };

  const generateLanding = async () => {
    setLoading(true);
    setIssues([]);
    setHtml("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-landing-ai", {
        body: testProductData,
      });

      if (error) throw error;

      if (data?.html) {
        setHtml(data.html);
        const validationIssues = validateHTML(data.html);
        setIssues(validationIssues);

        const hasErrors = validationIssues.some(issue => issue.startsWith("❌"));
        toast({
          title: hasErrors ? "⚠️ Problèmes détectés" : "✅ HTML généré avec succès",
          description: hasErrors 
            ? "Voir les détails ci-dessous" 
            : "Aucun problème majeur détecté",
        });
      }
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Test Génération Landing Page
          </h1>
          <p className="text-gray-600">
            Vérification automatique de la structure HTML, couleurs HSL et responsive
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Données de test</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(testProductData, null, 2)}
            </pre>
          </div>

          <Button 
            onClick={generateLanding} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              "Générer Landing Page Test"
            )}
          </Button>
        </Card>

        {issues.length > 0 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Validation automatique
              {issues.some(i => i.startsWith("❌")) ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </h2>
            <ul className="space-y-2">
              {issues.map((issue, i) => (
                <li 
                  key={i}
                  className={`text-sm ${
                    issue.startsWith("❌") 
                      ? "text-red-600 font-semibold" 
                      : issue.startsWith("⚠️")
                      ? "text-orange-600"
                      : "text-green-600"
                  }`}
                >
                  {issue}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {html && (
          <>
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Aperçu</h2>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "desktop" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("desktop")}
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Desktop
                  </Button>
                  <Button
                    variant={viewMode === "mobile" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("mobile")}
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Mobile
                  </Button>
                </div>
              </div>
              <div 
                className={`border rounded-lg overflow-hidden ${
                  viewMode === "mobile" ? "max-w-sm mx-auto" : ""
                }`}
              >
                <iframe
                  srcDoc={html}
                  className="w-full h-[600px] bg-white"
                  title="Landing page preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Code HTML généré</h2>
              <Textarea
                value={html}
                readOnly
                className="font-mono text-xs h-[400px]"
              />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
