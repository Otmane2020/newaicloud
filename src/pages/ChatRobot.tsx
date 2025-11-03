import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import { Mic, MicOff, Maximize, Minimize, Home, Settings, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatRobot() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [fullscreen, setFullscreen] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setListening(true);
      toast.success(t.seo.chatRobot.listeningEnabled);
    } catch (error) {
      console.error("Microphone error:", error);
      toast.error(t.seo.chatRobot.microphoneError);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setListening(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setProcessing(true);
    try {
      // Convert audio to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
      });

      // Call STT function
      const { data: sttData, error: sttError } = await supabase.functions.invoke("robot-stt", {
        body: { audio: base64Audio },
      });

      if (sttError) throw sttError;

      const userText = sttData.text;
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Call chat AI (streaming response)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-smart`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            userMessage: userText,
            history: messages.map(m => ({
              role: m.role,
              content: m.content
            }))
          }),
        }
      );

      if (!response.ok) throw new Error("Chat API error");

      // Read SSE stream
      const streamReader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      if (streamReader) {
        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  assistantText += parsed.content;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Call TTS function
      const { data: ttsData, error: ttsError } = await supabase.functions.invoke("robot-tts", {
        body: { text: assistantText },
      });

      if (ttsError) throw ttsError;

      // Play audio
      const audioData = `data:audio/mp3;base64,${ttsData.audio}`;
      const audio = new Audio(audioData);
      audio.play();
    } catch (error: any) {
      console.error("Processing error:", error);
      toast.error(error.message || t.seo.chatRobot.processingError);
    } finally {
      setProcessing(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  return (
    <div className={`${fullscreen ? "fixed inset-0 z-50" : "h-screen"} flex flex-col`}>
      {/* PARTIE 1: Header fixe avec statut d'écoute */}
      <header className="flex-shrink-0 bg-card border-b shadow-lg">
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-2xl bg-gradient-primary bg-clip-text text-transparent">
                  {t.seo.chatRobot.title}
                </span>
              </div>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                <Home className="w-4 h-4 mr-2" />
                {t.seo.chatRobot.home}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate("/chat-settings")}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Animation d'écoute */}
          {listening && (
            <div className="flex items-center justify-center gap-4 py-4 animate-fade-in">
              {/* Ondes sonores animées */}
              <div className="flex gap-1.5">
                <div className="w-1.5 rounded-full bg-primary animate-sound-wave-1" style={{ height: '1.5rem' }} />
                <div className="w-1.5 rounded-full bg-primary animate-sound-wave-2" style={{ height: '1.5rem' }} />
                <div className="w-1.5 rounded-full bg-primary animate-sound-wave-3" style={{ height: '1.5rem' }} />
              </div>
              <span className="text-lg font-semibold text-primary animate-pulse">
                {t.seo.chatRobot.listeningInProgress}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* PARTIE 2: Zone de chat scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-subtle p-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-gradient-primary mx-auto mb-6 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4">{t.seo.chatRobot.greeting}</h2>
              <p className="text-lg text-muted-foreground">
                {t.seo.chatRobot.subtitle}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <Card
                key={message.id}
                className={`p-6 ${
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground max-w-[80%]"
                    : "mr-auto bg-muted max-w-[80%]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-medium mb-2">
                      {message.role === "user" ? t.seo.chatRobot.you : t.seo.chatRobot.robot}
                    </div>
                    <div className="text-lg leading-relaxed">{message.content}</div>
                    <div className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString("fr-FR")}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* PARTIE 3: Contrôles micro (sticky bottom) */}
      <div className="flex-shrink-0 bg-card border-t shadow-lg p-6">
        <div className="container mx-auto flex justify-center items-center gap-4">
          <Button
            size="lg"
            className={`w-24 h-24 rounded-full relative ${listening ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}`}
            onClick={listening ? stopListening : startListening}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : listening ? (
              <div className="relative">
                <MicOff className="w-10 h-10" />
                {/* Cercles animés qui s'agrandissent */}
                <div className="absolute inset-0 animate-ripple rounded-full bg-destructive/50" />
                <div className="absolute inset-0 animate-ripple rounded-full bg-destructive/30" style={{ animationDelay: '0.5s' }} />
              </div>
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </Button>
          {processing && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium text-muted-foreground">{t.seo.chatRobot.processing}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
