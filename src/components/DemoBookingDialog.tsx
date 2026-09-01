import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck2, Loader2, Send } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface DemoBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormData = {
  businessEmail: string;
  firstName: string;
  lastName: string;
  role: string;
};

const emptyForm: FormData = {
  businessEmail: "",
  firstName: "",
  lastName: "",
  role: "",
};

export function DemoBookingDialog({ open, onOpenChange }: DemoBookingDialogProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<FormData>(emptyForm);
  const { toast } = useToast();

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: "" }));
  };

  const validateForm = () => {
    const newErrors: FormData = { ...emptyForm };
    let isValid = true;
    const email = formData.businessEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      newErrors.businessEmail = t.dialogs.demoBooking.errors.invalidEmail;
      isValid = false;
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = t.dialogs.demoBooking.errors.firstNameRequired;
      isValid = false;
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = t.dialogs.demoBooking.errors.lastNameRequired;
      isValid = false;
    }
    if (!formData.role) {
      newErrors.role = t.dialogs.demoBooking.errors.roleRequired;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm() || isLoading) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-demo-booking', {
        body: {
          businessEmail: formData.businessEmail.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          role: formData.role,
        },
      });

      if (error) throw error;
      if (!data?.success || !data?.emailId) {
        throw new Error(data?.error || 'The demo request was not accepted by the email provider.');
      }

      toast({
        title: t.dialogs.demoBooking.success,
        description: t.dialogs.demoBooking.successDesc + formData.businessEmail.trim(),
      });

      setFormData(emptyForm);
      setErrors(emptyForm);
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending demo booking:', error);
      toast({
        title: t.toasts.error.generic,
        description: t.dialogs.demoBooking.error,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
              <CalendarCheck2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">{t.dialogs.demoBooking.title}</DialogTitle>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">NewAI · Product demo</p>
            </div>
          </div>
          <DialogDescription>{t.dialogs.demoBooking.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="businessEmail">
              {t.dialogs.demoBooking.businessEmail} <span className="text-destructive">{t.dialogs.demoBooking.required}</span>
            </Label>
            <Input
              id="businessEmail"
              type="email"
              autoComplete="email"
              placeholder={t.dialogs.demoBooking.businessEmailPlaceholder}
              value={formData.businessEmail}
              onChange={(event) => updateField('businessEmail', event.target.value)}
              className="h-11 rounded-xl"
              aria-invalid={Boolean(errors.businessEmail)}
              required
            />
            {errors.businessEmail && <p className="text-sm text-destructive">{errors.businessEmail}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                {t.dialogs.demoBooking.firstName} <span className="text-destructive">{t.dialogs.demoBooking.required}</span>
              </Label>
              <Input
                id="firstName"
                type="text"
                autoComplete="given-name"
                placeholder={t.dialogs.demoBooking.firstNamePlaceholder}
                value={formData.firstName}
                onChange={(event) => updateField('firstName', event.target.value)}
                className="h-11 rounded-xl"
                aria-invalid={Boolean(errors.firstName)}
                required
              />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                {t.dialogs.demoBooking.lastName} <span className="text-destructive">{t.dialogs.demoBooking.required}</span>
              </Label>
              <Input
                id="lastName"
                type="text"
                autoComplete="family-name"
                placeholder={t.dialogs.demoBooking.lastNamePlaceholder}
                value={formData.lastName}
                onChange={(event) => updateField('lastName', event.target.value)}
                className="h-11 rounded-xl"
                aria-invalid={Boolean(errors.lastName)}
                required
              />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              {t.dialogs.demoBooking.roleBest} <span className="text-destructive">{t.dialogs.demoBooking.required}</span>
            </Label>
            <Select value={formData.role} onValueChange={(value) => updateField('role', value)}>
              <SelectTrigger id="role" className="h-11 rounded-xl" aria-invalid={Boolean(errors.role)}>
                <SelectValue placeholder={t.dialogs.demoBooking.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent className="z-[60] border-border/70 bg-background/95 shadow-xl backdrop-blur-xl">
                <SelectItem value="ecommerce-manager">{t.dialogs.demoBooking.roles.ecommerce_manager}</SelectItem>
                <SelectItem value="marketing-director">{t.dialogs.demoBooking.roles.marketing_director}</SelectItem>
                <SelectItem value="ceo-founder">{t.dialogs.demoBooking.roles.ceo_founder}</SelectItem>
                <SelectItem value="product-manager">{t.dialogs.demoBooking.roles.product_manager}</SelectItem>
                <SelectItem value="designer">{t.dialogs.demoBooking.roles.designer}</SelectItem>
                <SelectItem value="other">{t.dialogs.demoBooking.roles.other}</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            La demande n’est confirmée qu’après acceptation par le service d’envoi d’e-mail.
          </div>

          <Button type="submit" className="h-11 w-full rounded-xl" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isLoading ? t.dialogs.demoBooking.submitting : t.dialogs.demoBooking.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
