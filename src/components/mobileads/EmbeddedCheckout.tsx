import { useState, useCallback } from "react";
import { Check, Mail, ChevronRight, Lock, Tag, User, MapPin, Globe, Eye, EyeOff, Loader2, AlertCircle, CreditCard, Building2, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

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

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
];

// Card form styles with billing address fields
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      '::placeholder': { color: '#9ca3af' },
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    invalid: { color: '#ef4444' },
  },
  hidePostalCode: false,
};

function CheckoutForm({ selectedPlan, billingPeriod, onClose }: EmbeddedCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("US");
  const [address, setAddress] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("card");

  const price = billingPeriod === "yearly" ? selectedPlan.yearly.price : selectedPlan.monthly.price;
  const priceId = billingPeriod === "yearly" ? selectedPlan.yearly.priceId : selectedPlan.monthly.priceId;
  const originalPrice = billingPeriod === "yearly" ? selectedPlan.monthly.price : price;
  const yearlyTotal = (price * 12).toFixed(2);
  
  const discountAmount = appliedCoupon ? price * 0.1 : 0;
  const finalPrice = price - discountAmount;

  const checkEmailExists = async (emailToCheck: string): Promise<boolean> => {
    try {
      setCheckingEmail(true);
      setEmailError(null);
      
      const { data, error } = await supabase.functions.invoke("create-mobile-checkout", {
        body: { checkEmailOnly: true, email: emailToCheck }
      });
      
      if (error) throw error;
      
      if (data?.exists) {
        setEmailError("This email is already registered. Please sign in instead.");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Email check error:", err);
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    await new Promise(r => setTimeout(r, 500));
    if (couponCode.toUpperCase() === "BF70" || couponCode.toUpperCase() === "WELCOME10") {
      setAppliedCoupon(couponCode.toUpperCase());
      toast.success("Coupon applied!");
    } else {
      toast.error("Invalid coupon code");
    }
    setCouponLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!acceptTerms) {
      toast.error("Please accept the terms");
      return;
    }
    if (!stripe || !elements) {
      toast.error("Payment system not ready");
      return;
    }

    const exists = await checkEmailExists(email);
    if (exists) return;

    setIsLoading(true);
    try {
      // STEP 1: Create payment intent (NO account created yet)
      const { data, error } = await supabase.functions.invoke("create-mobile-checkout", {
        body: { 
          priceId,
          email,
          password,
          fullName,
          billingAddress: {
            country,
            line1: address,
          },
          couponCode: appliedCoupon,
          mode: "payment_intent"
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      // STEP 2: Confirm card payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: fullName,
              email: email,
              address: { country, line1: address }
            }
          }
        }
      );

      if (stripeError) {
        toast.error(stripeError.message || "Payment failed");
        return;
      }
      
      if (paymentIntent?.status === "succeeded") {
        toast.success("Payment successful! Creating your account...");
        
        // STEP 3: After payment succeeds, create the account
        const { data: accountData, error: accountError } = await supabase.functions.invoke("create-mobile-checkout", {
          body: { 
            confirmPayment: true,
            paymentIntentId: paymentIntent.id,
            subscriptionId: data.subscriptionId,
            email,
            password,
            fullName
          }
        });

        if (accountError || accountData?.error) {
          console.error("Account creation error:", accountError || accountData?.error);
          toast.error("Payment succeeded but account creation failed. Please contact support.");
          return;
        }

        // STEP 4: Auto-login with the created account
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });
        
        if (signInError) {
          console.error("Auto-login failed:", signInError);
          toast.info("Account created! Please sign in manually.");
        } else {
          toast.success("Welcome to NewAI!");
        }
        
        onClose();
        window.location.href = "/dashboard";
      } else {
        toast.error("Payment was not completed. Please try again.");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "Payment failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">N</span>
          </div>
          <span className="font-bold text-gray-900">NewAI</span>
          <span className="text-gray-400 text-sm">Checkout</span>
        </div>
        <button type="button" onClick={onClose} className="text-violet-600 text-sm font-medium hover:underline">
          Login
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* 1. Create Account */}
        <section>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold">1</span>
            Create Account
          </h3>
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                onBlur={(e) => { if (e.target.value && e.target.value.includes("@")) checkEmailExists(e.target.value); }}
                className={`pl-10 h-11 bg-gray-50 border-gray-200 ${emailError ? "border-red-500" : ""}`}
              />
              {checkingEmail && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
            </div>
            {emailError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {emailError}
              </p>
            )}
            
            {/* Password Field */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11 bg-gray-50 border-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            <p className="text-xs text-gray-500">
              Use this password to access your NewAI dashboard.
            </p>
          </div>
        </section>

        {/* 2. Order Summary */}
        <section>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold">2</span>
            Order Summary
          </h3>
          
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">{selectedPlan.name[0]}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{selectedPlan.name}</p>
                <p className="text-xs text-gray-500">{billingPeriod === "yearly" ? "Billed Yearly" : "Billed Monthly"}</p>
              </div>
              <div className="text-right">
                {billingPeriod === "yearly" && (
                  <p className="text-sm text-gray-400 line-through">${originalPrice.toFixed(2)}</p>
                )}
                <p className="font-bold text-gray-900">${price.toFixed(2)}</p>
              </div>
            </div>

            {/* Coupon */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Coupon Code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="pl-9 h-10 bg-white border-gray-200"
                  disabled={!!appliedCoupon}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleApplyCoupon}
                disabled={couponLoading || !!appliedCoupon}
                className="h-10 px-4"
              >
                {appliedCoupon ? <Check className="w-4 h-4 text-green-500" /> : "Apply"}
              </Button>
            </div>
            {appliedCoupon && (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <Check className="w-4 h-4" />
                <span>{appliedCoupon}</span>
                <button type="button" onClick={() => setAppliedCoupon(null)} className="ml-auto text-gray-400 text-xs">×</button>
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>${(originalPrice).toFixed(2)}</span>
              </div>
              {billingPeriod === "yearly" && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-green-600">-${(originalPrice - price).toFixed(2)}</span>
                </div>
              )}
              {appliedCoupon && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Coupon</span>
                  <span className="text-green-600">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-violet-600">USD ${finalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center mt-3">
            By purchasing, you agree to our <a href="#" className="underline">Terms and Conditions</a> and <a href="#" className="underline">Privacy Policy</a>.
          </p>
        </section>

        {/* 3. Select Payment Method */}
        <section>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold">3</span>
            Select Payment Method
          </h3>

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                paymentMethod === "card" ? "border-violet-600 bg-violet-50" : "border-gray-200"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-sm font-medium">Card</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("bank")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                paymentMethod === "bank" ? "border-violet-600 bg-violet-50" : "border-gray-200"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-medium">US bank account</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 border border-gray-200 rounded-lg bg-white">
              <CardElement options={cardElementOptions} />
            </div>
            
            <p className="text-xs text-gray-500">
              By subscribing, you authorize NewAI to charge you according to the terms until you cancel.
            </p>
          </div>

          {/* Guarantee */}
          <div className="flex items-center justify-center gap-2 mt-4 py-3 bg-gray-50 rounded-lg">
            <Shield className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">You are 100% backed by our <strong>14-day money-back guarantee</strong>.</span>
          </div>
        </section>

        {/* 4. Add Billing Details */}
        <section>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold">4</span>
            Add Billing Details
          </h3>

          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 h-11 bg-gray-50 border-gray-200"
              />
            </div>

            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-11 bg-gray-50 border-gray-200">
                <Globe className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Country or region" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="pl-10 h-11 bg-gray-50 border-gray-200"
              />
            </div>

            <p className="text-xs text-gray-500">
              Billing details are used for invoicing and subscription management.
            </p>
          </div>
        </section>

        {/* Terms */}
        <div className="flex items-start gap-2 py-3">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
            className="mt-0.5"
          />
          <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed">
            By purchasing, you agree to our <a href="#" className="underline">Terms and Conditions</a> and <a href="#" className="underline">Privacy Policy</a>.
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-0 bg-white border-t px-5 py-4 space-y-3">
        <Button
          type="submit"
          disabled={isLoading || !stripe}
          className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-base"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Submit"
          )}
        </Button>
        
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <Lock className="w-3 h-3" />
          <span>Secure Checkout</span>
          <span className="mx-1">|</span>
          <span>Powered by</span>
          <span className="font-semibold">stripe</span>
        </div>
      </div>
    </form>
  );
}

export function EmbeddedCheckout({ selectedPlan, billingPeriod, onClose }: EmbeddedCheckoutProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm selectedPlan={selectedPlan} billingPeriod={billingPeriod} onClose={onClose} />
    </Elements>
  );
}
