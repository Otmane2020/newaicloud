import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "@/lib/language";
import { LanguagePreferences } from "./LanguagePreferences";

export function AccountSettings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [email] = useState(user?.email || "");

  // Password change states
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (error) throw error;

      await supabase.from("profiles").update({ full_name: fullName }).eq("id", user?.id);

      toast.success(t.account.profile.updateSuccess);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t.account.profile.updateError);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!newPassword || !confirmPassword) {
      toast.error(t.account.security.fillAllFields);
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t.account.security.passwordTooShort);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t.account.security.passwordMismatch);
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Clear password fields
      setNewPassword("");
      setConfirmPassword("");

      toast.success(t.account.security.updateSuccess);
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || t.account.security.updateError);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {/* Personal Information */}
      <Card className="rounded-3xl border-slate-200 p-5 shadow-sm sm:p-6">
        <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><User className="h-5 w-5" /></span>
          {t.account.profile.title}
        </h2>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t.account.profile.email}
            </Label>
            <Input id="email" type="email" value={email} disabled className="bg-muted" />
            <p className="text-sm text-muted-foreground">{t.account.profile.emailDesc}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t.account.profile.fullName}
            </Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t.account.profile.fullNamePlaceholder}
            />
          </div>

          <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.common.saveChanges}
          </Button>
        </form>
      </Card>

      {/* Security - Change Password */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><Lock className="h-5 w-5" /></span>
          {t.account.security.title}
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {t.account.security.newPassword}
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.account.security.newPasswordPlaceholder}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {t.account.security.confirmPassword}
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.account.security.confirmPasswordPlaceholder}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
            <p className="text-sm text-violet-900">
              <strong>{t.account.security.securityTips}</strong>
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-sm text-violet-700">
              <li>{t.account.security.tip1}</li>
              <li>{t.account.security.tip2}</li>
              <li>{t.account.security.tip3}</li>
              <li>{t.account.security.tip4}</li>
            </ul>
          </div>

          <Button type="submit" disabled={passwordLoading || !newPassword || !confirmPassword} className="bg-violet-600 hover:bg-violet-700">
            {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.account.security.changePassword}
          </Button>
        </form>
      </Card>

      <div className="xl:col-span-2"><LanguagePreferences /></div>
    </div>
  );
}
