import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Copy, Check, Zap, AlertCircle, Lightbulb, List, MousePointer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneratedScript {
  hook: string;
  problem: string;
  solution: string;
  benefits: string[];
  cta: string;
}

interface ScriptGeneratorProps {
  onApplyScript: (script: GeneratedScript) => void;
}

export function ScriptGenerator({ onApplyScript }: ScriptGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [audience, setAudience] = useState("shopify-sellers");
  const [context, setContext] = useState("");
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);

  const generateScript = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-video-script", {
        body: { language, audience, context },
      });

      if (error) throw error;

      if (data?.script) {
        setGeneratedScript(data.script);
        toast({ title: "Script generated successfully!" });
      }
    } catch (error) {
      console.error("Error generating script:", error);
      toast({ title: "Error generating script", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedScript) return;
    
    const text = `
HOOK: ${generatedScript.hook}

PROBLEM: ${generatedScript.problem}

SOLUTION: ${generatedScript.solution}

BENEFITS:
${generatedScript.benefits.map((b, i) => `${i + 1}. ${b}`).join("\n")}

CTA: ${generatedScript.cta}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configuration */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Script Generator
          </CardTitle>
          <CardDescription>
            Generate high-impact video ad scripts with AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as "fr" | "en")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">🇫🇷 French</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shopify-sellers">Shopify Sellers</SelectItem>
                <SelectItem value="dropshippers">Dropshippers</SelectItem>
                <SelectItem value="ecommerce">E-commerce General</SelectItem>
                <SelectItem value="agencies">Marketing Agencies</SelectItem>
                <SelectItem value="furniture">Furniture Stores</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Additional Context (optional)</Label>
            <Textarea
              placeholder="E.g., Focus on SEO features, highlight AI image generation..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            className="w-full gap-2"
            onClick={generateScript}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? "Generating..." : "Generate Script"}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Script */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Generated Script</CardTitle>
            {generatedScript && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => generatedScript && onApplyScript(generatedScript)}
                >
                  Apply to Storyboard
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {generatedScript ? (
            <div className="space-y-4">
              <ScriptSection
                icon={Zap}
                label="Hook"
                color="text-yellow-400"
                bg="bg-yellow-500/10"
                content={generatedScript.hook}
              />
              <ScriptSection
                icon={AlertCircle}
                label="Problem"
                color="text-red-400"
                bg="bg-red-500/10"
                content={generatedScript.problem}
              />
              <ScriptSection
                icon={Lightbulb}
                label="Solution"
                color="text-cyan-400"
                bg="bg-cyan-500/10"
                content={generatedScript.solution}
              />
              <div className={`p-3 rounded-lg bg-green-500/10`}>
                <div className="flex items-center gap-2 mb-2">
                  <List className="w-4 h-4 text-green-400" />
                  <Badge variant="outline">Benefits</Badge>
                </div>
                <ul className="space-y-1 text-sm">
                  {generatedScript.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-400">•</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              <ScriptSection
                icon={MousePointer}
                label="CTA"
                color="text-purple-400"
                bg="bg-purple-500/10"
                content={generatedScript.cta}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Configure your preferences and click Generate to create an AI-powered video ad script
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ScriptSection({
  icon: Icon,
  label,
  color,
  bg,
  content,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  content: string;
}) {
  return (
    <div className={`p-3 rounded-lg ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <Badge variant="outline">{label}</Badge>
      </div>
      <p className="text-sm">{content}</p>
    </div>
  );
}
