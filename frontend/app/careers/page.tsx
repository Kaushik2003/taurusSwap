"use client";
import Link from "next/link";
import { useState } from "react";
import Footer from "@/components/landing/Footer";

const openRoles = [
  {
    title: "Protocol Engineer",
    team: "Engineering",
    type: "Full-time · Remote",
    description:
      "Work on the Orbital AMM smart contracts, liquidity math, and on-chain fee accounting. Deep AVM/PyTEAL experience preferred.",
  },
  {
    title: "Frontend Engineer",
    team: "Engineering",
    type: "Full-time · Remote",
    description:
      "Build and maintain the TaurusSwap trading UI. You'll own the swap flow, pool analytics, and real-time on-chain data hooks.",
  },
  {
    title: "DeFi Research Analyst",
    team: "Research",
    type: "Part-time · Remote",
    description:
      "Study stablecoin AMM designs, fee mechanisms, and capital efficiency. Help us stay ahead of the curve on protocol design.",
  },
  {
    title: "Community & Growth",
    team: "Growth",
    type: "Full-time · Remote",
    description:
      "Grow TaurusSwap's presence across Algorand communities, X, and dev forums. Own our social voice and partner outreach.",
  },
];

const values = [
  {
    headline: "Small team, big surface area",
    body: "We're a lean team shipping real protocol work. Everyone owns outcomes, not just tasks.",
  },
  {
    headline: "Research-first culture",
    body: "We built the first implementation of Paradigm's Orbital AMM. Intellectual curiosity is not optional.",
  },
  {
    headline: "Fully remote, async-friendly",
    body: "Work where you do your best thinking. We run on outcomes and good async communication.",
  },
  {
    headline: "Early-stage equity upside",
    body: "Competitive comp and meaningful equity. We're at the beginning — come build something that lasts.",
  },
];

