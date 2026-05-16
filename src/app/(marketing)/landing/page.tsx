import { LandingPage } from "../landing-client";

export const metadata = {
  title: "FlowPilot AI — Your Business's Financial Nervous System",
  description:
    "FlowPilot AI predicts cash crises 22 days early, recovers payments automatically, and gives Sri Lankan SMEs a CFO-grade intelligence layer.",
};

/**
 * /landing — always shows the marketing page regardless of auth state.
 * Useful for previewing while logged in during development.
 */
export default function LandingRoute() {
  return <LandingPage />;
}
