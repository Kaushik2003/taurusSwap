import { useState, useEffect } from "react";

const stats = [
  { label: "All time volume", value: "$2.5B+", color: "#FFFFFF", accent: false },
  { label: "Total value locked", value: "$850M", color: "FFFFFF", accent: false },
  { label: "Active swappers", value: "2.5M+", color: "#FFFFFF", accent: false },
  { label: "24H swap volume", value: "$45M", color: "#21C95E", accent: true },
];

function SlotChar({ char, delay = 0, accent }) {
  const [displayed, setDisplayed] = useState("0");
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setSpinning(true);
      const t2 = setTimeout(() => {
        setDisplayed(char);
        setSpinning(false);
      }, 400);
      return () => clearTimeout(t2);
    }, delay);
    return () => clearTimeout(t1);
  }, [char, delay]);

  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        height: "1.1em",
        verticalAlign: "middle",
        position: "relative",
      }}
    >
      <span
        style={{
          display: "inline-block",
          transition: spinning ? "transform 0.35s cubic-bezier(0.4,0,0.2,1)" : "none",
          transform: spinning ? "translateY(-80%)" : "translateY(0)",
          color: accent ? "#084734" : "#084734",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {char}
      </span>
    </span>
  );
}

function AnimatedValue({ value, accent, delay = 0 }) {
  const chars = value.split("");
  return (
    <div
      style={{
        fontSize: "clamp(2rem, 3.5vw, 3rem)",
        fontWeight: 900,
        fontFamily: "'Inter', sans-serif",
        letterSpacing: "-0.05em",
        lineHeight: 1,
        color: "#084734",
        display: "flex",
        alignItems: "baseline",
        gap: 1,
      }}
    >
      {chars.map((ch: string, i: number) => (
        <SlotChar key={i} char={ch} accent={accent} delay={delay + i * 55} />
      ))}
    </div>
  );
}

function StatCard({ label, value, accent, delay }) {
  return (
    <div
      style={{
        background: accent
          ? "rgba(8,71,52,0.08)"
          : "rgba(8,71,52,0.03)",
        border: `1px solid ${accent ? "rgba(127,150,43,0.3)" : "rgba(8,71,52,0.1)"}`,
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        backdropFilter: "blur(6px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {accent && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 80% 20%, rgba(8,71,52,0.05) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
      )}
      <span
        style={{
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: accent ? "rgba(8,71,52,0.8)" : "rgba(8,71,52,0.45)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {label}
      </span>
      <AnimatedValue value={value} accent={accent} delay={delay} />
    </div>
  );
}

export default function Features() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1800,
        padding: "160px 24px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1800,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(550px, 1fr))",
          gap: 120,
          alignItems: "center",
        }}
      >
        {/* Left: Copy */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)",
              fontWeight: 900,
              color: "#084734",
              margin: 0,
              lineHeight: 1.05,
              letterSpacing: "-0.05em",
            }}
          >
            Algorand's premier DEX.{" "}
            <span
              style={{
                color: "#1b8a45",
              }}
            >
              Pure decentralization.
            </span>
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p
              style={{
                fontSize: "clamp(1.2rem, 2vw, 1.6rem)",
                fontWeight: 700,
                color: "rgba(8,71,52,0.8)",
                margin: 0,
                lineHeight: 1.4,
                letterSpacing: "-0.01em",
              }}
            >
              Taurus delivers every advantage of Algorand — instant finality, near-zero fees, and carbon-negative transactions.
            </p>
            <p
              style={{
                fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
                fontWeight: 700,
                color: "rgba(8,71,52,0.6)",
                margin: 0,
                lineHeight: 1.6,
                letterSpacing: "-0.01em",
              }}
            >
              Experience lightning-fast swaps with sub-4 second finality, fractional cent fees,
              and deep liquidity across Algorand Standard Assets.
            </p>
          </div>

          <div>
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "#084734",
                border: "none",
                borderRadius: 999,
                padding: "13px 22px",
                color: "#87E4A2",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#0a5a42";
                e.currentTarget.style.transform = "translateX(2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#084734";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              Start trading
              <svg viewBox="0 0 18 18" fill="none" width={14} height={14}>
                <path
                  d="M9.79261 16.1108L17.5398 8.36364L9.79261 0.616477L8.25852 2.15057L13.3807 7.25568H0V9.47159H13.3807L8.25852 14.5852L9.79261 16.1108Z"
                  fill="#87E4A2"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: Stats Panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(8,71,52,0.05)",
              border: "1px solid rgba(8,71,52,0.1)",
              borderRadius: 12,
              padding: "10px 16px",
              backgroundImage:
                "radial-gradient(rgba(8,71,52,0.06) 1px, transparent 1px)",
              backgroundSize: "12px 12px",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#084734",
                boxShadow: "0 0 0 3px rgba(8,71,52,0.2)",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: "rgba(8,71,52,0.6)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              Taurus Protocol stats
            </span>
          </div>

          {/* Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {stats.map((s, i) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                accent={s.accent}
                delay={600 + i * 120}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
