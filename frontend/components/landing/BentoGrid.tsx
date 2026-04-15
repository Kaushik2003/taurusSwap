"use client";

import React, { useState, ReactNode } from "react";
import { motion } from "framer-motion";

const ArrowIcon = ({ color, size = 20 }: { color: string; size?: number }) => (
  <svg viewBox="0 0 18 18" fill="none" width={size} height={size}>
    <path d="M9.79261 16.1108L17.5398 8.36364L9.79261 0.616477L8.25852 2.15057L13.3807 7.25568H0V9.47159H13.3807L8.25852 14.5852L9.79261 16.1108Z" fill={color} />
  </svg>
);

const CtaButton = ({ label, btnBg, btnColor, href }: { label: string; btnBg?: string; btnColor?: string; href?: string }) => {
  const [hovered, setHovered] = useState(false);
  const style = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: btnBg || "var(--color-dark-green)",
    border: `2px solid ${btnColor || "var(--color-green)"}`,
    borderRadius: 999,
    padding: "16px 24px",
    color: btnColor || "var(--color-green)",
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer",
    transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "0.01em",
    textDecoration: "none",
    boxShadow: hovered
      ? `2px 2px 0px 0px ${btnColor || "var(--color-green)"}`
      : `4px 4px 0px 0px ${btnColor || "var(--color-green)"}`,
    transform: hovered ? "translate(2px, 2px)" : "translate(0px, 0px)",
  } as React.CSSProperties;

  if (href) {
    const isExternal = href.startsWith("http");
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : "_self"}
        rel={isExternal ? "noopener noreferrer" : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={style}
      >
        {label}
        <ArrowIcon color={btnColor || "var(--color-green)"} size={18} />
      </a>
    );
  }
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={style}
    >
      {label}
      <ArrowIcon color={btnColor || "var(--color-green)"} size={18} />
    </button>
  );
};

const CardLabel = ({ icon, label, color }: { icon: ReactNode; label: string; color: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
    <span style={{ color, fontSize: 13, fontWeight: 700, opacity: 0.9 }}>{label}</span>
  </div>
);

const tokens = [
  { name: "Algorand", ticker: "ALGO", price: "$0.28", change: "+1.25%", up: true, img: "https://assets.coingecko.com/coins/images/4380/large/algorand.png" },
  { name: "USD Coin", ticker: "USDC", price: "$1.00", change: "0.00%", up: true, img: "https://assets.coingecko.com/coins/images/6319/large/USDC.png" },
  { name: "Tether", ticker: "USDT", price: "$1.00", change: "+0.01%", up: true, img: "https://assets.coingecko.com/coins/images/325/large/Tether.png" },
  { name: "Governance", ticker: "gALGO", price: "$0.29", change: "+1.45%", up: true, img: "https://assets.coingecko.com/coins/images/4380/large/algorand.png" },
];

function TokenRow({ token, cardColor = "var(--color-dark-green)" }: { token: { name: string; ticker: string; price: string; change: string; up: boolean; img: string; }; cardColor?: string; }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "20px 24px",
        borderRadius: 24,
        background: hovered ? `${cardColor}25` : `${cardColor}15`,
        transition: "background 0.15s ease",
        cursor: "pointer",
      }}
    >
      <img src={token.img} alt={token.name} width={50} height={50} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: cardColor, fontWeight: 700, fontSize: 18 }}>{token.name}</span>
          <span style={{ color: cardColor, fontWeight: 700, fontSize: 18 }}>{token.price}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
          <span style={{ color: `${cardColor}99`, fontSize: 16, fontWeight: 700 }}>{token.ticker}</span>
          <span style={{ color: token.up ? "#1b8a45" : "#c1272d", fontSize: 16, fontWeight: 900 }}>{token.change}</span>
        </div>
      </div>
    </div>
  );
}
// Palette constants for the Pera card — warm amber/cream pastel
const P = {
  bg: "#FEF3C7",        // card shell: warm butter yellow
  ink: "#78350F",       // primary text: deep amber-brown
  inkMid: "rgba(120,53,15,0.55)",
  inkFaint: "rgba(120,53,15,0.28)",
  accent: "#D97706",    // amber for balance & highlights
  gain: "#166534",      // dapp green for positive change
  rowHover: "rgba(120,53,15,0.07)",
  rowBase: "rgba(120,53,15,0.04)",
  pill: "rgba(217,119,6,0.12)",
  pillBorder: "rgba(217,119,6,0.25)",
};

