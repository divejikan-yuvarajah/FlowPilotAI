"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-ink-primary">
          Create your account
        </h1>
        <p className="text-sm text-ink-secondary">
          Start protecting your cash flow in 3 minutes
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
