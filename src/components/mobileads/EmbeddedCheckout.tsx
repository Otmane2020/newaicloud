import { useState, useCallback } from "react";
import { Check, Mail, ChevronRight, Lock, Tag, User, MapPin, Globe, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout as StripeEmbeddedCheckout } from "@stripe/react-stripe-js";

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
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "PT", name: "Portugal" },
  { code: "IE", name: "Ireland" },
  { code: "NZ", name: "New Zealand" },
  { code: "JP", name: "Japan" },
];

export function EmbeddedCheckout({ selectedPlan, billingPeriod, onClose }: EmbeddedCheckoutProps) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const price = billingPeriod === "yearly" ? selectedPlan.yearly.price : selectedPlan.monthly.price;
  const priceId = billingPeriod === "yearly" ? selectedPlan.yearly.priceId : selectedPlan.monthly.priceId;
  const yearlyTotal = (selectedPlan.yearly.price * 12).toFixed(2);
  
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
    if (couponCode.toUpperCase() === "WELCOME10") {
      setAppliedCoupon("WELCOME10");
      toast.success("Coupon applied! 10% extra discount");
    } else {
      toast.error("Invalid coupon code");
    }
    setCouponLoading(false);
  };

  const validateStep1 = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return false;
    }
    
    // Check if email already exists
    const exists = await checkEmailExists(email);
    if (exists) {
      toast.error("This email is already registered. Please sign in instead.");
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    if (!country) {
      toast.error("Please select your country");
      return false;
    }
    if (!address.trim()) {
      toast.error("Please enter your address");
      return false;
    }
    if (!city.trim()) {
      toast.error("Please enter your city");
      return false;
    }
    if (!postalCode.trim()) {
      toast.error("Please enter your postal code");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return false;
    }
    if (!acceptTerms) {
      toast.error("Please accept the terms and conditions");
      return false;
    }
    return true;
  };

  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-mobile-checkout", {
      body: { 
        priceId,
        email,
        password,
        fullName,
        billingAddress: {
          country,
          line1: address,
          city,
          postal_code: postalCode
        },
        couponCode: appliedCoupon
      }
    });

    if (error) throw error;
    return data.clientSecret;
  }, [priceId, email, password, fullName, country, address, city, postalCode, appliedCoupon]);

  const handleProceedToPayment = async () => {
    if (!validateStep3()) return;
    
    setIsLoading(true);
    try {
      const secret = await fetchClientSecret();
      if (secret) {
        setClientSecret(secret);
        setStep(4);
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message || "Failed to initialize checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep1Continue = async () => {
    setIsLoading(true);
    const valid = await validateStep1();
    setIsLoading(false);
    if (valid) setStep(2);
  };

  // Show embedded checkout
  if (step === 4 && clientSecret) {
    return (
      <div className="flex flex-col h-full max-h-[80vh]">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Complete Payment</h3>
            <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
              Back
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {selectedPlan.name} Plan • ${finalPrice.toFixed(2)}/mo
          </p>
        </div>
        <div className="flex-1 overflow-hidden" id="checkout">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <StripeEmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 py-4 border-b bg-gray-50">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step >= s ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && <div className={`w-8 h-1 mx-1 rounded ${step > s ? "bg-violet-600" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Step 1: Account & Order */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="font-bold text-lg mb-1">Create Your Account</h3>
              <p className="text-sm text-gray-500">Enter your details to get started</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    className={`pl-10 h-11 ${emailError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  {checkingEmail && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                  )}
                </div>
                {emailError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {emailError}
                  </p>
                )}
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
                {billingPeriod === "yearly" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Yearly Discount</span>
                    <span className="text-green-600">-20%</span>
                  </div>
                )}
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
              onClick={handleStep1Continue}
              disabled={isLoading || checkingEmail}
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold"
            >
              {isLoading || checkingEmail ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue to Billing
                  <ChevronRight className="w-5 h-5 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Billing Details */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="font-bold text-lg mb-1">Billing Details</h3>
              <p className="text-sm text-gray-500">Enter your billing address</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-11">
                    <Globe className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="address"
                    type="text"
                    placeholder="123 Main Street"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="New York"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    type="text"
                    placeholder="10001"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Plan</span>
                <span className="font-semibold">{selectedPlan.name} - {selectedPlan.products}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold">Total</span>
                <span className="font-bold text-violet-600 text-xl">${finalPrice.toFixed(2)}/mo</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-12"
              >
                Back
              </Button>
              <Button 
                onClick={() => validateStep2() && setStep(3)}
                className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold"
              >
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Password & Payment */}
        {step === 3 && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="font-bold text-lg mb-1">Create Password</h3>
              <p className="text-sm text-gray-500">Set your account password to continue</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">You'll use this to access your NewAI dashboard</p>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox 
                  id="terms" 
                  checked={acceptTerms} 
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)} 
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  I agree to the <a href="/terms" className="text-violet-600 hover:underline">Terms of Service</a> and{" "}
                  <a href="/privacy" className="text-violet-600 hover:underline">Privacy Policy</a>
                </label>
              </div>
            </div>

            {/* Final Summary */}
            <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl p-4 border border-violet-100">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Account</span>
                  <span className="font-medium">{email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Billing</span>
                  <span className="font-medium">{billingPeriod === "yearly" ? "Yearly" : "Monthly"}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon</span>
                    <span className="font-medium">{appliedCoupon}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-violet-200">
                  <span>Total</span>
                  <span className="text-violet-600">${finalPrice.toFixed(2)}/mo</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1 h-12"
              >
                Back
              </Button>
              <Button 
                onClick={handleProceedToPayment}
                disabled={isLoading}
                className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Proceed to Payment
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Secured by Stripe • 256-bit SSL encryption
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