// Pera logo mark — "P" on warm amber square
const PeraLogo = () => (
  <svg width="30" height="30" viewBox="0 0 200 200" fill="none">
    <rect width="200" height="200" rx="52" fill="#D97706" />
    <path d="M60 55h52c22.09 0 40 17.91 40 40s-17.91 40-40 40H88v30H60V55z" fill="#FEF3C7" />
  </svg>
);

const peraAssets = [
  {
    ticker: "ALGO",
    name: "Algorand",
    amount: "1,250.00",
    value: "$350.00",
    change: "+1.25%",
    up: true,
    img: "https://assets.coingecko.com/coins/images/4380/large/algorand.png",
  },
  {
    ticker: "USDC",
    name: "USD Coin",
    amount: "500.00",
    value: "$500.00",
    change: "0.00%",
    up: true,
    img: "https://assets.coingecko.com/coins/images/6319/large/USDC.png",
  },
  {
    ticker: "gALGO",
    name: "Governance",
    amount: "200.00",
    value: "$58.00",
    change: "+1.45%",
    up: true,
    img: "https://assets.coingecko.com/coins/images/4380/large/algorand.png",
  },
];

function PeraAssetRow({ asset }: { asset: typeof peraAssets[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 12px",
        borderRadius: 12,
        background: hovered ? P.rowHover : P.rowBase,
        transition: "background 0.15s ease",
        cursor: "pointer",
      }}
    >
      <img
        src={asset.img}
        alt={asset.ticker}
        width={34}
        height={34}
        style={{ borderRadius: "50%", flexShrink: 0, border: `1.5px solid ${P.inkFaint}` }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: P.ink, fontWeight: 700, fontSize: 13 }}>{asset.name}</span>
          <span style={{ color: P.ink, fontWeight: 700, fontSize: 13 }}>{asset.value}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
          <span style={{ color: P.inkMid, fontSize: 11, fontWeight: 600 }}>{asset.amount} {asset.ticker}</span>
          <span style={{ color: asset.up ? P.gain : "#DC2626", fontSize: 11, fontWeight: 700 }}>{asset.change}</span>
        </div>
      </div>
    </div>
  );
}

