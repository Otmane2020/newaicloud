import { useState } from "react";
import { Check, Mail, CreditCard, ChevronRight, Lock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Plan {
  name: string;
  products: string;
  monthly: { priceId: string; price: number };
  yearly: { priceId: string; price: number };
}

interface EmbeddedCheckoutProps {
  selectedPlan: Plan;
  billingPeriod: "monthly" | "yearly";
  onClose: () => void;
}

export function EmbeddedCheckout({ selectedPlan, billingPeriod, onClose }: EmbeddedCheckoutProps) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  const price = billingPeriod === "yearly" ? selectedPlan.yearly.price : selectedPlan.monthly.price;
  const priceId = billingPeriod === "yearly" ? selectedPlan.yearly.priceId : selectedPlan.monthly.priceId;
  const yearlyTotal = (selectedPlan.yearly.price * 12).toFixed(2);
  
  // Calculate discount (show original price as ~3.3x higher for 70% off display)
  const originalPrice = (price * 3.33).toFixed(2);
  const discountAmount = appliedCoupon ? price * 0.1 : 0;
  const finalPrice = price - discountAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    // Simulate coupon validation
    await new Promise(r => setTimeout(r, 500));
    if (couponCode.toUpperCase() === "WELCOME10") {
      setAppliedCoupon("WELCOME10");
      toast.success("Coupon applied! 10% extra discount");
    } else {
      toast.error("Invalid coupon code");
    }
    setCouponLoading(false);
  };

  const handleCheckout = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-mobile-checkout", {
        body: { 
          priceId,
          email,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/mobileads`,
          couponCode: appliedCoupon
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        onClose();
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message || "Checkout failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 py-4 border-b bg-gray-50">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step >= s ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 2 && <div className={`w-12 h-1 mx-1 rounded ${step > s ? "bg-violet-600" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === 1 && (
          <div className="p-6 space-y-6">
            {/* Create Account */}
            <div>
              <h3 className="font-bold text-lg mb-1">Create Your Account</h3>
              <p className="text-sm text-gray-500 mb-4">Enter your email to get started</p>
              
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-sm">Order Summary</h4>
              
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{selectedPlan.name[0]}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{selectedPlan.name} Plan</p>
                  <p className="text-xs text-gray-500">{selectedPlan.products} • {billingPeriod === "yearly" ? "Yearly" : "Monthly"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">${price}/mo</p>
                  <p className="text-xs text-gray-400 line-through">${originalPrice}</p>
                </div>
              </div>

              {/* Coupon */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="pl-9 h-10 text-sm"
                    disabled={!!appliedCoupon}
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !!appliedCoupon}
                  className="h-10"
                >
                  {appliedCoupon ? <Check className="w-4 h-4" /> : "Apply"}
                </Button>
              </div>
              {appliedCoupon && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {appliedCoupon} applied - 10% extra off!
                </p>
              )}

              {/* Totals */}
              <div className="pt-3 border-t space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>${price.toFixed(2)}/mo</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Black Friday Discount</span>
                  <span className="text-green-600">-70%</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Coupon ({appliedCoupon})</span>
                    <span className="text-green-600">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <div className="text-right">
                    <span className="text-violet-600">${finalPrice.toFixed(2)}/mo</span>
                    {billingPeriod === "yearly" && (
                      <p className="text-xs text-gray-500 font-normal">(${yearlyTotal}/year)</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setStep(2)}
              disabled={!email || !email.includes("@")}
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold"
            >
              Continue to Payment
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-1">Complete Payment</h3>
              <p className="text-sm text-gray-500">You'll be redirected to Stripe secure checkout</p>
            </div>

            {/* Summary Card */}
            <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Plan</span>
                <span className="font-semibold">{selectedPlan.name}</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Email</span>
                <span className="font-semibold text-sm">{email}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-violet-200">
                <span className="font-bold">Total</span>
                <span className="font-bold text-violet-600 text-xl">${finalPrice.toFixed(2)}/mo</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-1">Secure Stripe Checkout</p>
                <p>You'll enter your payment details on Stripe's secure payment page. We never store your card information.</p>
              </div>
            </div>

            {/* Features reminder */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">WHAT'S INCLUDED:</p>
              <div className="grid grid-cols-2 gap-2">
                {["AI SEO Optimization", "Smart Backgrounds", "Google Merchant", "Shopify Integration", "Facebook & Instagram", "24/7 Support"].map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Pay ${finalPrice.toFixed(2)}/mo Securely
                  </>
                )}
              </Button>
              
              <button 
                onClick={() => setStep(1)}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to order summary
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trust badges */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3" /> Secure
          </span>
          <span>•</span>
          <span>14-day refund</span>
          <span>•</span>
          <span>Cancel anytime</span>
        </div>
      </div>
    </div>
  );
}
