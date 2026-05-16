import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0d1117 0%, #161b22 50%, #1a1f2e 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "800px",
            height: "400px",
            background:
              "radial-gradient(ellipse, rgba(26,106,255,0.25) 0%, rgba(168,85,247,0.15) 50%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "#1A6AFF",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: "40px", fontWeight: 700, color: "#f0f6ff", letterSpacing: "-1px" }}>
            FlowPilot AI
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "58px",
            fontWeight: 800,
            color: "#f0f6ff",
            textAlign: "center",
            lineHeight: 1.1,
            letterSpacing: "-2px",
            maxWidth: "900px",
            marginBottom: "24px",
          }}
        >
          Your Business&apos;s Financial Nervous System.
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: "24px",
            color: "#8b9ab0",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.4,
            marginBottom: "48px",
          }}
        >
          Predict cash crises 22 days early. Recover payments automatically.
        </div>

        {/* Stat pills */}
        <div style={{ display: "flex", gap: "16px" }}>
          {["34d → 12d Recovery", "< 48hr Alerts", "6 AI Engines", "Built on Seylan Bank"].map((s) => (
            <div
              key={s}
              style={{
                background: "rgba(26,106,255,0.12)",
                border: "1px solid rgba(26,106,255,0.3)",
                borderRadius: "24px",
                padding: "8px 20px",
                fontSize: "16px",
                color: "#60a5fa",
                fontWeight: 600,
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
