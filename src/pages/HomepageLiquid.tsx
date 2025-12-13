import { HomepageGenerator } from "@/components/homepage/HomepageGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const ALLOWED_EMAIL = 'oben.rockman@gmail.com';

export default function HomepageLiquid() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Only allow oben.rockman@gmail.com
  if (user?.email !== ALLOWED_EMAIL) {
    return <Navigate to="/products" replace />;
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <HomepageGenerator />
    </div>
  );
}