function RoleCard({ role }: { role: typeof openRoles[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={`mailto:paramarshlabs@gmail.com?subject=Application: ${encodeURIComponent(role.title)}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        textDecoration: "none",
        borderTop: "2px solid rgba(8,71,52,0.15)",
        padding: "36px 0",
        opacity: hovered ? 0.7 : 1,
        transition: "opacity 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{
              background: "rgba(8,71,52,0.08)",
              border: "1px solid rgba(8,71,52,0.18)",
              borderRadius: 999,
              padding: "3px 12px",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "var(--color-dark-green)",
            }}>
              {role.team}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(8,71,52,0.5)" }}>
              {role.type}
            </span>
          </div>
          <h3 style={{
            margin: "0 0 10px",
            fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)",
            fontWeight: 900,
            color: "var(--color-dark-green)",
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
          }}>
            {role.title}
          </h3>
          <p style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "rgba(8,71,52,0.65)",
            lineHeight: 1.6,
            maxWidth: 560,
          }}>
            {role.description}
          </p>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--color-dark-green)",
          fontWeight: 800,
          fontSize: 15,
          flexShrink: 0,
          paddingTop: 4,
        }}>
          Apply
          <svg viewBox="0 0 20 20" fill="none" width={20} height={20}>
            <path d="M5.24408 14.7559C5.56951 15.0814 6.09715 15.0814 6.42259 14.7559L13.3333 7.84518V14.1667C13.3333 14.6269 13.7064 15 14.1667 15C14.6269 15 15 14.6269 15 14.1667V5.83333C15 5.3731 14.6269 5 14.1667 5H5.83333C5.3731 5 5 5.3731 5 5.83333C5 6.29357 5.3731 6.66667 5.83333 6.66667H12.1548L5.24408 13.5774C4.91864 13.9028 4.91864 14.4305 5.24408 14.7559Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </a>
  );
}

export default function CareersPage() {
  return (
    <div className="relative min-h-screen bg-green">
      <div
        style={{
          width: "100%",
          maxWidth: 1440,
          margin: "0 auto",
          padding: "80px 24px 0",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Hero */}
        <div style={{ maxWidth: 860, marginBottom: 96 }}>
          <p style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(8,71,52,0.45)",
            marginBottom: 20,
          }}>
            Careers
          </p>
          <h1 style={{
            fontSize: "clamp(3rem, 7vw, 6rem)",
            fontWeight: 900,
            color: "var(--color-dark-green)",
            lineHeight: 1.0,
            letterSpacing: "-0.06em",
            margin: "0 0 28px",
          }}>
            Build the future of<br />stablecoin trading.
          </h1>
          <p style={{
            fontSize: "clamp(1.1rem, 2vw, 1.4rem)",
            fontWeight: 700,
            color: "rgba(8,71,52,0.7)",
            lineHeight: 1.5,
            maxWidth: 600,
            margin: 0,
          }}>
            We're a small, ambitious team working at the frontier of AMM design on Algorand.
            If you want to do meaningful protocol work, this is the place.
          </p>
        </div>

        {/* Values */}
        <div style={{ marginBottom: 96 }}>
          <h2 style={{
            fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)",
            fontWeight: 900,
            color: "var(--color-dark-green)",
            letterSpacing: "-0.05em",
            margin: "0 0 40px",
          }}>
            How we work
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}>
            {values.map((v) => (
              <div
                key={v.headline}
                style={{
                  background: "rgba(8,71,52,0.05)",
                  border: "1.5px solid rgba(8,71,52,0.1)",
                  borderRadius: 24,
                  padding: "28px 32px",
                }}
              >
                <h3 style={{
                  margin: "0 0 10px",
                  fontSize: 17,
                  fontWeight: 900,
                  color: "var(--color-dark-green)",
                  letterSpacing: "-0.03em",
                }}>
                  {v.headline}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "rgba(8,71,52,0.6)",
                  lineHeight: 1.6,
                }}>
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Open roles */}
        <div style={{ marginBottom: 96 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
            <h2 style={{
              fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)",
              fontWeight: 900,
              color: "var(--color-dark-green)",
              letterSpacing: "-0.05em",
              margin: 0,
            }}>
              Open roles
            </h2>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(8,71,52,0.4)" }}>
              {openRoles.length} positions
            </span>
          </div>

          <div>
            {openRoles.map((role) => (
              <RoleCard key={role.title} role={role} />
            ))}
            <div style={{ borderTop: "2px solid rgba(8,71,52,0.15)" }} />
          </div>
        </div>

        {/* Don't see a fit */}
        <div style={{
          background: "#163300",
          borderRadius: 32,
          padding: "56px 48px",
          marginBottom: 96,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 32,
        }}>
          <div>
            <h2 style={{
              margin: "0 0 12px",
              fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
              fontWeight: 900,
              color: "#9FE870",
              letterSpacing: "-0.05em",
              lineHeight: 1.1,
            }}>
              Don't see your role?
            </h2>
            <p style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 600,
              color: "rgba(159,232,112,0.65)",
              lineHeight: 1.5,
              maxWidth: 460,
            }}>
              We're always open to exceptional people. Send us a note about what you'd build with us.
            </p>
          </div>
          <a
            href="mailto:paramarshlabs@gmail.com?subject=General Application — TaurusSwap"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#9FE870",
              color: "#163300",
              borderRadius: 999,
              padding: "16px 28px",
              fontWeight: 900,
              fontSize: 15,
              textDecoration: "none",
              letterSpacing: "0.01em",
              flexShrink: 0,
              boxShadow: "4px 4px 0px 0px rgba(159,232,112,0.4)",
              transition: "filter 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.08)")}
            onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
          >
            Get in touch
            <svg viewBox="0 0 20 20" fill="none" width={18} height={18}>
              <path d="M5.24408 14.7559C5.56951 15.0814 6.09715 15.0814 6.42259 14.7559L13.3333 7.84518V14.1667C13.3333 14.6269 13.7064 15 14.1667 15C14.6269 15 15 14.6269 15 14.1667V5.83333C15 5.3731 14.6269 5 14.1667 5H5.83333C5.3731 5 5 5.3731 5 5.83333C5 6.29357 5.3731 6.66667 5.83333 6.66667H12.1548L5.24408 13.5774C4.91864 13.9028 4.91864 14.4305 5.24408 14.7559Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
