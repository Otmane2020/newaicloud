import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ChatRobot() {
  const { user } = useAuth();
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [muted, setMuted] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        setTranscript(speechResult);
        handleQuery(speechResult);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setListening(false);
        toast.error('Erreur de reconnaissance vocale');
      };

      recognitionRef.current.onend = () => {
        setListening(false);
      };
    } else {
      toast.error('Reconnaissance vocale non supportée');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      setListening(false);
      recognitionRef.current.stop();
    }
  };

  const handleQuery = async (query: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('chat-smart', {
        body: {
          message: query,
          sessionId: `robot-${user?.id}-${Date.now()}`,
        },
      });

      if (error) throw error;

      const aiResponse = data?.response || 'Désolé, je n\'ai pas compris.';
      setResponse(aiResponse);

      // Speak the response
      if (!muted) {
        speakResponse(aiResponse);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erreur lors de la requête');
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);

      synthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleMute = () => {
    setMuted(!muted);
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full p-8 md:p-12">
        <div className="text-center space-y-8">
          {/* Robot Icon */}
          <div className="flex justify-center">
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl transition-all duration-300 ${
              listening || speaking ? 'scale-110 animate-pulse' : 'scale-100'
            }`}>
              <Bot className="w-16 h-16 text-primary-foreground" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Assistant Robot</h1>
            <p className="text-xl text-muted-foreground">
              {listening ? '🎤 Je vous écoute...' : speaking ? '🔊 Je réponds...' : '👋 Bonjour ! Que puis-je faire pour vous ?'}
            </p>
          </div>

          {/* Transcript Display */}
          {transcript && (
            <Card className="p-6 bg-accent">
              <p className="text-lg"><strong>Vous :</strong> {transcript}</p>
            </Card>
          )}

          {/* Response Display */}
          {response && (
            <Card className="p-6 bg-primary/10">
              <p className="text-lg"><strong>Assistant :</strong> {response}</p>
            </Card>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4">
            {!listening ? (
              <Button
                size="lg"
                className="h-20 w-20 rounded-full"
                onClick={startListening}
              >
                <Mic className="w-8 h-8" />
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                className="h-20 w-20 rounded-full"
                onClick={stopListening}
              >
                <MicOff className="w-8 h-8" />
              </Button>
            )}

            <Button
              size="lg"
              variant="outline"
              className="h-20 w-20 rounded-full"
              onClick={toggleMute}
            >
              {muted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p>🎤 Cliquez sur le microphone pour commencer à parler</p>
            <p>🔊 L'assistant répondra automatiquement par voix</p>
            <p>🔇 Utilisez le bouton son pour activer/désactiver la voix</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
