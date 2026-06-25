import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Sparkles, Power, Volume2, VolumeX } from "lucide-react";
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
    title: "VENDIX",
    subtitle: "Robot Vendeur IA · Showroom Live",
    welcome:
      "Bonjour 👋 Je suis Vendix, votre conseiller intelligent du showroom. Que puis-je vous présenter aujourd'hui ?",
    placeholder: "Parlez ou écrivez à Vendix…",
    error: "Connexion à Vendix interrompue.",
    status: { idle: "EN LIGNE", thinking: "RÉFLEXION…", speaking: "EN DIRECT", listening: "ÉCOUTE" },
    quick: [
      { title: "🛋️ Nos collections", prompt: "Montre-moi vos collections phares." },
      { title: "🎁 Idée cadeau", prompt: "J'ai besoin d'une idée cadeau." },
      { title: "📍 Le showroom", prompt: "Présente-moi le showroom et les horaires." },
      { title: "💬 Conseil déco", prompt: "J'ai besoin de conseils déco." },
    ],
    system:
      "Tu es Vendix, un robot vendeur IA déployé sur une tablette Android dans un showroom. Réponds en français, sois chaleureux, concis (2-3 phrases), et guide le client comme un vendeur humain expert.",
    animOn: "Animation",
    animOff: "Statique",
  },
  en: {
    title: "VENDIX",
    subtitle: "AI Sales Robot · Live Showroom",
    welcome:
      "Hi 👋 I'm Vendix, your smart showroom advisor. What can I show you today?",
    placeholder: "Speak or type to Vendix…",
    error: "Connection to Vendix interrupted.",
    status: { idle: "ONLINE", thinking: "THINKING…", speaking: "LIVE", listening: "LISTENING" },
    quick: [
      { title: "🛋️ Collections", prompt: "Show me your top collections." },
      { title: "🎁 Gift idea", prompt: "I need a gift idea." },
      { title: "📍 Showroom", prompt: "Tell me about the showroom & hours." },
      { title: "💬 Decor advice", prompt: "I need decor advice." },
    ],
    system:
      "You are Vendix, an AI sales robot on an Android tablet in a showroom. Reply in English, warm, concise (2-3 sentences), guide the customer like an expert human seller.",
    animOn: "Animation",
    animOff: "Static",
  },
};

