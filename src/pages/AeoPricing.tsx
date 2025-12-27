import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// AeoPricing redirects to AeoOnboarding for unified Stripe checkout
export default function AeoPricing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect to onboarding (single Stripe checkout page)
    if (user) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/auth?authMode=signup&redirect=/onboarding", { replace: true });
    }
  }, [user, navigate]);

  return null;
}
