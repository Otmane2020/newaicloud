import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Sparkles, Power, Volume2, VolumeX, Camera, ShoppingCart, X, QrCode, Trash2, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CheckoutFlow, { type CheckoutProduct } from "@/components/vendix/CheckoutFlow";
import LocalQrCode from "@/components/vendix/LocalQrCode";

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = String(r.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });


interface ProductCard {
  id: string;
  title: string;
  price: number | string | null;
  image_url: string | null;
  handle: string | null;
  checkout_url?: string | null;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  products?: ProductCard[];
  image?: string;
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
      { title: "👋 Accueil proactif", prompt: "Salue-moi et présente-toi en tant que vendeur du showroom." },
      { title: "🏛️ Visite du showroom", prompt: "Fais-moi visiter le showroom et présente les zones et collections principales." },
      { title: "🧭 Guide Intelligent", prompt: "Aide-moi à naviguer dans le catalogue et recommande des produits selon mes besoins." },
      { title: "👁️ Reconnaissance produit", prompt: "Identifie les produits phares et explique pourquoi ils sont populaires." },
    ],
    system:
      "Tu es Vendix, un robot vendeur IA déployé sur une tablette Android dans un showroom. Réponds en français, sois chaleureux, concis (2-3 phrases), et guide le client comme un vendeur humain expert.",
    animOn: "Animation",
    animOff: "Statique",
    featured: "Featured Products",
    recommendations: "Recommandations",
    addToCart: "Ajouter",
    viewMore: "Voir plus",
    cart: "Panier",
    emptyCart: "Panier vide",
    total: "Total",
    checkoutQr: "QR paiement",
    openCart: "Ouvrir le panier",
    chatTitle: "Vendix • Chat",
    online: "En ligne",
    items: "articles",
    productCount: "produits",
    added: "Ajouté au panier",
    reset: "Reset",
    visualDetection: "Détection visuelle",
    captureIdentify: "Capturer & identifier",
    visualHint: "Pointez le produit, Vendix le reconnaîtra dans votre catalogue.",
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
      { title: "👋 Proactive greeting", prompt: "Greet me and introduce yourself as the showroom sales assistant." },
      { title: "🏛️ Showroom tour", prompt: "Give me a tour of the showroom and showcase the main zones and collections." },
      { title: "🧭 Smart guide", prompt: "Help me navigate the catalogue and recommend products based on my needs." },
      { title: "👁️ Product recognition", prompt: "Identify the flagship products and explain why they are popular." },
    ],
    system:
      "You are Vendix, an AI sales robot on an Android tablet in a showroom. Reply in English, warm, concise (2-3 sentences), guide the customer like an expert human seller.",
    animOn: "Animation",
    animOff: "Static",
    featured: "Available products",
    recommendations: "Recommended",
    addToCart: "Add",
    viewMore: "View more",
    cart: "Cart",
    emptyCart: "Empty cart",
    total: "Total",
    checkoutQr: "Payment QR",
    openCart: "Open cart",
    chatTitle: "Vendix • Chat",
    online: "Online",
    items: "items",
    productCount: "products",
    added: "Added to cart",
    reset: "Reset",
    visualDetection: "Visual detection",
    captureIdentify: "Capture & identify",
    visualHint: "Point at the product and Vendix will match it in your catalog.",
  },
};

const formatPrice = (price: number | string | null) => {
  if (price == null || price === "") return "";
  const numeric = typeof price === "number" ? price : Number(String(price).replace(",", "."));
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(numeric)
    : `${price}€`;
};

const uniqueProducts = (products: ProductCard[]) => {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
};