function WalletMockup() {
  return (
    <div style={{
      background: "#FFFBEB",
      borderRadius: 22,
      width: "100%",
      maxWidth: 360,
      border: `1.5px solid ${P.pillBorder}`,
      boxShadow: "0 8px 32px rgba(120,53,15,0.12)",
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px 12px",
        borderBottom: `1px solid ${P.inkFaint}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PeraLogo />
          <div>
            <div style={{ color: P.ink, fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>Account 1</div>
            <div style={{ color: P.inkMid, fontSize: 11, fontWeight: 500 }}>7XKP…3F2A</div>
          </div>
        </div>
        {/* QR icon */}
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: P.pill,
          border: `1px solid ${P.pillBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1" stroke={P.accent} strokeWidth="2"/>
            <rect x="14" y="3" width="7" height="7" rx="1" stroke={P.accent} strokeWidth="2"/>
            <rect x="3" y="14" width="7" height="7" rx="1" stroke={P.accent} strokeWidth="2"/>
            <rect x="14" y="14" width="4" height="4" rx="0.5" fill={P.accent}/>
          </svg>
        </div>
      </div>

      {/* Balance */}
      <div style={{ padding: "18px 18px 14px", textAlign: "center" }}>
        <div style={{ color: P.inkMid, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 5 }}>
          Portfolio Value
        </div>
        <div style={{ color: P.accent, fontSize: 34, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1 }}>
          $908.00
        </div>
        <div style={{ color: P.gain, fontSize: 11, fontWeight: 700, marginTop: 4 }}>+$11.45 (1.28%) today</div>
      </div>

      {/* Action pills */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px 14px" }}>
        {["Send", "Receive", "Swap"].map((action) => (
          <div key={action} style={{
            flex: 1,
            textAlign: "center",
            background: P.pill,
            border: `1px solid ${P.pillBorder}`,
            borderRadius: 10,
            padding: "7px 0",
            color: P.accent,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}>
            {action}
          </div>
        ))}
      </div>

      {/* Asset list */}
      <div style={{ padding: "0 10px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ color: P.inkFaint, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", padding: "0 4px 5px" }}>
          Assets
        </div>
        {peraAssets.map((asset) => (
          <PeraAssetRow key={asset.ticker} asset={asset} />
        ))}
      </div>
    </div>
  );
}
function PFOFDecoration() {
  return (
    <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 8, opacity: 0.7 }}>
      {["MEV protection", "Best price", "0.001 ALGO fee"].map((label, i) => (
        <div key={label} style={{
          background: "rgba(167,230,127,0.2)",
          border: "1px solid rgba(167,230,127,0.3)",
          borderRadius: 20,
          padding: "5px 12px",
          fontSize: 12,
          color: "#A7E67F",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}>{label}</div>
      ))}
    </div>
  );
}
function LiquidityDecoration() {
  const coins = ["#21C95E", "#627EEA", "#2ABDFF", "#F7931A"];
  return (
    <div style={{ position: "absolute", bottom: 0, right: 0, width: 120, height: 120, opacity: 0.8 }}>
      {coins.map((color, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: color,
          opacity: 0.6 + i * 0.1,
          bottom: i * 16 + "%",
          right: (i % 2 === 0 ? 10 : 40) + "%",
          border: "2px solid rgba(255,255,255,0.2)",
        }} />
      ))}
    </div>
  );
}

const cards = [
  {
    id: "webapp", color: "#ea91f2", bg: "#52167a", btnBg: "#ea91f2", btnColor: "#52167a", border: "transparent",
    label: "Web App",
    headline: "Trade ASAs. Instant. Final.",
    body: "Discover and swap Algorand Standard Assets with sub-4 second finality. Explore the Algorand ecosystem.",
    cta: "Explore tokens",
    href: "/trade",
    icon: (
      <svg width="20" height="20" viewBox="0 0 25 25" fill="none">
        <path d="M21.3164 14.7471C21.3164 16.7471 20.3164 17.7471 18.3164 17.7471H14.3164V20.9971H16.8164C17.2264 20.9971 17.5664 21.3371 17.5664 21.7471C17.5664 22.1571 17.2264 22.4971 16.8164 22.4971H7.81641C7.40641 22.4971 7.06641 22.1571 7.06641 21.7471C7.06641 21.3371 7.40641 20.9971 7.81641 20.9971H10.3164V17.7471H6.31641C4.31641 17.7471 3.31641 16.7471 3.31641 14.7471C3.31641 14.6091 3.42841 14.4971 3.56641 14.4971H21.0664C21.2044 14.4971 21.3164 14.6091 21.3164 14.7471ZM18.3164 3.74707H6.31641C4.31641 3.74707 3.31641 4.74707 3.31641 6.74707V12.7471C3.31641 12.8851 3.42841 12.9971 3.56641 12.9971H21.0664C21.2044 12.9971 21.3164 12.8851 21.3164 12.7471V6.74707C21.3164 4.74707 20.3164 3.74707 18.3164 3.74707Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "wallet", color: "#78350F", bg: "#FEF3C7", btnBg: "#78350F", btnColor: "#FEF3C7", border: "transparent",
    label: "Pera Wallet",
    headline: "Secure. Self-custody.",
    body: "Connect with Pera Algo Wallet — the most trusted Algorand wallet with over 1M+ downloads.",
    cta: "Get Pera Wallet",
    href: "https://perawallet.app/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 200 200" fill="none">
        <rect width="200" height="200" rx="48" fill="#FFCD2A"/>
        <path d="M60 55h52c22.09 0 40 17.91 40 40s-17.91 40-40 40H88v30H60V55z" fill="#141419"/>
      </svg>
    ),
  },
  {
    id: "pfop", color: "#a3e473", bg: "#265d1d", btnBg: "#a3e473", btnColor: "#265d1d", border: "transparent",
    label: "PFOF Engine",
    headline: "Payment for Order Flow.",
    body: "Our novel PFOF engine ensures you get the best execution price with institutional-grade liquidity.",
    cta: "Learn more",
    icon: (
      <svg viewBox="0 0 10 14" fill="none" width="20" height="20">
        <path d="M9.97131 6.19803C9.91798 6.07737 9.79866 6.00003 9.66666 6.00003H6.66666V1.00003C6.66666 0.862034 6.58201 0.738037 6.45267 0.688704C6.32267 0.638704 6.17799 0.674696 6.08532 0.776696L0.0853237 7.44336C-0.00267631 7.54136 -0.0253169 7.68137 0.0286831 7.80204C0.0820164 7.9227 0.20133 8.00003 0.33333 8.00003H3.33333V13C3.33333 13.138 3.41799 13.262 3.54732 13.3114C3.58665 13.326 3.62666 13.3334 3.66666 13.3334C3.75933 13.3334 3.85 13.2947 3.91467 13.2227L9.91467 6.55603C10.0027 6.4587 10.0246 6.31803 9.97131 6.19803Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "liquidity", color: "#e64f28", bg: "#fbdec1", btnBg: "#e64f28", btnColor: "#fbdec1", border: "transparent",
    label: "Liquidity Pools",
    headline: "Provide liquidity, earn fees.",
    body: "Earn by powering onchain markets with Constant Product AMM pools on Algorand.",
    cta: "Explore pools",
    href: "/pool",
    icon: (
      <svg width="20" height="20" viewBox="0 0 25 24" fill="none">
        <path d="M12.7148 21.0011H11.7148C10.7148 21.0011 10.2148 20.5011 10.2148 19.5011V4.50108C10.2148 3.50108 10.7148 3.00108 11.7148 3.00108H12.7148C13.7148 3.00108 14.2148 3.50108 14.2148 4.50108V19.5011C14.2148 20.5011 13.7148 21.0011 12.7148 21.0011ZM21.2148 19.5011V9.50108C21.2148 8.50108 20.7148 8.00108 19.7148 8.00108H18.7148C17.7148 8.00108 17.2148 8.50108 17.2148 9.50108V19.5011C17.2148 20.5011 17.7148 21.0011 18.7148 21.0011H19.7148C20.7148 21.0011 21.2148 20.5011 21.2148 19.5011ZM7.21484 19.5011V13.5011C7.21484 12.5011 6.71484 12.0011 5.71484 12.0011H4.71484C3.71484 12.0011 3.21484 12.5011 3.21484 13.5011V19.5011C3.21484 20.5011 3.71484 21.0011 4.71484 21.0011H5.71484C6.71484 21.0011 7.21484 20.5011 7.21484 19.5011Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "api", color: "#FDF4FF", bg: "#1f2937", btnBg: "#FDF4FF", btnColor: "#1f2937", border: "transparent",
    label: "Developer API",
    headline: "Build on Algorand.",
    body: "Integrate Tauras liquidity into your dApps with our powerful REST API and SDK.",
    cta: "View documentation",
    href: "/docs",
    icon: (
      <svg viewBox="0 0 25 24" fill="none" width="20" height="20">
        <path d="M20.9341 17.59L14.3441 20.65C13.3341 21.12 12.1541 21.12 11.1441 20.65L4.55414 17.59C3.47414 17.09 3.47414 15.55 4.55414 15.05L4.69416 14.99L10.5141 17.68C11.2141 18.01 11.9641 18.18 12.7441 18.18C13.5241 18.18 14.2742 18.01 14.9742 17.68L20.7941 14.99L20.9341 15.05C22.0141 15.55 22.0141 17.09 20.9341 17.59ZM20.9341 10.72L20.8041 10.66L16.1441 12.83L14.9742 13.37C14.2742 13.69 13.5241 13.86 12.7441 13.86C11.9641 13.86 11.2141 13.69 10.5141 13.37L9.34415 12.83L4.68415 10.66L4.55414 10.72C3.47414 11.23 3.47414 12.77 4.55414 13.27L6.47415 14.16L11.1441 17.68C11.2141 18.01 11.9641 18.18 12.7441 18.18C13.5241 18.18 14.2742 18.01 14.9742 17.68L20.7941 14.99L20.9341 15.05C22.0141 15.55 22.0141 17.09 20.9341 17.59ZM20.9341 10.72L20.8041 10.66L16.1441 12.83L14.9742 13.37C14.2742 13.69 13.5241 13.86 12.7441 13.86C11.9641 13.86 11.2141 13.69 10.5141 13.37L9.34415 12.83L4.68415 10.66L4.55414 10.72C3.47414 11.23 3.47414 12.77 4.55414 13.27L6.47415 14.16L11.1441 16.32C11.6541 16.56 12.1941 16.68 12.7441 16.68C13.2941 16.68 13.8341 16.56 14.3441 16.32L19.0141 14.16L20.9341 13.27C22.0141 12.77 22.0141 11.23 20.9341 10.72ZM20.9341 6.41L14.3441 3.35001C13.8341 3.12001 13.2941 3 12.7441 3C12.1941 3 11.6541 3.12001 11.1441 3.35001L4.55414 6.41C3.47414 6.91 3.47414 8.45001 4.55414 8.95001L4.68415 9.01001L5.57413 9.42001L6.46414 9.84L11.1441 12.01C11.6541 12.24 12.1941 12.36 12.7441 12.36C13.2941 12.36 13.8341 12.24 14.3441 12.01L19.0241 9.84L19.9142 9.42001L20.8041 9.01001L20.9341 8.95001C22.0141 8.45001 22.0141 6.91 20.9341 6.41Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "ecosystem", color: "#166534", bg: "#dcfce7", btnBg: "#166534", btnColor: "#dcfce7", border: "transparent",
    label: "Algorand Ecosystem",
    headline: "Pure proof-of-stake.",
    body: "Join the sustainable blockchain with 4.5 second finality and carbon-negative operations.",
    cta: "Learn about Algorand",
    href: "https://developer.algorand.org/",
    icon: (
      <svg viewBox="0 0 25 25" fill="none" width="20" height="20">
        <path d="M24.7441 11.9143C18.2397 11.9143 12.9725 6.6417 12.9725 0.142578H12.5159V11.9143H0.744141V12.3709C7.24858 12.3709 12.5159 17.6435 12.5159 24.1426H12.9725V12.3709H24.7441V11.9143Z" fill="currentColor" />
      </svg>
    ),
  },
];

function BentoCard({ card, tall = false, revealDelay = 0, children }: { card: { label: string; headline: string; body: string; cta: string; href?: string; icon: ReactNode; color: string; bg: string; btnBg: string; btnColor: string; }; tall?: boolean; revealDelay?: number; children?: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: revealDelay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: card.bg,
        borderRadius: 40,
        padding: "40px 48px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 24,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.2s ease, transform 0.2s ease",
        transform: hovered ? "scale(1.01)" : "scale(1)",
        borderColor: hovered ? `${card.color}44` : `${card.color}22`,
        minHeight: tall ? 520 : 320,
        flex: 1,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10, zIndex: 2, position: "relative" }}>
        <CardLabel icon={card.icon} label={card.label} color={card.color} />
        <h2 style={{ margin: 0, color: card.color, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.05em", fontFamily: "'Inter', sans-serif" }}>
          {card.headline}
        </h2>
        <p style={{ margin: 0, color: `${card.color}bb`, fontSize: 18, lineHeight: 1.6, fontWeight: 700, fontFamily: "'Inter', sans-serif", maxWidth: "95%", letterSpacing: "-0.01em" }}>
          {card.body}
        </p>
        <div style={{ marginTop: 4 }}>
          <CtaButton label={card.cta} btnBg={card.btnBg} btnColor={card.btnColor} href={card.href} />
        </div>
      </div>
      {children}
    </motion.div>
  );
}

export default function BentoGrid() {
  return (
    <div style={{
      width: "100%",
      maxWidth: 1800,
      padding: "64px 0",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ width: "100%", margin: "0 auto" }}>
        <h2 style={{
          color: "#111",
          fontSize: "clamp(1.4rem, 3vw, 2rem)",
          fontWeight: 900,
          margin: "0 0 24px",
          letterSpacing: "-0.05em",
          lineHeight: 1.1,
        }}>
          Built for the Algorand ecosystem
        </h2>

        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(2, 1fr)", 
          gap: 24 
        }}>

          {/* Web App (tall) */}
          <BentoCard card={cards[0]} tall revealDelay={0}>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8, zIndex: 2 }}>
              {tokens.map(t => <TokenRow key={t.ticker} token={t} cardColor={cards[0].color} />)}
            </div>
          </BentoCard>

          {/* Wallet (tall) */}
          <BentoCard card={cards[1]} tall revealDelay={0.1}>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12, zIndex: 2 }}>
              <WalletMockup />
            </div>
          </BentoCard>

          {/* PFOF */}
          <BentoCard card={cards[2]} revealDelay={0.05}>
            <PFOFDecoration />
          </BentoCard>

          {/* Liquidity */}
          <BentoCard card={cards[3]} revealDelay={0.15}>
            <LiquidityDecoration />
          </BentoCard>

          {/* Developer API */}
          <BentoCard card={cards[4]} revealDelay={0.1}>
            <div style={{
              position: "absolute", bottom: 20, right: 16,
              background: "rgba(253,244,255,0.1)", borderRadius: 8,
              padding: "8px 12px", fontSize: 11, color: "#FDF4FF",
              fontFamily: "'Inter', sans-serif", opacity: 0.8,
              border: "1px solid rgba(253,244,255,0.15)",
            }}>
              taurus-sdk →
            </div>
          </BentoCard>

          {/* Ecosystem */}
          <BentoCard card={cards[5]} revealDelay={0.2}>
            <div style={{
              position: "absolute", bottom: 16, right: 16,
              width: 80, height: 80,
              background: "radial-gradient(circle, rgba(0,85,58,0.15) 0%, transparent 70%)",
              borderRadius: "50%",
            }} />
            <div style={{
              position: "absolute", bottom: 24, right: 24,
              fontSize: 40, opacity: 0.4,
              color: "#00553A",
              fontWeight: 800,
            }}>✦</div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}