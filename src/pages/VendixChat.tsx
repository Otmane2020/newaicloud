import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/language";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const COPY = {
  fr: {
    title: "Vendix — Assistant Commercial IA",
    subtitle: "Votre robot vendeur multilingue, prêt à conseiller vos clients 24/7.",
    placeholder: "Posez une question à Vendix…",
    send: "Envoyer",
    welcome:
      "Bonjour 👋 Je suis Vendix, votre assistant commercial IA. Que souhaitez-vous savoir aujourd'hui ?",
    suggestions: [
      "Quels produits recommandez-vous pour un cadeau ?",
      "Avez-vous cet article en stock ?",
      "Quels sont vos horaires d'ouverture ?",
    ],
    error: "Impossible de joindre Vendix pour le moment.",
    sending: "Vendix réfléchit…",
  },
  en: {
    title: "Vendix — AI Sales Assistant",
    subtitle: "Your multilingual sales robot, ready to advise your customers 24/7.",
    placeholder: "Ask Vendix a question…",
    send: "Send",
    welcome:
      "Hi 👋 I'm Vendix, your AI sales assistant. What would you like to know today?",
    suggestions: [
      "Which products do you recommend as a gift?",
      "Do you have this item in stock?",
      "What are your opening hours?",
    ],
    error: "Unable to reach Vendix right now.",
    sending: "Vendix is thinking…",
  },
};

export default function VendixChat() {
  const { language } = useTranslation();
  const t = COPY[language === "fr" ? "fr" : "en"];

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t.welcome },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = t.title;
  }, [t.title]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          system:
            language === "fr"
              ? "Tu es Vendix, un robot vendeur IA pour magasins et hôtels. Réponds en français, sois chaleureux, concis et orienté conseil commercial."
              : "You are Vendix, an AI sales robot for retail stores and hotels. Reply in English, be warm, concise and sales-oriented.",
        },
      });
      if (error) throw error;
      const reply =
        (data as any)?.reply ||
        (data as any)?.message ||
        (data as any)?.content ||
        (typeof data === "string" ? data : "");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply || t.welcome },
      ]);
    } catch (e) {
      console.error(e);
      toast.error(t.error);
      setMessages((m) => [...m, { role: "assistant", content: t.error }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
        </header>

        <Card className="flex h-[70vh] flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                {t.sending}
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 border-t p-3">
              {t.suggestions.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  onClick={() => send(s)}
                  className="rounded-full text-xs"
                >
                  {s}
                </Button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2 border-t p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">{t.send}</span>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
