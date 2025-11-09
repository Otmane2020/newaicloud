import { useEffect, useState } from "react";
import { Eye, Sparkles, Layout, Zap, Target } from "lucide-react";

interface ProgressMessage {
  icon: React.ReactNode;
  text: string;
  subtext: string;
  color: string;
}

const progressMessages: ProgressMessage[] = [
  {
    icon: <Eye className="h-6 w-6" />,
    text: "High Vision AI Image Analysis",
    subtext: "Analysing product visuals with advanced AI",
    color: "text-blue-600",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    text: "SEO Optimization Engine",
    subtext: "Crafting conversion-optimized content",
    color: "text-purple-600",
  },
  {
    icon: <Layout className="h-6 w-6" />,
    text: "High UX Landing Page Generation",
    subtext: "Creating premium responsive layout",
    color: "text-green-600",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    text: "Content Quality Enhancement",
    subtext: "Enriching product narrative with AI",
    color: "text-orange-600",
  },
  {
    icon: <Target className="h-6 w-6" />,
    text: "Conversion Rate Optimization",
    subtext: "Fine-tuning CTA and engagement elements",
    color: "text-red-600",
  },
];

interface EnhancedProgressDisplayProps {
  currentIndex: number;
  total: number;
  title: string;
}

export function EnhancedProgressDisplay({
  currentIndex,
  total,
  title,
}: EnhancedProgressDisplayProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % progressMessages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const currentMessage = progressMessages[messageIndex];

  return (
    <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-center">
        <div
          className={`${currentMessage.color} transition-all duration-500 transform`}
          key={messageIndex}
        >
          {currentMessage.icon}
        </div>
      </div>

      <div
        className="space-y-1 transition-all duration-500"
        key={`text-${messageIndex}`}
      >
        <p className={`text-base font-bold ${currentMessage.color}`}>
          {currentMessage.text}
        </p>
        <p className="text-xs text-muted-foreground">{currentMessage.subtext}</p>
      </div>

      <p className="text-sm font-medium text-foreground truncate px-4 pt-2">
        {title.substring(0, 50)}...
      </p>
    </div>
  );
}
