import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

interface DemoBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoBookingDialog({ open, onOpenChange }: DemoBookingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessEmail: "",
    firstName: "",
    lastName: "",
    role: "",
  });
  const [errors, setErrors] = useState({
    businessEmail: "",
    firstName: "",
    lastName: "",
    role: "",
  });
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors = {
      businessEmail: "",
      firstName: "",
      lastName: "",
      role: "",
    };
    let isValid = true;

    if (!formData.businessEmail || !formData.businessEmail.includes('@')) {
      newErrors.businessEmail = "Please enter a valid business email";
      isValid = false;
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
      isValid = false;
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
      isValid = false;
    }

    if (!formData.role) {
      newErrors.role = "Please complete this required field.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-demo-booking', {
        body: {
          businessEmail: formData.businessEmail.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          role: formData.role,
        },
      });

      if (error) throw error;

      toast({
        title: "Demo request sent!",
        description: "We'll contact you shortly at " + formData.businessEmail,
      });

      // Reset form
      setFormData({
        businessEmail: "",
        firstName: "",
        lastName: "",
        role: "",
      });
      setErrors({
        businessEmail: "",
        firstName: "",
        lastName: "",
        role: "",
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending demo booking:', error);
      toast({
        title: "Error",
        description: "Failed to send demo request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] bg-white dark:bg-gray-900 p-8">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-6 w-6 text-muted-foreground" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader className="space-y-3">
          <DialogTitle className="text-3xl font-bold text-center text-foreground">
            See Quickshot in action
          </DialogTitle>
          <p className="text-center text-lg text-muted-foreground">
            Create lifestyle images in seconds
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="businessEmail" className="text-sm font-medium">
              Business email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="businessEmail"
              type="email"
              value={formData.businessEmail}
              onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
              className="h-12"
              required
            />
            {errors.businessEmail && (
              <p className="text-sm text-red-500">{errors.businessEmail}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="h-12"
                required
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="h-12"
                required
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium">
              What describes your role best? <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Please Select" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border shadow-lg z-50">
                <SelectItem value="ecommerce-manager">E-commerce Manager</SelectItem>
                <SelectItem value="marketing-director">Marketing Director</SelectItem>
                <SelectItem value="ceo-founder">CEO/Founder</SelectItem>
                <SelectItem value="product-manager">Product Manager</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg bg-cyan-500 hover:bg-cyan-600 text-white rounded-full"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "See it live"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