/* ---------- Vendix mascot robot (matches reference) ---------- */
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

  useEffect(() => {
    if (!animated || state !== "speaking") { setMouthOpen(0); return; }
    const id = setInterval(() => setMouthOpen(Math.random()), 120);
    return () => clearInterval(id);
  }, [state, animated]);

  useEffect(() => {
    if (!animated) return;
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3200 + Math.random() * 2000);
    return () => clearInterval(id);
  }, [animated]);

  useEffect(() => {
    if (!animated) return;
    const id = setInterval(() => {
      setEyeOffset({ x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 3 });
    }, 2400);
    return () => clearInterval(id);
  }, [animated]);

  const screenColor =
    state === "thinking" ? "#6366f1"
    : state === "listening" ? "#ec4899"
    : "#4f8df7";

  const ledColor =
    state === "speaking" ? "#22d3ee"
    : state === "thinking" ? "#a78bfa"
    : state === "listening" ? "#f472b6"
    : "#10b981";

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* HEAD */}
      <div className="relative">
        {/* tiny camera dot */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-600/80 z-10" />
        {/* outer shell */}
        <div
          className="relative w-[210px] h-[195px] rounded-[2rem] bg-[#1d1f24] p-[6px] shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
        >
          {/* inner blue screen */}
          <div
            className="relative w-full h-full rounded-[1.6rem] overflow-hidden"
            style={{ background: screenColor, transition: "background 400ms ease" }}
          >
            {/* eyes */}
            <div className="absolute top-[26%] left-0 right-0 flex justify-center gap-7">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="relative flex items-center justify-center rounded-full bg-white shadow-[0_3px_0_rgba(0,0,0,0.12)]"
                  style={{
                    width: 58,
                    height: blink ? 6 : 58,
                    transition: "height 110ms ease",
                  }}
                >
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 42,
                      height: 42,
                      background: "radial-gradient(circle at 35% 30%, #fbbf24 0%, #f59e0b 55%, #d97706 100%)",
                      transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
                      transition: "transform 600ms ease",
                      opacity: blink ? 0 : 1,
                    }}
                  >
                    {/* pupil */}
                    <div className="w-3 h-3 rounded-full bg-[#0b1220]" />
                    {/* highlight */}
                    <div className="absolute w-2 h-2 rounded-full bg-white/95 -translate-x-1.5 -translate-y-1.5" />
                  </div>
                </div>
              ))}
            </div>

            {/* smile */}
            <div className="absolute bottom-[20%] left-0 right-0 flex justify-center">
              <svg width="78" height={20 + mouthOpen * 14} viewBox={`0 0 78 ${20 + mouthOpen * 14}`}>
                <path
                  d={
                    state === "speaking"
                      ? `M 6 6 Q 39 ${20 + mouthOpen * 14} 72 6`
                      : `M 6 4 Q 39 ${18 + mouthOpen * 8} 72 4`
                  }
                  fill="none"
                  stroke="#0b1220"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* NECK */}
      <div className="w-10 h-3 bg-[#1d1f24] rounded-b-md" />

      {/* BODY (capsule) */}
      <div className="relative -mt-0.5 w-[200px] h-[150px] bg-gradient-to-b from-white to-[#e9edf3] rounded-[2.5rem] shadow-[0_22px_50px_rgba(0,0,0,0.4)] overflow-hidden">
        {/* black V collar */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[58%] h-[62%] bg-[#15171c]"
          style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
        >
          {/* central LED */}
          <div
            className={`absolute top-5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full ${animated ? "animate-pulse" : ""}`}
            style={{ background: ledColor, boxShadow: `0 0 14px ${ledColor}` }}
          />
        </div>
        {/* vendix label */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[8px] tracking-[0.35em] font-semibold text-slate-400">
          VENDIX
        </div>
      </div>
    </div>
  );
}


function ProductTile({
  product,
  t,
  onAdd,
  onOpen,
  compact = false,
  variant = "stage",
}: {
  product: ProductCard;
  t: typeof COPY.fr;
  onAdd: (p: ProductCard) => void;
  onOpen: (p: ProductCard) => void;
  compact?: boolean;
  variant?: "stage" | "chat";
}) {
  if (variant === "stage") {
    // Showroom tile: image left, info right, single "Ajouter au panier" button (matches reference design)
    return (
      <article
        onClick={() => onOpen(product)}
        className="group flex cursor-pointer gap-4 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] p-3 backdrop-blur-md transition-all hover:border-cyan-300/40 hover:bg-white/[0.06]"
      >
        {product.image_url && (
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white/5">
            <img
              src={product.image_url}
              alt={product.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}
        <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
          <div>
            <h3 className="line-clamp-2 text-sm font-medium leading-snug text-white/95">
              {product.title}
            </h3>
            {product.price != null && (
              <p className="mt-1.5 text-base font-semibold text-cyan-300">
                {formatPrice(product.price)}
              </p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(product); }}
            className="mt-2 inline-flex items-center gap-1.5 self-start rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" /> {t.addToCart} au panier
          </button>
        </div>
      </article>
    );
  }

  // Chat tile (compact, keeps both buttons)
  return (
    <article className={`group flex overflow-hidden rounded-[10px] bg-slate-900/62 border border-cyan-100/15 shadow-[0_18px_45px_rgba(0,0,0,0.24)] transition-all hover:border-cyan-200/55 ${compact ? "gap-3 p-2" : "gap-4 p-3"}`}>
      {product.image_url && (
        <div className={`${compact ? "h-20 w-20" : "h-24 w-24"} shrink-0 overflow-hidden rounded-[9px] bg-slate-800`}>
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="min-w-0 flex-1 py-1">
        <h3 className={`${compact ? "text-xs" : "text-sm"} line-clamp-2 font-semibold leading-snug text-slate-50`}>
          {product.title}
        </h3>
        {product.price != null && (
          <p className={`${compact ? "text-xs" : "text-base"} mt-1 font-black text-cyan-200`}>
            {formatPrice(product.price)}
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => onOpen(product)}
            className="rounded-[8px] border border-cyan-100/20 bg-slate-950/45 px-2 py-2 text-[11px] font-semibold text-cyan-50 transition hover:border-cyan-100/60"
          >
            {t.viewMore}
          </button>
          <button
            onClick={() => onAdd(product)}
            className="inline-flex items-center justify-center gap-1 rounded-[8px] bg-cyan-50 px-2 py-2 text-[11px] font-black text-slate-950 transition hover:bg-white"
          >
            <ShoppingCart className="h-3 w-3" /> {t.addToCart}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ---------- Main page ---------- */
export default function VendixChat() {
  const language: "fr" = "fr"; // Robot vendeur Vendix — toujours en français
  const t = COPY.fr;

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: t.welcome, isUser: false, timestamp: new Date() },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [animated, setAnimated] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<CheckoutProduct | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<ProductCard[]>([]);
  const [cart, setCart] = useState<Array<ProductCard & { qty: number }>>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bootstrappedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const sendMessageRef = useRef<(t?: string, i?: string) => Promise<void>>();

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

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("vendix-chat", {
          body: {
            system: t.system,
            language,
            messages: [{ role: "user", content: "Montre les produits du showroom avec photos et prix." }],
          },
        });
        const products: ProductCard[] = (data as any)?.products || [];
        if (products.length) {
          setFeaturedProducts(products);
          setMessages((current) => current.map((message, index) => index === 0 ? { ...message, products } : message));
        }
      } catch (error) {
        console.warn("Vendix product bootstrap failed", error);
      }
    })();
  }, [language, t.system]);

  // Auto-activate camera (vision) on tablets — touch device + landscape orientation
  useEffect(() => {
    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || (navigator as any).maxTouchPoints > 0);
    const isTablet = isTouch && window.innerWidth >= 768;
    if (!isTablet) return;
    // Need a user gesture for getUserMedia → arm on first interaction
    const onFirstTap = () => {
      window.removeEventListener("pointerdown", onFirstTap);
      openCamera();
    };
    window.addEventListener("pointerdown", onFirstTap, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstTap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ElevenLabs voice via robot-tts edge function
  const speak = async (text: string) => {
    if (!voiceOn || !text) return;
    try {
      const clean = text.slice(0, 540);
      const { data, error } = await supabase.functions.invoke("robot-tts", {
        body: { text: clean },
      });
      if (error) throw error;
      const audio = (data as any)?.audio;
      if (!audio) return;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      const a = new Audio(`data:audio/mp3;base64,${audio}`);
      audioRef.current = a;
      a.onplay = () => setSpeaking(true);
      a.onended = () => setSpeaking(false);
      a.onerror = () => setSpeaking(false);
      await a.play();
    } catch (e) {
      console.warn("TTS failed", e);
      // Visual speaking fallback
      setSpeaking(true);
      setTimeout(() => setSpeaking(false), Math.min(4000, 1200 + text.length * 35));
    }
  };

  const sendMessage = async (textOverride?: string, imageData?: string) => {
    const text = (textOverride ?? inputText).trim();
    if ((!text && !imageData) || isLoading) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text || (imageData ? "📷 Identifie ce produit" : ""),
      isUser: true,
      timestamp: new Date(),
      image: imageData,
    };
    const next = [...messages, userMessage];
    setMessages(next);
    setInputText("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("vendix-chat", {
        body: {
          system: t.system,
          language,
          image: imageData,
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
      const products: ProductCard[] = (data as any)?.products || [];
      if (products.length) setFeaturedProducts(products);
      setMessages((m) => [
        ...m,
        { id: (Date.now() + 1).toString(), text: reply, isUser: false, timestamp: new Date(), products },
      ]);
      speak(reply);
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
  // Keep latest sendMessage accessible from native speech recognition callback
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  });

  // === Voice recognition — Web Speech API (instant, native) with MediaRecorder fallback ===
  const startListening = async () => {
    // 1) Try native Web Speech API first (instant, no upload)
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const rec = new SR();
        rec.lang = "fr-FR";
        rec.interimResults = false;
        rec.continuous = false;
        rec.maxAlternatives = 1;
        recognitionRef.current = rec;
        rec.onresult = (e: any) => {
          const transcript = e.results?.[0]?.[0]?.transcript?.trim();
          if (transcript) sendMessageRef.current?.(transcript);
        };
        rec.onerror = (e: any) => {
          console.warn("SpeechRecognition error", e?.error);
          if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
            toast.error("Microphone refusé — autorisez-le dans le navigateur");
          } else if (e?.error === "no-speech") {
            toast.message("Aucun son détecté, réessayez.");
          }
          setIsListening(false);
        };
        rec.onend = () => setIsListening(false);
        rec.start();
        setIsListening(true);
        return;
      } catch (err) {
        console.warn("SpeechRecognition unavailable, fallback to recorder", err);
      }
    }

    // 2) Fallback: record → robot-stt edge function
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = rec;
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        const blob = new Blob(audioChunksRef.current, { type: mime });
        if (blob.size < 1500) {
          toast.message("Aucun son détecté, réessayez.");
          return;
        }
        const b64 = await blobToBase64(blob);
        try {
          const { data, error } = await supabase.functions.invoke("robot-stt", {
            body: { audio: b64, translateTo: "fr" },
          });
          if (error) throw error;
          const transcript = (data as any)?.text?.trim();
          if (transcript) {
            await sendMessage(transcript);
          } else {
            toast.message("Je n'ai pas saisi, pouvez-vous répéter ?");
          }
        } catch (err) {
          console.error(err);
          toast.error("Reconnaissance vocale indisponible");
        } finally {
          setIsLoading(false);
        }
      };
      rec.start();
      setIsListening(true);
    } catch (e: any) {
      console.error(e);
      if (e?.name === "NotAllowedError") {
        toast.error("Microphone refusé — autorisez-le dans le navigateur");
      } else {
        toast.error("Microphone indisponible");
      }
    }
  };

  const stopListening = () => {
    setIsListening(false);
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* noop */
    }
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      /* noop */
    }
  };


  const toggleListening = () => (isListening ? stopListening() : startListening());

  // === Visual product detection (webcam) ===
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      videoStreamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      }, 50);
    } catch (e) {
      toast.error("Caméra indisponible");
    }
  };

  const closeCamera = () => {
    videoStreamRef.current?.getTracks().forEach((t) => t.stop());
    videoStreamRef.current = null;
    setCameraOpen(false);
  };

  const snapAndSend = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(video.videoWidth, 1024);
    canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    closeCamera();
    await sendMessage("Identifie ce produit et trouve-le dans le catalogue.", dataUrl);
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

  const latestBotMessage = messages.filter((m) => !m.isUser).slice(-1)[0];
  const displayedProducts = uniqueProducts(latestBotMessage?.products?.length ? latestBotMessage.products : featuredProducts);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => {
    const value = typeof item.price === "number" ? item.price : Number(String(item.price || 0).replace(",", "."));
    return sum + (Number.isFinite(value) ? value * item.qty : 0);
  }, 0);
  const cartQrValue = cart.length
    ? `VENDIX_CART:${cart.map((item) => `${item.id}x${item.qty}`).join("|")}|TOTAL:${cartTotal.toFixed(2)}`
    : "VENDIX_CART:EMPTY";

  const addToCart = (product: ProductCard) => {
    setCart((items) => {
      const exists = items.find((item) => item.id === product.id);
      if (exists) return items.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...items, { ...product, qty: 1 }];
    });
    setCartOpen(true);
    toast.success(`${product.title} · ${t.added}`);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((items) => items
      .map((item) => item.id === productId ? { ...item, qty: Math.max(0, item.qty + delta) } : item)
      .filter((item) => item.qty > 0));
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#2a2547_0%,#15132a_45%,#0a0a18_100%)] p-3 text-white">
      <div className="relative z-10 flex h-full flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_25%_15%,rgba(167,139,250,0.18),transparent_45%),radial-gradient(circle_at_75%_85%,rgba(56,189,248,0.12),transparent_50%),linear-gradient(135deg,rgba(255,255,255,0.04),rgba(10,10,24,0.6))] shadow-[0_26px_80px_rgba(0,0,0,0.55)] lg:flex-row">
        {/* Robot stage */}
        <section className="relative flex-[1.65] overflow-y-auto p-5 lg:p-8">
          {/* Floor reflection */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-gradient-to-t from-cyan-500/10 to-transparent blur-2xl pointer-events-none" />

          {/* Hero robot */}
          <div className="relative flex h-[380px] w-full items-center justify-center overflow-visible">
            <div className="origin-center scale-[0.85] md:scale-[0.95] xl:scale-[1.05]">
              <RobotFace state={state} animated={animated} />
            </div>
          </div>

          {/* Live caption (last bot message) */}
          <div className="sr-only mx-auto mt-2 max-w-3xl text-center min-h-[3.25rem]">
            <p className="text-[10px] tracking-[0.4em] text-cyan-400/70 mb-2">
              ◤ {statusLabel} ◢
            </p>
            <p className="text-sm md:text-base text-cyan-50/90 font-light leading-relaxed">
              {messages.filter((m) => !m.isUser).slice(-1)[0]?.text}
            </p>
          </div>

          <div className="relative mx-auto mt-6 w-full max-w-5xl pb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-white/95">{t.featured}</h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">{Math.min(displayedProducts.length, 2)} / {displayedProducts.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {displayedProducts.slice(0, 2).map((p) => (
                <ProductTile key={`stage-${p.id}`} product={p} t={t} onAdd={addToCart} onOpen={setCheckoutProduct} variant="stage" />
              ))}
            </div>
          </div>

        </section>

        {/* Chat panel */}
        <aside className="w-full min-h-0 flex flex-col bg-slate-950/72 backdrop-blur-xl lg:w-[365px] xl:w-[390px]">
          {/* Sticky chat header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-slate-950/90 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/40">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-cyan-50 leading-tight">{t.chatTitle}</p>
                <p className="text-[10px] uppercase tracking-widest text-emerald-400/90">{t.online}</p>
              </div>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 rounded-[9px] border border-cyan-100/20 bg-slate-900/75 px-3 py-2 text-xs font-semibold text-cyan-50 transition hover:border-cyan-100/60"
              title={t.openCart}
            >
              <ShoppingCart className="h-4 w-4" /> {cartCount} {t.items}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
            {messages.map((m) => (
              <div key={m.id} className="space-y-2 animate-fade-in">
                <div className={`flex ${m.isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[86%] px-4 py-3 rounded-[12px] text-sm leading-relaxed ${
                      m.isUser
                        ? "bg-cyan-500 text-slate-950 rounded-br-sm shadow-lg shadow-cyan-500/20"
                        : "bg-slate-800/88 border border-cyan-100/15 text-cyan-50 rounded-bl-sm"
                    }`}
                  >
                    {m.image && (
                      <img
                        src={m.image}
                        alt="Capture"
                        className="mb-2 rounded-lg max-h-40 object-cover"
                      />
                    )}
                    {m.text}
                  </div>
                </div>
                {!m.isUser && m.products && m.products.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 pl-1">
                    {m.products.map((p) => (
                      <div
                        key={`chat-${m.id}-${p.id}`}
                        className="overflow-hidden"
                      >
                          <ProductTile product={p} t={t} onAdd={addToCart} onOpen={setCheckoutProduct} compact variant="chat" />
                      </div>
                    ))}
                  </div>
                )}
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
                className="text-[11px] px-3 py-1.5 rounded-full bg-slate-800/70 border border-cyan-100/15 text-cyan-50 hover:border-cyan-100/55 hover:bg-cyan-500/10 transition-all"
              >
                {q.title}
              </button>
            ))}
          </div>

          {/* Composer */}
          <div className="p-3 border-t border-cyan-500/10 bg-slate-950/90">
            <div className="flex items-end gap-2">
              <button
                onClick={toggleListening}
                title={isListening ? "Arrêter" : "Parler à Vendix"}
                className={`p-3 rounded-2xl border transition-all ${
                  isListening
                    ? "bg-pink-500/30 border-pink-400 text-pink-100 shadow-[0_0_25px_rgba(244,114,182,0.6)] animate-pulse"
                    : "bg-slate-800/70 border-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={openCamera}
                title="Détection visuelle"
                className="p-3 rounded-2xl border bg-slate-800/70 border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400/60 transition-all"
              >
                <Camera className="w-5 h-5" />
              </button>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t.placeholder}
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none px-4 py-3 rounded-2xl bg-slate-900/85 border border-cyan-100/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20"
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

      {/* Camera modal — détection visuelle */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 animate-fade-in">
          <button
            onClick={closeCamera}
            className="absolute top-6 right-6 p-3 rounded-full bg-slate-800/80 border border-slate-700 text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-cyan-300 text-sm tracking-[0.3em] mb-4">◤ {t.visualDetection} ◢</p>
          <video
            ref={videoRef}
            playsInline
            muted
            className="max-w-2xl w-full rounded-3xl border-2 border-cyan-400/40 shadow-[0_0_60px_rgba(34,211,238,0.4)] aspect-video object-cover bg-black"
          />
          <button
            onClick={snapAndSend}
            className="mt-6 px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/40 flex items-center gap-2"
          >
            <Camera className="w-5 h-5" />
            {t.captureIdentify}
          </button>
          <p className="mt-3 text-xs text-slate-400">{t.visualHint}</p>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-[55] flex justify-end bg-black/55 backdrop-blur-sm" onClick={() => setCartOpen(false)}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-cyan-200/20 bg-slate-950 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300/75">Vendix</p>
                <h2 className="text-xl font-black text-white">{t.cart}</h2>
              </div>
              <button onClick={() => setCartOpen(false)} className="rounded-xl border border-slate-700 p-2 text-slate-200 hover:border-cyan-300/60">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!cart.length ? (
              <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-cyan-200/20 text-slate-400">
                {t.emptyCart}
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-2xl border border-cyan-200/15 bg-slate-900/70 p-3">
                    {item.image_url && <img src={item.image_url} alt={item.title} className="h-16 w-16 rounded-xl object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm font-black text-cyan-200">{formatPrice(item.price)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="rounded-lg border border-slate-700 p-1 text-slate-200"><Minus className="h-3 w-3" /></button>
                        <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="rounded-lg border border-slate-700 p-1 text-slate-200"><Plus className="h-3 w-3" /></button>
                        <button onClick={() => updateQty(item.id, -item.qty)} className="ml-auto rounded-lg border border-slate-700 p-1 text-slate-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border border-cyan-200/20 bg-slate-900/80 p-4">
                  <div className="mb-4 flex items-center justify-between text-lg font-black">
                    <span>{t.total}</span>
                    <span className="text-cyan-200">{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl bg-white p-4">
                    <LocalQrCode value={cartQrValue} size={210} alt={t.checkoutQr} />
                  </div>
                  <p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-cyan-200">
                    <QrCode className="h-4 w-4" /> {t.checkoutQr}
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {checkoutProduct && (
        <CheckoutFlow
          product={checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
        />
      )}
    </div>
  );
}
