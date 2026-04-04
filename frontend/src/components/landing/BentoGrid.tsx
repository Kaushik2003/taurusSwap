
import { useState } from "react";

const ArrowIcon = ({ color, size = 20 }) => (
  <svg viewBox="0 0 18 18" fill="none" width={size} height={size}>
    <path d="M9.79261 16.1108L17.5398 8.36364L9.79261 0.616477L8.25852 2.15057L13.3807 7.25568H0V9.47159H13.3807L8.25852 14.5852L9.79261 16.1108Z" fill={color} />
  </svg>
);

const CtaButton = ({ label, color }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: hovered ? "#0a5a42" : "#084734",
        border: "none",
        borderRadius: 999,
        padding: "22px 32px",
        color: "#CEF17B",
        fontSize: 18,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "'Inter', sans-serif",
        letterSpacing: "0.01em",
      }}
    >
      {label}
      <ArrowIcon color="#CEF17B" size={18} />
    </button>
  );
};

const CardLabel = ({ icon, label, color }) => (
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

function TokenRow({ token }) {
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
        background: hovered ? "rgba(8,71,52,0.15)" : "rgba(8,71,52,0.08)",
        transition: "background 0.15s ease",
        cursor: "pointer",
      }}
    >
      <img src={token.img} alt={token.name} width={50} height={50} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#084734", fontWeight: 700, fontSize: 18 }}>{token.name}</span>
          <span style={{ color: "#084734", fontWeight: 700, fontSize: 18 }}>{token.price}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
          <span style={{ color: "rgba(8,71,52,0.6)", fontSize: 16, fontWeight: 700 }}>{token.ticker}</span>
          <span style={{ color: token.up ? "#1b8a45" : "#c1272d", fontSize: 16, fontWeight: 900 }}>{token.change}</span>
        </div>
      </div>
    </div>
  );
}

