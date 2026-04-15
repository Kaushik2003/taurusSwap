import { useState, useEffect, useRef } from "react";
import { useInView } from "framer-motion";

const stats = [
  { label: "All time volume", value: "$2.5B+", color: "#FFFFFF", accent: false },
  { label: "Total value locked", value: "$850M", color: "FFFFFF", accent: false },
  { label: "Active swappers", value: "2.5M+", color: "#FFFFFF", accent: false },
  { label: "24H swap volume", value: "$45M", color: "#21C95E", accent: true },
];

function SlotChar({ char, delay = 0, accent }: { char: string; delay?: number; accent: boolean }) {
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
          color: "inherit",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {char}
      </span>
    </span>
  );
}

function AnimatedValue({ value, accent, delay = 0 }: { value: string; accent: boolean; delay?: number }) {
  const chars = value.split("");
  return (
    <div
      style={{
        fontSize: "clamp(2rem, 3.5vw, 3rem)",
        fontWeight: 900,
        fontFamily: "'Inter', sans-serif",
        letterSpacing: "-0.05em",
        lineHeight: 1,
        color: "inherit",
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

function StatCard({ label, value, accent, delay }: { label: string; value: string; accent: boolean; delay: number }) {
  // Use the high-fidelity double-border style for consistency with buttons
  return (
    <div
      style={{
        background: "#052c05",
        border: "1.5px solid #89f589",
        borderRadius: 24,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
        overflow: "hidden",
        boxShadow: accent
          ? "0 0 0 2px #052c05, 0 0 0 4px #89f589, 0 0 40px -8px rgba(137,245,137,0.45)"
          : "0 0 0 2px #052c05, 0 0 0 4px #89f589",
        transition: "all 0.3s ease",
        margin: 6,
      }}
    >
      {accent && (
        <>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 85% 15%, rgba(137,245,137,0.18) 0%, transparent 65%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(137,245,137,0.12)",
              border: "1px solid rgba(137,245,137,0.35)",
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#89f589",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#89f589",
                boxShadow: "0 0 8px #89f589",
                animation: "pulse 1.6s ease-in-out infinite",
              }}
            />
            Live
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.55; transform: scale(1.35); }
            }
          `}</style>
        </>
      )}
      <span
        style={{
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#89f589",
          opacity: 0.7,
          fontFamily: "'Inter', sans-serif",
          position: "relative",
        }}
      >
        {label}
      </span>
      <div style={{ color: "#89f589", position: "relative" }}>
        <AnimatedValue value={value} accent={accent} delay={delay} />
      </div>
    </div>
  );
}

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const visible = isInView;

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        padding: "40px 0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: 60,
          alignItems: "start",
        }}
      >
        {/* Left: Copy */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(44px)",
            transition: "opacity 1.0s cubic-bezier(0.16,1,0.3,1), transform 1.0s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)",
              fontWeight: 900,
              color: "var(--color-dark-green)",
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
                color: "rgba(8, 71, 52, 0.85)",
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
                color: "rgba(8, 71, 52, 0.65)",
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
              className="bg-[#052c05] text-[#89f589] border-[1.5px] border-[#89f589] px-10 h-12 rounded-full font-bold uppercase tracking-widest text-xs shadow-[0_0_0_2px_#052c05,0_0_0_4px_#89f589] hover:brightness-110 transition-all flex items-center justify-center"
            >
              Start Trading
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
            transform: visible ? "translateY(0)" : "translateY(52px)",
            transition: "opacity 1.0s cubic-bezier(0.16,1,0.3,1) 0.18s, transform 1.0s cubic-bezier(0.16,1,0.3,1) 0.18s",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(8, 71, 52, 0.05)",
              border: "1px solid rgba(8, 71, 52, 0.1)",
              borderRadius: 12,
              padding: "10px 16px",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--color-dark-green)",
                boxShadow: "0 0 0 3px rgba(8, 71, 52, 0.2)",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: "rgba(8, 71, 52, 0.6)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              Taurus Protocol live stats
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
