import { Zap } from "lucide-react";

export default function OnboardingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pilot-500">
        <Zap className="h-7 w-7 text-white" />
      </div>
      <h1 className="font-display text-3xl font-semibold text-ink-primary">
        Welcome to FlowPilot AI
      </h1>
      <p className="text-ink-secondary max-w-md">
        Onboarding flow coming soon. You&apos;re all set up — head to the War Room to
        explore the dashboard.
      </p>
      <a
        href="/war-room"
        className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-pilot-500 hover:bg-pilot-600 text-white text-sm font-medium transition-colors"
      >
        Go to War Room →
      </a>
    </div>
  );
}
