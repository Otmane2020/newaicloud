import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
      toast.success("🎤 Écoute activée");
    } catch (error) {
      console.error("Microphone error:", error);
      toast.error("Impossible d'accéder au microphone");
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

      // Call chat AI
      const { data: chatData, error: chatError } = await supabase.functions.invoke("chat-smart", {
        body: {
          message: userText,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        },
      });

      if (chatError) throw chatError;

      const assistantText = chatData.response;
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
      toast.error(error.message || "Erreur lors du traitement");
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
    <div className={`${fullscreen ? "fixed inset-0 z-50" : "min-h-screen"} bg-gradient-subtle flex flex-col`}>
      {/* Header */}
      <header className="border-b bg-background p-4 flex-shrink-0">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-2xl bg-gradient-primary bg-clip-text text-transparent">
                NewAI Robot
              </span>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <Home className="w-4 h-4 mr-2" />
              Accueil
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
      </header>

      {/* Chat Zone */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-gradient-primary mx-auto mb-6 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Bonjour, je suis votre assistant robot</h2>
              <p className="text-lg text-muted-foreground">
                Appuyez sur le microphone pour commencer à parler
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
                      {message.role === "user" ? "Vous" : "Robot"}
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

      {/* Controls */}
      <div className="border-t bg-background p-6 flex-shrink-0">
        <div className="container mx-auto flex justify-center items-center gap-4">
          <Button
            size="lg"
            className={`w-20 h-20 rounded-full ${listening ? "bg-destructive hover:bg-destructive/90" : ""}`}
            onClick={listening ? stopListening : startListening}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : listening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>
          {listening && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm font-medium">Écoute en cours...</span>
            </div>
          )}
          {processing && (
            <span className="text-sm text-muted-foreground">Traitement en cours...</span>
          )}
        </div>
      </div>
    </div>
  );
}
