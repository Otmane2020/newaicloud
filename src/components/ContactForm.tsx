import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";

export function ContactForm() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: t.landing.contact.error.title,
        description: t.landing.contact.error.fillRequired,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: t.landing.contact.success.title,
        description: t.landing.contact.success.description,
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: ""
      });
    } catch (error) {
      console.error('Error sending contact form:', error);
      toast({
        title: t.landing.contact.error.title,
        description: t.landing.contact.error.description,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-3xl opacity-10 -z-10" />
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl -z-10" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl -z-10" />
      
      {/* Header Section */}
      <div className="text-center mb-12 space-y-4">
        <Badge variant="outline" className="border-primary text-primary bg-primary/5">
          <MessageSquare className="w-4 h-4 mr-2" />
          {t.landing.contact.badge}
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {t.landing.contact.title}
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {t.landing.contact.subtitle}
        </p>
      </div>

      {/* Form Card */}
      <Card className="relative border-2 border-primary/20 shadow-elegant hover:shadow-glow transition-all duration-300 overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-subtle opacity-50 -z-10" />
        
        <CardContent className="p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  {t.landing.contact.form.name} *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t.landing.contact.form.namePlaceholder}
                  required
                  className="border-2 focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  {t.landing.contact.form.email} *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t.landing.contact.form.emailPlaceholder}
                  required
                  className="border-2 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-base font-semibold">
                {t.landing.contact.form.subject}
              </Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={t.landing.contact.form.subjectPlaceholder}
                className="border-2 focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                {t.landing.contact.form.message} *
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t.landing.contact.form.messagePlaceholder}
                rows={6}
                required
                className="border-2 focus:border-primary transition-colors resize-none"
              />
            </div>

            <Button 
              type="submit" 
              size="lg"
              className="w-full md:w-auto md:min-w-[200px] bg-gradient-primary hover:opacity-90 shadow-glow transition-all duration-300 hover:scale-105" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                  {t.landing.contact.form.submitting}
                </>
              ) : (
                <>
                  <Send className="mr-2 w-5 h-5" />
                  {t.landing.contact.form.submit}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
