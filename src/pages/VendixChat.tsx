import { useEffect, useRef, useState } from "react";
import { Bot, Mic, MicOff, Send, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const COPY = {
  fr: {
    title: "Démo Assistant Vendix",
    subtitle: "Testez votre robot vendeur IA en temps réel — prêt pour tablette Android",
    welcome:
      "Bonjour 👋 Je suis Vendix, votre robot vendeur intelligent. Comment puis-je vous aider aujourd'hui ?",
    placeholder: "Tapez votre message…",
    error: "Impossible de joindre Vendix pour le moment.",
    quick: [
      { title: "Produits", desc: "Découvrez nos meilleures ventes", prompt: "Quels sont vos produits phares ?" },
      { title: "Conseils", desc: "Obtenez un conseil personnalisé", prompt: "J'ai besoin d'un conseil pour choisir un cadeau." },
      { title: "Magasin", desc: "Horaires et informations", prompt: "Quels sont vos horaires d'ouverture ?" },
    ],
    system:
      "Tu es Vendix, un robot vendeur IA déployé sur une tablette Android dans des magasins et hôtels. Réponds en français, sois chaleureux, concis, et oriente le client vers la meilleure solution. Utilise un ton commercial naturel et humain.",
  },
  en: {
    title: "Vendix Assistant Demo",
    subtitle: "Test your AI sales robot in real time — ready for Android tablets",
    welcome:
      "Hi 👋 I'm Vendix, your smart sales robot. How can I help you today?",
    placeholder: "Type your message…",
    error: "Unable to reach Vendix right now.",
    quick: [
      { title: "Products", desc: "Discover our best sellers", prompt: "What are your top products?" },
      { title: "Advice", desc: "Get personalized guidance", prompt: "I need help choosing a gift." },
      { title: "Store", desc: "Hours and information", prompt: "What are your opening hours?" },
    ],
    system:
      "You are Vendix, an AI sales robot deployed on an Android tablet in shops and hotels. Reply in English, be warm, concise, and guide the customer to the best option. Use a natural, human sales tone.",
  },
};

export default function VendixChat() {
  const { language } = useTranslation();
  const t = COPY[language === "fr" ? "fr" : "en"];

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: t.welcome, isUser: false, timestamp: new Date() },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = t.title;
  }, [t.title]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? inputText).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };
    const next = [...messages, userMessage];
    setMessages(next);
    setInputText("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("vendix-chat", {
        body: {
          system: t.system,
          messages: next.map((m) => ({
            role: m.isUser ? "user" : "assistant",
            content: m.text,
          })),
        },
      });
      if (error) throw error;
      const reply =
        (data as any)?.reply ||
        (data as any)?.message ||
        (data as any)?.content ||
        t.welcome;
      setMessages((m) => [
        ...m,
        {
          id: (Date.now() + 1).toString(),
          text: reply,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } catch (e) {
      console.error(e);
      toast.error(t.error);
      setMessages((m) => [
        ...m,
        {
          id: (Date.now() + 1).toString(),
          text: t.error,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleListening = () => setIsListening((v) => !v);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
            <p className="text-cyan-200/80">{t.subtitle}</p>
          </div>

          {/* Chat Container */}
          <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
            {/* Messages */}
            <div className="h-[28rem] overflow-y-auto p-6 space-y-4">

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex items-start space-x-3 max-w-xs lg:max-w-md">
                    {!message.isUser && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}

                    <div
                      className={`px-4 py-2 rounded-lg ${
                        message.isUser
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.isUser ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>

                    {message.isUser && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-gray-100 px-4 py-2 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t bg-gray-50 p-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleListening}
                  className={`p-2 rounded-full transition-colors ${
                    isListening
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <div className="flex-1">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t.placeholder}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={1}
                    disabled={isLoading}
                  />
                </div>

                <button
                  onClick={() => sendMessage()}
                  disabled={!inputText.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-full transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {t.quick.map((q) => (
              <button
                key={q.title}
                onClick={() => sendMessage(q.prompt)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <h3 className="font-semibold text-gray-900">{q.title}</h3>
                <p className="text-sm text-gray-600">{q.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