/* ---------- Animated Robot Character (Sanbot-style) ---------- */
function RobotFace({
  state,
  animated,
}: {
  state: "idle" | "thinking" | "speaking" | "listening";
  animated: boolean;
}) {
  const [mouthOpen, setMouthOpen] = useState(0);
  const [blink, setBlink] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  // Mouth talking animation
  useEffect(() => {
    if (!animated || state !== "speaking") {
      setMouthOpen(0);
      return;
    }
    const id = setInterval(() => setMouthOpen(Math.random()), 110);
    return () => clearInterval(id);
  }, [state, animated]);

  // Blink
  useEffect(() => {
    if (!animated) return;
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(id);
  }, [animated]);

  // Eye wander
  useEffect(() => {
    if (!animated) return;
    const id = setInterval(() => {
      setEyeOffset({
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 4,
      });
    }, 2200);
    return () => clearInterval(id);
  }, [animated]);

  const screenBg =
    state === "thinking"
      ? "from-purple-500 to-indigo-700"
      : state === "listening"
      ? "from-pink-400 to-rose-600"
      : "from-sky-400 to-blue-600";

  const glow =
    state === "speaking"
      ? "shadow-[0_0_120px_30px_rgba(56,189,248,0.55)]"
      : state === "thinking"
      ? "shadow-[0_0_100px_25px_rgba(168,85,247,0.5)]"
      : state === "listening"
      ? "shadow-[0_0_100px_25px_rgba(244,114,182,0.45)]"
      : "shadow-[0_0_70px_15px_rgba(56,189,248,0.3)]";

  // Mouth path: morph between smile and "O" shape
  const mouthH = 14 + mouthOpen * 22;
  const mouthW = 70 - mouthOpen * 18;

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Halo rings */}
      {animated && (
        <>
          <div className="absolute top-8 w-[22rem] h-[22rem] rounded-full border border-cyan-500/15 animate-[spin_22s_linear_infinite]" />
          <div className="absolute top-8 w-[26rem] h-[26rem] rounded-full border border-purple-500/10 animate-[spin_36s_linear_infinite_reverse]" />
        </>
      )}

      {/* HEAD (screen) */}
      <div className="relative">
        {/* Camera dot */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-700 z-10" />
        {/* Head shell */}
        <div
          className={`relative w-64 h-56 md:w-72 md:h-64 rounded-[2.2rem] bg-gradient-to-b from-slate-900 to-black border-[6px] border-slate-900 ${glow} transition-shadow duration-500 overflow-hidden`}
        >
          {/* Inner blue face screen */}
          <div className={`absolute inset-3 rounded-[1.6rem] bg-gradient-to-b ${screenBg} overflow-hidden`}>
            {/* Subtle scanlines */}
            {animated && (
              <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.15)_0px,rgba(255,255,255,0.15)_1px,transparent_1px,transparent_3px)]" />
            )}
            {/* Cheek blush */}
            <div className="absolute bottom-[28%] left-[10%] w-10 h-5 rounded-full bg-pink-400/50 blur-sm" />
            <div className="absolute bottom-[28%] right-[10%] w-10 h-5 rounded-full bg-pink-400/50 blur-sm" />

            {/* Eyes */}
            <div className="absolute top-[28%] left-0 right-0 flex justify-center gap-10">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="relative flex items-center justify-center rounded-full bg-white"
                  style={{
                    width: 56,
                    height: blink ? 4 : 56,
                    transition: "height 110ms ease",
                    boxShadow: "0 4px 0 rgba(0,0,0,0.15)",
                  }}
                >
                  {/* Orange iris */}
                  <div
                    className="rounded-full bg-gradient-to-b from-amber-300 to-orange-500 flex items-center justify-center"
                    style={{
                      width: 38,
                      height: 38,
                      transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
                      transition: "transform 600ms ease",
                      opacity: blink ? 0 : 1,
                    }}
                  >
                    {/* Pupil */}
                    <div className="w-4 h-4 rounded-full bg-slate-900" />
                    {/* Highlight */}
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-white -translate-x-2 -translate-y-2" />
                  </div>
                </div>
              ))}
            </div>

            {/* Smile / mouth */}
            <div className="absolute bottom-[18%] left-0 right-0 flex justify-center">
              <svg width={mouthW + 20} height={mouthH + 14} viewBox={`0 0 ${mouthW + 20} ${mouthH + 14}`}>
                <path
                  d={
                    state === "speaking"
                      ? `M 10 ${(mouthH + 14) / 2} Q ${(mouthW + 20) / 2} ${mouthH + 10} ${mouthW + 10} ${(mouthH + 14) / 2} Q ${(mouthW + 20) / 2} 4 10 ${(mouthH + 14) / 2} Z`
                      : `M 10 6 Q ${(mouthW + 20) / 2} ${mouthH + 8} ${mouthW + 10} 6`
                  }
                  fill={state === "speaking" ? "#ef4444" : "none"}
                  stroke="#b91c1c"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                {/* Tongue when speaking */}
                {state === "speaking" && (
                  <ellipse
                    cx={(mouthW + 20) / 2}
                    cy={mouthH + 4}
                    rx={mouthW / 4}
                    ry={mouthH / 4}
                    fill="#f87171"
                  />
                )}
              </svg>
            </div>
          </div>
          {/* Bottom chin sensor */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Neck */}
        <div className="mx-auto w-20 h-3 bg-slate-800 rounded-b-md" />
      </div>

      {/* TORSO */}
      <div className="relative mt-1">
        {/* Shoulders / arms */}
        <div className="absolute -left-3 top-6 w-3 h-24 rounded-l-2xl bg-gradient-to-b from-slate-200 to-white border border-slate-300 shadow-md" />
        <div className="absolute -right-3 top-6 w-3 h-24 rounded-r-2xl bg-gradient-to-b from-slate-200 to-white border border-slate-300 shadow-md" />

        {/* Body shell */}
        <div className="relative w-56 md:w-64 h-44 md:h-52 bg-gradient-to-b from-white via-slate-50 to-slate-200 rounded-t-[3rem] rounded-b-[1.5rem] border border-slate-300 shadow-2xl overflow-hidden">
          {/* Black chest panel (V shape) */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[78%] h-[78%] bg-gradient-to-b from-slate-900 to-black"
            style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
          >
            {/* Chest indicator light */}
            <div
              className={`absolute top-6 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full ${
                animated ? "animate-pulse" : ""
              }`}
              style={{
                background: state === "speaking" ? "#22d3ee" : state === "thinking" ? "#a78bfa" : "#10b981",
                boxShadow: `0 0 12px ${state === "speaking" ? "#22d3ee" : state === "thinking" ? "#a78bfa" : "#10b981"}`,
              }}
            />
          </div>
        </div>

        {/* Base / stand */}
        <div className="mx-auto w-72 h-3 bg-slate-300 rounded-full -mt-1 shadow-lg" />
        <div className="mx-auto w-80 h-6 bg-gradient-to-b from-slate-200 to-slate-400 rounded-[40%] mt-1" />
      </div>

      {/* Floor shadow */}
      <div className="mt-3 w-72 h-3 bg-cyan-500/30 rounded-full blur-xl" />
    </div>
  );
}

