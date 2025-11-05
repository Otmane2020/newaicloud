import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIAssistant() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message based on language
  useEffect(() => {
    setMessages([{
      role: "assistant",
      content: t.aiAssistant.welcome,
    }]);
  }, [language, t.aiAssistant.welcome]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            language: language,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage?.role === "assistant") {
                      newMessages[newMessages.length - 1] = {
                        ...lastMessage,
                        content: assistantMessage,
                      };
                    } else {
                      newMessages.push({
                        role: "assistant",
                        content: assistantMessage,
                      });
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t.aiAssistant.error,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-xl hover:shadow-2xl transition-shadow z-50 bg-gradient-to-br from-primary to-primary/80"
          size="icon"
        >
          <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
        </Button>
      )}

      {/* Chat window */}
      {isOpen && (
        <Card className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[380px] h-[100vh] sm:h-[600px] sm:rounded-2xl shadow-2xl z-50 flex flex-col border-0 sm:border">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-gradient-to-r from-primary to-primary/90 text-primary-foreground sm:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base">{t.aiAssistant.title}</h3>
                <p className="text-xs opacity-90">{t.aiAssistant.subtitle}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3 sm:p-4 bg-muted/20" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  {message.role === "assistant" && (
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0">
                      <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border rounded-bl-sm"
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                    <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div className="bg-card border rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm">
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t bg-background">
            <div className="flex gap-2 items-end">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t.aiAssistant.placeholder}
                disabled={isLoading}
                className="flex-1 text-sm rounded-xl resize-none min-h-[40px] sm:min-h-[44px]"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex-shrink-0"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
