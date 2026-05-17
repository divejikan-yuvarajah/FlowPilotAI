"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

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

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error") === "oauth_failed";

  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      if (error.status === undefined || error.status >= 500) {
        toast.error(error.message);
      } else {
        setError("root", { message: error.message });
      }
      return;
    }

    router.push("/war-room");
  }

  async function handleGoogleSignIn() {
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
    // On success Supabase redirects the browser — no need to setLoading(false)
  }

  async function handleMagicLink() {
    const email = getValues("email");
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("email", { message: "Enter your email above first" });
      return;
    }
    setMagicLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setMagicLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setMagicSent(true);
      toast.success("Magic link sent! Check your inbox.");
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 text-center lg:text-left">
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink-primary">
          Welcome back
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary">
          Sign in to your FlowPilot AI account
        </p>
      </div>

      {/* OAuth error from callback */}
      {oauthError && (
        <p className="text-sm text-signal-danger bg-signal-danger/10 border border-signal-danger/20 rounded-md px-3 py-2">
          Google sign-in failed. Please try again.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 sm:space-y-4 text-left">
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

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-ink-muted hover:text-ink-secondary transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
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
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-signal-danger">{errors.password.message}</p>
          )}
        </div>

        {errors.root && (
          <p className="text-sm text-signal-danger bg-signal-danger/10 border border-signal-danger/20 rounded-md px-3 py-2">
            {errors.root.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className={cn(
            "w-full h-10 bg-pilot-500 hover:bg-pilot-600 text-white font-medium",
            "disabled:opacity-50",
          )}
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* OR divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-ink-muted">or</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Social / alternative buttons */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full h-10 gap-2"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          aria-label="Continue with Google"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          Continue with Google
        </Button>

        {magicSent ? (
          <p className="text-center text-sm text-signal-healthy py-2">
            ✓ Magic link sent — check your inbox
          </p>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="w-full h-10 gap-2 text-ink-secondary"
            onClick={handleMagicLink}
            disabled={magicLoading}
            aria-label="Continue with magic link"
          >
            {magicLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Continue with magic link
          </Button>
        )}
      </div>

      {/* Switch to sign-up */}
      <p className="text-center text-sm text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="text-pilot-500 hover:text-pilot-400 font-medium transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
