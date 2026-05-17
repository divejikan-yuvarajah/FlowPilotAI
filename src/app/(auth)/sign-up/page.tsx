"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const schema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  ownerName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(9, "Enter a valid phone number"),
  password: z.string().min(8, "At least 8 characters required"),
  agreeToTerms: z
    .boolean()
    .refine((v) => v === true, "You must agree to continue"),
});

type FormValues = z.infer<typeof schema>;

function getPasswordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score;
}

function PasswordStrengthBars({ score }: { score: number }) {
  const barColor = (index: number) => {
    if (index >= score) return "bg-border";
    if (score === 1) return "bg-signal-danger";
    if (score === 2) return "bg-signal-watch";
    if (score === 3) return "bg-signal-watch";
    return "bg-signal-healthy";
  };

  const label =
    score === 0
      ? ""
      : score === 1
        ? "Weak"
        : score === 2
          ? "Fair"
          : score === 3
            ? "Good"
            : "Strong";

  const labelColor =
    score === 0
      ? ""
      : score === 1
        ? "text-signal-danger"
        : score <= 3
          ? "text-signal-watch"
          : "text-signal-healthy";

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              barColor(i),
            )}
          />
        ))}
      </div>
      {label && (
        <p className={cn("text-xs font-medium", labelColor)}>{label}</p>
      )}
    </div>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
  }

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { agreeToTerms: false },
  });

  const passwordValue = watch("password") ?? "";
  const passwordScore = getPasswordScore(passwordValue);

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          business_name: values.businessName,
          owner_name: values.ownerName,
          phone: values.phone,
        },
      },
    });

    if (error) {
      if (error.status === undefined || error.status >= 500) {
        toast.error(error.message);
      } else {
        setError("root", { message: error.message });
      }
      return;
    }

    router.push("/onboarding");
  }

  return (
    <div className="space-y-4 sm:space-y-6 text-center lg:text-left">
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink-primary">
          Create your account
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary">
          Start protecting your cash flow in 3 minutes
        </p>
      </div>

      {/* Google sign-up — fastest path */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 gap-2"
        onClick={handleGoogleSignUp}
        disabled={googleLoading}
        aria-label="Sign up with Google"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="h-4 w-4" />
        )}
        Sign up with Google
      </Button>

      {/* OR divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-ink-muted">or fill in the form</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 sm:space-y-4 text-left">
        {/* Business name */}
        <div className="space-y-1.5">
          <Label htmlFor="businessName">Business name</Label>
          <Input
            id="businessName"
            type="text"
            autoComplete="organization"
            placeholder="Acme Trading (Pvt) Ltd"
            {...register("businessName")}
            aria-invalid={!!errors.businessName}
          />
          {errors.businessName && (
            <p className="text-xs text-signal-danger">
              {errors.businessName.message}
            </p>
          )}
        </div>

        {/* Owner name */}
        <div className="space-y-1.5">
          <Label htmlFor="ownerName">Your name</Label>
          <Input
            id="ownerName"
            type="text"
            autoComplete="name"
            placeholder="Kasun Perera"
            {...register("ownerName")}
            aria-invalid={!!errors.ownerName}
          />
          {errors.ownerName && (
            <p className="text-xs text-signal-danger">
              {errors.ownerName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-signal-danger">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+94 77 123 4567"
            {...register("phone")}
            aria-invalid={!!errors.phone}
          />
          {errors.phone && (
            <p className="text-xs text-signal-danger">{errors.phone.message}</p>
          )}
        </div>

        {/* Password + strength */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="pr-10"
              {...register("password")}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {passwordValue.length > 0 && (
            <PasswordStrengthBars score={passwordScore} />
          )}
          {errors.password && (
            <p className="text-xs text-signal-danger">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Terms checkbox */}
        <Controller
          name="agreeToTerms"
          control={control}
          render={({ field }) => (
            <div className="space-y-1">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="agreeToTerms"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  className="mt-0.5"
                />
                <Label
                  htmlFor="agreeToTerms"
                  className="text-sm text-ink-secondary leading-snug cursor-pointer"
                >
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="text-pilot-500 hover:text-pilot-400 transition-colors"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-pilot-500 hover:text-pilot-400 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-xs text-signal-danger pl-6">
                  {errors.agreeToTerms.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Root / auth error */}
        {errors.root && (
          <p className="text-sm text-signal-danger bg-signal-danger/10 border border-signal-danger/20 rounded-md px-3 py-2">
            {errors.root.message}
          </p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className={cn(
            "w-full h-10 bg-pilot-500 hover:bg-pilot-600 text-white font-medium",
            "disabled:opacity-50",
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>

        {/* Seylan disclaimer */}
        <p className="text-xs text-ink-muted text-center leading-relaxed">
          By signing up, you authorize FlowPilot AI to connect to your Seylan
          Bank account during onboarding.
        </p>
      </form>

      {/* Switch to sign-in */}
      <p className="text-center text-sm text-ink-muted">
        Have an account?{" "}
        <Link
          href="/sign-in"
          className="text-pilot-500 hover:text-pilot-400 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
