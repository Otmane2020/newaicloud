import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIAssistant() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  // Hide on /mobileads route
  const hiddenRoutes = ['/mobileads'];
  if (hiddenRoutes.includes(location.pathname)) {
    return null;
  }
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Contact form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);

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

  // Update email when user changes
  useEffect(() => {
    if (user?.email) {
      setContactEmail(user.email);
    }
  }, [user]);

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

  const handleSendContact = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast.error(language === 'fr' ? "Veuillez remplir tous les champs" : "Please fill in all fields");
      return;
    }

    setIsSendingContact(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: contactName,
          email: contactEmail,
          subject: `[CatalogueOptimize AI Support Chat] Message de ${contactName}`,
          message: contactMessage,
        }
      });

      if (error) throw error;

      toast.success(t.aiAssistant.contactSent, {
        description: t.aiAssistant.contactSentDescription,
      });

      // Reset form
      setContactName("");
      setContactMessage("");
      setShowContactForm(false);

      // Add confirmation message to chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: language === 'fr' 
            ? `✅ Votre message a été envoyé avec succès ! Notre équipe vous répondra à ${contactEmail} dans les plus brefs délais.`
            : `✅ Your message has been sent successfully! Our team will respond to ${contactEmail} as soon as possible.`,
        },
      ]);
    } catch (error) {
      console.error("Error sending contact:", error);
      toast.error(t.aiAssistant.contactError);
    } finally {
      setIsSendingContact(false);
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

          {/* Toggle button for contact form */}
          <div className="px-3 py-2 border-b bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowContactForm(!showContactForm)}
              className="w-full text-xs gap-2"
            >
              {showContactForm ? (
                <>
                  <MessageCircle className="h-3 w-3" />
                  {t.aiAssistant.hideContactForm}
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3" />
                  {t.aiAssistant.showContactForm}
                </>
              )}
            </Button>
          </div>

          {/* Contact Form */}
          {showContactForm ? (
            <div className="flex-1 p-4 space-y-4 bg-muted/20 overflow-y-auto">
              <div className="text-center mb-4">
                <h4 className="font-medium text-sm">{t.aiAssistant.contactForm}</h4>
                <p className="text-xs text-muted-foreground">{t.aiAssistant.contactFormDescription}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t.aiAssistant.yourName}</label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="John Doe"
                    className="mt-1 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t.aiAssistant.yourEmail}</label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="mt-1 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t.aiAssistant.yourMessage}</label>
                  <Textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder={language === 'fr' ? "Décrivez votre demande..." : "Describe your request..."}
                    className="mt-1 text-sm min-h-[120px] resize-none"
                  />
                </div>

                <Button
                  onClick={handleSendContact}
                  disabled={isSendingContact || !contactName.trim() || !contactEmail.trim() || !contactMessage.trim()}
                  className="w-full"
                >
                  {isSendingContact ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {language === 'fr' ? "Envoi..." : "Sending..."}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t.aiAssistant.sendContact}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </Card>
      )}
    </>
  );
}