function WalletMockup() {
  return (
    <div style={{
      background: "#084734",
      borderRadius: 24,
      padding: "32px",
      width: "100%",
      maxWidth: 380,
      border: "1px solid rgba(206,241,123,0.2)",
      boxShadow: "0 8px 32px rgba(8,71,52,0.15)",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {[
          { label: "ALGO", amount: "1,250 ALGO", sub: "$350.00" },
          { label: "USDC", amount: "500.00 USDC", sub: "$500.00" },
          { label: "gALGO", amount: "200 gALGO", sub: "$58.00" },
        ].map(item => (
          <div key={item.label} style={{ background: "rgba(206,241,123,0.08)", borderRadius: 12, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#CEF17B", fontSize: 13, fontWeight: 700 }}>{item.label}</div>
              <div style={{ color: "rgba(206,241,123,0.5)", fontSize: 11 }}>{item.sub}</div>
            </div>
            <div style={{ color: "rgba(206,241,123,0.7)", fontSize: 12 }}>{item.amount}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(206,241,123,0.1)", borderRadius: 12, padding: "10px 14px" }}>
        <span style={{ color: "rgba(206,241,123,0.45)", fontSize: 13, flex: 1 }}>Search ASAs</span>
        <div style={{ background: "#CEF17B", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 800, color: "#084734" }}>Swap</div>
      </div>
    </div>
  );
}

function PFOFDecoration() {
  return (
    <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 8, opacity: 0.7 }}>
      {["MEV protection", "Best price", "0.001 ALGO fee"].map((label, i) => (
        <div key={label} style={{
          background: "rgba(130,81,251,0.2)",
          border: "1px solid rgba(130,81,251,0.3)",
          borderRadius: 20,
          padding: "5px 12px",
          fontSize: 12,
          color: "#A070FF",
          fontWeight: 500,
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
    id: "webapp",
    color: "#084734",
    bg: "rgba(8,71,52,0.03)",
    label: "Web App",
    headline: "Trade ASAs. Instant. Final.",
    body: "Discover and swap Algorand Standard Assets with sub-4 second finality. Explore the Algorand ecosystem.",
    cta: "Explore tokens",
    icon: (
      <svg width="20" height="20" viewBox="0 0 25 25" fill="none">
        <path d="M21.3164 14.7471C21.3164 16.7471 20.3164 17.7471 18.3164 17.7471H14.3164V20.9971H16.8164C17.2264 20.9971 17.5664 21.3371 17.5664 21.7471C17.5664 22.1571 17.2264 22.4971 16.8164 22.4971H7.81641C7.40641 22.4971 7.06641 22.1571 7.06641 21.7471C7.06641 21.3371 7.40641 20.9971 7.81641 20.9971H10.3164V17.7471H6.31641C4.31641 17.7471 3.31641 16.7471 3.31641 14.7471C3.31641 14.6091 3.42841 14.4971 3.56641 14.4971H21.0664C21.2044 14.4971 21.3164 14.6091 21.3164 14.7471ZM18.3164 3.74707H6.31641C4.31641 3.74707 3.31641 4.74707 3.31641 6.74707V12.7471C3.31641 12.8851 3.42841 12.9971 3.56641 12.9971H21.0664C21.2044 12.9971 21.3164 12.8851 21.3164 12.7471V6.74707C21.3164 4.74707 20.3164 3.74707 18.3164 3.74707Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "wallet",
    color: "#084734",
    bg: "rgba(8,71,52,0.03)",
    label: "Pera Wallet",
    headline: "Secure. Self-custody.",
    body: "Connect with Pera Algo Wallet — the most trusted Algorand wallet with over 1M+ downloads.",
    cta: "Connect wallet",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d="M4 4C2.34315 4 1 5.34315 1 7V18C1 19.6569 2.34315 21 4 21H20C21.6569 21 23 19.6569 23 18V7C23 5.34315 21.6569 4 20 4H4ZM3 12.2676V11C3 10.4485 3.44812 10 4.00115 10H19.9989C20.5519 10 21 10.4485 21 11V12.2676C20.7058 12.0974 20.3643 12 20 12H16C15.4477 12 14.9935 12.5284 14.7645 13.1028C14.4438 13.9072 13.789 14.8571 12 14.8571C10.29 14.8571 9.48213 13.9893 9.1936 13.2102C8.96576 12.595 8.49905 12 7.91447 12H4C3.63571 12 3.29417 12.0974 3 12.2676ZM19.9989 8C20.3498 8 20.6868 8.06029 21 8.17109V7C21 6.44772 20.5523 6 20 6H4C3.44772 6 3 6.44772 3 7V8.17109C3.31318 8.06029 3.65018 8 4.00115 8H19.9989Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "pfop",
    color: "#084734",
    bg: "rgba(8,71,52,0.03)",
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
    id: "liquidity",
    color: "#084734",
    bg: "rgba(8,71,52,0.03)",
    label: "Liquidity Pools",
    headline: "Provide liquidity, earn fees.",
    body: "Earn by powering onchain markets with Constant Product AMM pools on Algorand.",
    cta: "Explore pools",
    icon: (
      <svg width="20" height="20" viewBox="0 0 25 24" fill="none">
        <path d="M12.7148 21.0011H11.7148C10.7148 21.0011 10.2148 20.5011 10.2148 19.5011V4.50108C10.2148 3.50108 10.7148 3.00108 11.7148 3.00108H12.7148C13.7148 3.00108 14.2148 3.50108 14.2148 4.50108V19.5011C14.2148 20.5011 13.7148 21.0011 12.7148 21.0011ZM21.2148 19.5011V9.50108C21.2148 8.50108 20.7148 8.00108 19.7148 8.00108H18.7148C17.7148 8.00108 17.2148 8.50108 17.2148 9.50108V19.5011C17.2148 20.5011 17.7148 21.0011 18.7148 21.0011H19.7148C20.7148 21.0011 21.2148 20.5011 21.2148 19.5011ZM7.21484 19.5011V13.5011C7.21484 12.5011 6.71484 12.0011 5.71484 12.0011H4.71484C3.71484 12.0011 3.21484 12.5011 3.21484 13.5011V19.5011C3.21484 20.5011 3.71484 21.0011 4.71484 21.0011H5.71484C6.71484 21.0011 7.21484 20.5011 7.21484 19.5011Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "api",
    color: "#084734",
    bg: "rgba(8,71,52,0.03)",
    label: "Developer API",
    headline: "Build on Algorand.",
    body: "Integrate Tauras liquidity into your dApps with our powerful REST API and SDK.",
    cta: "View documentation",
    icon: (
      <svg viewBox="0 0 25 24" fill="none" width="20" height="20">
        <path d="M20.9341 17.59L14.3441 20.65C13.3341 21.12 12.1541 21.12 11.1441 20.65L4.55414 17.59C3.47414 17.09 3.47414 15.55 4.55414 15.05L4.69416 14.99L10.5141 17.68C11.2141 18.01 11.9641 18.18 12.7441 18.18C13.5241 18.18 14.2742 18.01 14.9742 17.68L20.7941 14.99L20.9341 15.05C22.0141 15.55 22.0141 17.09 20.9341 17.59ZM20.9341 10.72L20.8041 10.66L16.1441 12.83L14.9742 13.37C14.2742 13.69 13.5241 13.86 12.7441 13.86C11.9641 13.86 11.2141 13.69 10.5141 13.37L9.34415 12.83L4.68415 10.66L4.55414 10.72C3.47414 11.23 3.47414 12.77 4.55414 13.27L6.47415 14.16L11.1441 17.68C11.2141 18.01 11.9641 18.18 12.7441 18.18C13.5241 18.18 14.2742 18.01 14.9742 17.68L20.7941 14.99L20.9341 15.05C22.0141 15.55 22.0141 17.09 20.9341 17.59ZM20.9341 10.72L20.8041 10.66L16.1441 12.83L14.9742 13.37C14.2742 13.69 13.5241 13.86 12.7441 13.86C11.9641 13.86 11.2141 13.69 10.5141 13.37L9.34415 12.83L4.68415 10.66L4.55414 10.72C3.47414 11.23 3.47414 12.77 4.55414 13.27L6.47415 14.16L11.1441 16.32C11.6541 16.56 12.1941 16.68 12.7441 16.68C13.2941 16.68 13.8341 16.56 14.3441 16.32L19.0141 14.16L20.9341 13.27C22.0141 12.77 22.0141 11.23 20.9341 10.72ZM20.9341 6.41L14.3441 3.35001C13.8341 3.12001 13.2941 3 12.7441 3C12.1941 3 11.6541 3.12001 11.1441 3.35001L4.55414 6.41C3.47414 6.91 3.47414 8.45001 4.55414 8.95001L4.68415 9.01001L5.57413 9.42001L6.46414 9.84L11.1441 12.01C11.6541 12.24 12.1941 12.36 12.7441 12.36C13.2941 12.36 13.8341 12.24 14.3441 12.01L19.0241 9.84L19.9142 9.42001L20.8041 9.01001L20.9341 8.95001C22.0141 8.45001 22.0141 6.91 20.9341 6.41Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "ecosystem",
    color: "#084734",
    bg: "rgba(8,71,52,0.03)",
    label: "Algorand Ecosystem",
    headline: "Pure proof-of-stake.",
    body: "Join the sustainable blockchain with 4.5 second finality and carbon-negative operations.",
    cta: "Learn about Algorand",
    icon: (
      <svg viewBox="0 0 25 25" fill="none" width="20" height="20">
        <path d="M24.7441 11.9143C18.2397 11.9143 12.9725 6.6417 12.9725 0.142578H12.5159V11.9143H0.744141V12.3709C7.24858 12.3709 12.5159 17.6435 12.5159 24.1426H12.9725V12.3709H24.7441V11.9143Z" fill="currentColor" />
      </svg>
    ),
  },
];

function BentoCard({ card, tall = false, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: card.bg,
        border: `1px solid ${card.color}22`,
        borderRadius: 40,
        padding: 56,
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
        minHeight: tall ? 680 : 380,
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
          <CtaButton label={card.cta} color={card.color} />
        </div>
      </div>
      {children}
    </div>
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
          color: "#084734",
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
          <BentoCard card={cards[0]} tall>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8, zIndex: 2 }}>
              {tokens.map(t => <TokenRow key={t.ticker} token={t} />)}
            </div>
          </BentoCard>

          {/* Wallet (tall) */}
          <BentoCard card={cards[1]} tall>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12, zIndex: 2 }}>
              <WalletMockup />
            </div>
          </BentoCard>

          {/* PFOF */}
          <BentoCard card={cards[2]}>
            <PFOFDecoration />
          </BentoCard>

          {/* Liquidity */}
          <BentoCard card={cards[3]}>
            <LiquidityDecoration />
          </BentoCard>

          {/* Developer API */}
          <BentoCard card={cards[4]}>
            <div style={{
              position: "absolute", bottom: 20, right: 16,
              background: "rgba(8,71,52,0.1)", borderRadius: 8,
              padding: "8px 12px", fontSize: 11, color: "#084734",
              fontFamily: "'Inter', sans-serif", opacity: 0.8,
              border: "1px solid rgba(8,71,52,0.15)",
            }}>
              taurus-sdk →
            </div>
          </BentoCard>

          {/* Ecosystem */}
          <BentoCard card={cards[5]}>
            <div style={{
              position: "absolute", bottom: 16, right: 16,
              width: 80, height: 80,
              background: "radial-gradient(circle, rgba(8,71,52,0.15) 0%, transparent 70%)",
              borderRadius: "50%",
            }} />
            <div style={{
              position: "absolute", bottom: 24, right: 24,
              fontSize: 40, opacity: 0.4,
              color: "#084734",
              fontWeight: 800,
            }}>✦</div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}