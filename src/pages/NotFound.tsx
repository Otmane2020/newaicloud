import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "@/lib/language";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold text-foreground">{t.notFound.title}</h2>
        <p className="text-muted-foreground max-w-md">
          {t.notFound.description}
        </p>
        <a 
          href="/" 
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t.notFound.backHome}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
