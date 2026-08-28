import { useState, useCallback, useEffect } from "react";
import { Check, Mail, ChevronRight, Lock, Tag, User, MapPin, Globe, Eye, EyeOff, Loader2, AlertCircle, CreditCard, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements, PaymentRequestButtonElement } from "@stripe/react-stripe-js";

// Hook to load Stripe publishable key from edge function
function useStripePromise() {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStripeKey() {
      try {
        const { data, error: fetchError } = await supabase.functions.invoke('get-stripe-config');
        
        if (fetchError || !data?.publishableKey) {
          console.error("[EmbeddedCheckout] Failed to load Stripe config:", fetchError);
          setError("Payment system configuration error");
          setLoading(false);
          return;
        }

        setStripePromise(loadStripe(data.publishableKey));
        setLoading(false);
      } catch (err) {
        console.error("[EmbeddedCheckout] Error loading Stripe:", err);
        setError("Payment system unavailable");
        setLoading(false);
      }
    }

    loadStripeKey();
  }, []);

  return { stripePromise, loading, error };
}

interface Plan {
  name: string;
  products: string;
  monthly: { priceId: string; price: number };
  yearly: { priceId: string; price: number; yearlyTotal: number };
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
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [canMakePayment, setCanMakePayment] = useState(false);

  const price = billingPeriod === "yearly" ? selectedPlan.yearly.price : selectedPlan.monthly.price;
  const priceId = billingPeriod === "yearly" ? selectedPlan.yearly.priceId : selectedPlan.monthly.priceId;
  const originalPrice = billingPeriod === "yearly" ? selectedPlan.monthly.price : price;
  const yearlyTotal = billingPeriod === "yearly" ? selectedPlan.yearly.yearlyTotal : (price * 12);
  
  const discountAmount = appliedCoupon ? (couponDiscount > 0 ? price * (couponDiscount / 100) : price * 0.1) : 0;
  const finalPrice = price - discountAmount;
  const finalYearlyTotal = billingPeriod === "yearly" ? (yearlyTotal - (yearlyTotal * (couponDiscount / 100))) : (finalPrice * 12);