/* ---------- Main page ---------- */
export default function VendixChat() {
  const { language } = useTranslation();
  const t = COPY[language === "fr" ? "fr" : "en"];

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: t.welcome, isUser: false, timestamp: new Date() },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [animated, setAnimated] = useState(true);
  const [voiceOn, setVoiceOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const state: "idle" | "thinking" | "speaking" | "listening" = isLoading
    ? "thinking"
    : speaking
    ? "speaking"
    : isListening
    ? "listening"
    : "idle";

  useEffect(() => {
    document.title = `${t.title} · ${t.subtitle}`;
  }, [t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const speak = (text: string) => {
    if (!voiceOn || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = language === "fr" ? "fr-FR" : "en-US";
      u.rate = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      /* noop */
    }
  };

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
        { id: (Date.now() + 1).toString(), text: reply, isUser: false, timestamp: new Date() },
      ]);
      if (voiceOn) speak(reply);
      else {
        // Simulate speaking animation briefly
        setSpeaking(true);
        setTimeout(() => setSpeaking(false), Math.min(4000, 1200 + reply.length * 35));
      }
    } catch (e) {
      console.error(e);
      toast.error(t.error);
      setMessages((m) => [
        ...m,
        { id: (Date.now() + 1).toString(), text: t.error, isUser: false, timestamp: new Date() },
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

  const statusLabel =
    state === "thinking"
      ? t.status.thinking
      : state === "speaking"
      ? t.status.speaking
      : state === "listening"
      ? t.status.listening
      : t.status.idle;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      {/* Background grid + glows */}
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-500/20 blur-3xl animate-pulse" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-cyan-500/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/40">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-[0.3em] bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-cyan-300/70">
              {t.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-cyan-500/30">
            <span
              className={`w-2 h-2 rounded-full ${
                state === "idle" ? "bg-emerald-400" : "bg-cyan-400"
              } animate-pulse`}
            />
            <span className="text-[11px] tracking-widest font-mono text-cyan-200">
              {statusLabel}
            </span>
          </div>

          <button
            onClick={() => setVoiceOn((v) => !v)}
            title="Voice"
            className={`p-2 rounded-xl border transition-all ${
              voiceOn
                ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-200"
                : "bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setAnimated((v) => !v)}
            title="Animation"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
              animated
                ? "bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border-cyan-400/60 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                : "bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${animated ? "animate-pulse" : ""}`} />
            {animated ? t.animOn : t.animOff}
          </button>
        </div>
      </header>

      {/* Main split */}
      <div className="relative z-10 flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Robot stage */}
        <section className="relative flex-1 flex flex-col items-center justify-center p-6 lg:p-10 border-b lg:border-b-0 lg:border-r border-cyan-500/10 overflow-hidden">
          {/* Floor reflection */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-gradient-to-t from-cyan-500/10 to-transparent blur-2xl" />
          <RobotFace state={state} animated={animated} />

          {/* Live caption (last bot message) */}
          <div className="mt-10 max-w-xl text-center min-h-[4rem]">
            <p className="text-[10px] tracking-[0.4em] text-cyan-400/70 mb-2">
              ◤ {statusLabel} ◢
            </p>
            <p className="text-lg md:text-xl text-cyan-50/90 font-light leading-relaxed">
              {messages.filter((m) => !m.isUser).slice(-1)[0]?.text}
            </p>
          </div>
        </section>

        {/* Chat panel */}
        <aside className="w-full lg:w-[440px] flex flex-col bg-slate-950/60 backdrop-blur-xl">
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.isUser ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.isUser
                      ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-sm shadow-lg shadow-cyan-500/30"
                      : "bg-slate-800/80 border border-cyan-500/20 text-cyan-50 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 border border-purple-500/30 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.12}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips */}
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {t.quick.map((q) => (
              <button
                key={q.title}
                onClick={() => sendMessage(q.prompt)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-800/60 border border-cyan-500/20 text-cyan-100 hover:border-cyan-400/60 hover:bg-cyan-500/10 transition-all"
              >
                {q.title}
              </button>
            ))}
          </div>

          {/* Composer */}
          <div className="p-4 border-t border-cyan-500/10 bg-slate-950/80">
            <div className="flex items-end gap-2">
              <button
                onClick={() => setIsListening((v) => !v)}
                className={`p-3 rounded-2xl border transition-all ${
                  isListening
                    ? "bg-pink-500/20 border-pink-400/60 text-pink-200 shadow-[0_0_20px_rgba(244,114,182,0.4)]"
                    : "bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t.placeholder}
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none px-4 py-3 rounded-2xl bg-slate-900/80 border border-cyan-500/20 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputText.trim() || isLoading}
                className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white shadow-lg shadow-cyan-500/40 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