  // Initialize PaymentRequest for Google Pay / Apple Pay
  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: `${selectedPlan.name} - ${billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'}`,
        amount: Math.round(finalPrice * 100), // Convert to cents
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then(result => {
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
      }
    });

    pr.on('paymentmethod', async (ev) => {
      try {
        // Validate email first
        const payerEmail = ev.payerEmail || email;
        if (!payerEmail) {
          ev.complete('fail');
          toast.error("Email is required");
          return;
        }

        // Check if email exists
        const { data: checkData } = await supabase.functions.invoke("create-mobile-checkout", {
          body: { checkEmailOnly: true, email: payerEmail }
        });
        
        if (checkData?.exists) {
          ev.complete('fail');
          toast.error("This email is already registered. Please sign in instead.");
          return;
        }

        // Create subscription
        const { data, error } = await supabase.functions.invoke("create-mobile-checkout", {
          body: { 
            priceId,
            email: payerEmail,
            password: password || (crypto.randomUUID().slice(0, 16) + "Aa1!"),
            fullName: ev.payerName || fullName,
            billingPeriod,
            couponCode: appliedCoupon,
            mode: "payment_intent"
          }
        });

        if (error || data.error) {
          ev.complete('fail');
          toast.error(data?.error || "Payment failed");
          return;
        }

        // 100% coupons are blocked - this should never happen
        if (data.noPaymentRequired) {
          ev.complete('fail');
          toast.error("Payment is required");
          return;
        }

        // Confirm payment based on type returned from backend
        if (data.type === 'setup_intent') {
          // Use confirmSetup for SetupIntent
          const { error: setupError, setupIntent } = await stripe.confirmSetup({
            clientSecret: data.clientSecret,
            payment_method: ev.paymentMethod.id,
            redirect: 'if_required'
          } as any);

          if (setupError) {
            ev.complete('fail');
            toast.error(setupError.message || "Payment setup failed");
            return;
          }

          if (setupIntent?.status !== 'succeeded') {
            ev.complete('fail');
            toast.error("Payment setup was not completed");
            return;
          }

          ev.complete('success');
          toast.success("Payment method saved! Creating your account...");

          // Create account after successful setup
          const { data: accountData } = await supabase.functions.invoke("create-mobile-checkout", {
            body: { 
              confirmPayment: true,
              paymentIntentId: data.setupIntentId,
              subscriptionId: data.subscriptionId,
              customerId: data.customerId,
              email: payerEmail,
              password: password || (crypto.randomUUID().slice(0, 16) + "Aa1!"),
              fullName: ev.payerName || fullName
            }
          });

          if (accountData?.success) {
            toast.success("Account created!");
            onClose();
            window.location.href = "/mobile-success";
          }
        } else {
          // Fallback: confirmCardPayment for PaymentIntent
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            data.clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false }
          );

          if (confirmError) {
            ev.complete('fail');
            toast.error(confirmError.message || "Payment failed");
            return;
          }

          if (paymentIntent?.status === 'requires_action') {
            const { error: actionError } = await stripe.confirmCardPayment(data.clientSecret);
            if (actionError) {
              ev.complete('fail');
              toast.error(actionError.message || "Payment failed");
              return;
            }
          }

          ev.complete('success');
          toast.success("Payment successful! Creating your account...");

          // Create account after successful payment
          const { data: accountData } = await supabase.functions.invoke("create-mobile-checkout", {
            body: { 
              confirmPayment: true,
              paymentIntentId: paymentIntent?.id || data.paymentIntentId,
              subscriptionId: data.subscriptionId,
              customerId: data.customerId,
              email: payerEmail,
              password: password || (crypto.randomUUID().slice(0, 16) + "Aa1!"),
              fullName: ev.payerName || fullName
            }
          });

          if (accountData?.success) {
            toast.success("Account created!");
            onClose();
            window.location.href = "/mobile-success";
          }
        }
      } catch (err: any) {
        ev.complete('fail');
        toast.error(err.message || "Payment failed");
      }
    });
  }, [stripe, finalPrice, selectedPlan, billingPeriod, priceId, email, password, fullName, appliedCoupon, onClose]);

  // Capture email as potential customer lead
  const captureEmailLead = async (emailToCapture: string, name?: string) => {
    try {
      // Use INSERT instead of UPSERT - ignore duplicates silently
      // (anon users don't have UPDATE permission, only INSERT)
      const { error } = await supabase.from('potential_customers').insert({
        email: emailToCapture,
        full_name: name || null,
        country: country,
        plan_interest: selectedPlan.name,
        billing_period: billingPeriod,
        source: 'mobileads',
        status: 'lead'
      });
      
      // Ignore duplicate key errors (23505 = unique_violation)
      if (error && !error.code?.includes('23505')) {
        console.error("Lead capture error:", error);
      }
    } catch (err) {
      console.error("Lead capture error:", err);
    }
  };

  const checkEmailExists = async (emailToCheck: string): Promise<boolean> => {
    try {
      setCheckingEmail(true);
      setEmailError(null);
      
      // Capture email as lead regardless of existence
      await captureEmailLead(emailToCheck);
      
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
    try {
      const { data, error } = await supabase.functions.invoke("validate-coupon", {
        body: { couponCode: couponCode.trim() }
      });
      
      if (error || data?.error) {
        toast.error("Invalid coupon code");
      } else if (data?.valid) {
        // Block 100% coupons - max 90%
        const discount = data.percentOff || 10;
        if (discount >= 100) {
          toast.error("This coupon is not valid. Maximum discount is 90%.");
          setCouponLoading(false);
          return;
        }
        setAppliedCoupon(data.couponId || couponCode.toUpperCase());
        setCouponDiscount(discount);
        toast.success(`Coupon applied! ${discount}% off`);
      } else {
        toast.error("Invalid coupon code");
      }
    } catch (err) {
      // No fallback - all coupons must be validated by Stripe
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
    
    // Validate card is complete before proceeding
    if (!isCardComplete) {
      toast.error("Veuillez saisir vos coordonnées bancaires / Please enter your card details");
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
          billingPeriod,
          billingAddress: {
            country,
            line1: address,
            city,
            postal_code: postalCode,
          },
          couponCode: appliedCoupon,
          mode: "payment_intent"
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // 100% coupons are blocked - this should never happen but handle gracefully
      if (data.noPaymentRequired) {
        toast.error("Payment is required. Please enter your card details.");
        return;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      // STEP 2: Confirm payment based on type returned from backend
      if (data.type === 'setup_intent') {
        // Use confirmSetup for SetupIntent (default_incomplete creates this)
        const { error: setupError, setupIntent } = await stripe.confirmSetup({
          clientSecret: data.clientSecret,
          payment_method: {
            card: cardElement,
            billing_details: {
              name: fullName,
              email: email,
              address: { country, line1: address, city, postal_code: postalCode }
            }
          },
          redirect: 'if_required'
        } as any);

        if (setupError) {
          toast.error(setupError.message || "Payment setup failed");
          return;
        }

        if (setupIntent?.status === "succeeded") {
          toast.success("Payment method saved! Creating your account...");
          
          // After SetupIntent succeeds, subscription is automatically activated
          // Now create the user account
          const { data: accountData, error: accountError } = await supabase.functions.invoke("create-mobile-checkout", {
            body: { 
              confirmPayment: true,
              paymentIntentId: data.setupIntentId, // Use setupIntentId for verification
              subscriptionId: data.subscriptionId,
              customerId: data.customerId,
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

          // Auto-login
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (signInError) {
            console.error("Auto-login failed:", signInError);
            toast.info("Account created! Please sign in manually.");
          } else {
            toast.success("Account created!");
          }
          
          onClose();
          window.location.href = "/mobile-success";
        } else {
          toast.error("Payment setup was not completed. Please try again.");
        }
      } else {
        // Fallback: use confirmCardPayment for PaymentIntent
        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
          data.clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: fullName,
                email: email,
                address: { country, line1: address, city, postal_code: postalCode }
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
          
          const { data: accountData, error: accountError } = await supabase.functions.invoke("create-mobile-checkout", {
            body: { 
              confirmPayment: true,
              paymentIntentId: paymentIntent.id,
              subscriptionId: data.subscriptionId,
              customerId: data.customerId,
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

          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (signInError) {
            console.error("Auto-login failed:", signInError);
            toast.info("Account created! Please sign in manually.");
          } else {
            toast.success("Account created!");
          }
          
          onClose();
          window.location.href = "/mobile-success";
        } else {
          toast.error("Payment was not completed. Please try again.");
        }
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
          <span className="font-bold text-gray-900">CatalogueOptimize AI</span>
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
              Use this password to access your CatalogueOptimize AI dashboard.
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
                <span>{appliedCoupon} ({couponDiscount}% off)</span>
                <button type="button" onClick={() => { setAppliedCoupon(null); setCouponDiscount(0); }} className="ml-auto text-gray-400 text-xs hover:text-gray-600">×</button>
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-gray-200 pt-3 space-y-2">
              {billingPeriod === "yearly" ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Annual subscription</span>
                    <span>${yearlyTotal.toFixed(2)}/year</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Monthly equivalent</span>
                    <span>${price.toFixed(2)}/mo</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Coupon ({couponDiscount}% off)</span>
                      <span className="text-green-600">-${(yearlyTotal * (couponDiscount / 100)).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                    <span>Total due today</span>
                    <span className="text-violet-600">USD ${finalYearlyTotal.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monthly subscription</span>
                    <span>${price.toFixed(2)}/mo</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Coupon ({couponDiscount}% off)</span>
                      <span className="text-green-600">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                    <span>Total due today</span>
                    <span className="text-violet-600">USD ${finalPrice.toFixed(2)}</span>
                  </div>
                </>
              )}
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

          {/* Google Pay / Apple Pay */}
          {canMakePayment && paymentRequest && (
            <div className="mb-4">
              <PaymentRequestButtonElement
                options={{ paymentRequest }}
                className="w-full"
              />
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400">OR</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-4 p-3 bg-violet-50 rounded-lg border-2 border-violet-600">
            <CreditCard className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-medium text-violet-600">Card Payment</span>
          </div>

          <div className="space-y-3">
            <div className="p-3 border border-gray-200 rounded-lg bg-white">
              <CardElement 
                options={cardElementOptions} 
                onChange={(event) => setIsCardComplete(event.complete)}
              />
            </div>
            
            <p className="text-xs text-gray-500">
              By subscribing, you authorize CatalogueOptimize AI to charge you according to the terms until you cancel.
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
                onBlur={(e) => { if (e.target.value && email) captureEmailLead(email, e.target.value); }}
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

            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11 bg-gray-50 border-gray-200"
              />
              <Input
                placeholder="Postal Code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="h-11 bg-gray-50 border-gray-200"
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
  const { stripePromise, loading, error } = useStripePromise();

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-muted-foreground">Loading payment system...</p>
      </div>
    );
  }

  if (error || !stripePromise) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-medium">Payment system unavailable</p>
        <p className="text-muted-foreground text-sm mt-2">{error || "Please try again later or contact support."}</p>
      </div>
    );
  }
  
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm selectedPlan={selectedPlan} billingPeriod={billingPeriod} onClose={onClose} />
    </Elements>
  );
}
