import { useState } from "react";
import { motion } from "framer-motion";

const ExternalArrow = () => (
  <svg viewBox="0 0 20 20" fill="none" width={32} height={32} style={{ flexShrink: 0 }}>
    <path
      d="M5.24408 14.7559C5.56951 15.0814 6.09715 15.0814 6.42259 14.7559L13.3333 7.84518V14.1667C13.3333 14.6269 13.7064 15 14.1667 15C14.6269 15 15 14.6269 15 14.1667V5.83333C15 5.3731 14.6269 5 14.1667 5H5.83333C5.3731 5 5 5.3731 5 5.83333C5 6.29357 5.3731 6.66667 5.83333 6.66667H12.1548L5.24408 13.5774C4.91864 13.9028 4.91864 14.4305 5.24408 14.7559Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);

const HelpIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" width={48} height={48}>
    <path d="M15 12.0158V13.9166C15 14.4949 14.6941 15.0291 14.2049 15.3383C11.4016 17.1091 8.59738 17.1091 5.79405 15.3383C5.30488 15.03 4.99917 14.4949 4.99917 13.9166V12.0158C4.99917 11.9524 5.06662 11.9125 5.12246 11.9425L8.18256 13.6166C8.73256 13.9166 9.36583 14.075 9.99917 14.075C10.6325 14.075 11.2658 13.9166 11.8158 13.6166L14.8759 11.9425C14.9325 11.9117 15 11.9524 15 12.0158ZM16.6142 6.5875L11.2217 3.64499C10.4609 3.22999 9.54074 3.22999 8.77907 3.64499L3.38662 6.5875C2.20495 7.23166 2.20495 8.92833 3.38662 9.57333L8.77907 12.5158C9.53991 12.9308 10.46 12.9308 11.2217 12.5158L16.6142 9.57333L16.0416 9.88583V13.3333C16.0416 13.6783 16.3216 13.9583 16.6666 13.9583C17.0116 13.9583 17.2916 13.6783 17.2916 13.3333V8.89249C17.7116 8.11582 17.4883 7.06416 16.6142 6.5875Z" fill="currentColor" />
  </svg>
);

const BlogIcon = () => (
  <svg viewBox="0 0 19 19" fill="none" width={40} height={40}>
    <path d="M14.0371 9.00194L5 18H0V13L8.99805 3.963C9.11505 3.845 9.3051 3.845 9.4231 3.963L14.0381 8.57799C14.1551 8.69499 14.1551 8.88494 14.0371 9.00194ZM15.1079 7.52794C15.2249 7.64494 15.415 7.64494 15.532 7.52794L17.4099 5.65001C18.1939 4.86601 18.1939 3.59405 17.4099 2.81005L15.1899 0.589953C14.4059 -0.194047 13.1341 -0.194047 12.3501 0.589953L10.4719 2.468C10.3549 2.58501 10.3549 2.77496 10.4719 2.89196L15.1079 7.52794ZM18 17.25H11C10.586 17.25 10.25 17.586 10.25 18C10.25 18.414 10.586 18.75 11 18.75H18C18.414 18.75 18.75 18.414 18.75 18C18.75 17.586 18.414 17.25 18 17.25Z" fill="currentColor" />
  </svg>
);

const DocsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width={48} height={48}>
    <path d="M21 5.31992V18.3299C21 18.6599 20.6801 18.89 20.3501 18.8C17.9661 18.121 15.573 18.118 13.187 19.308C12.986 19.408 12.749 19.272 12.749 19.047V5.853C12.749 5.786 12.7701 5.71901 12.8091 5.66501C13.4321 4.81001 14.396 4.21495 15.519 4.07895C17.331 3.85895 19.0731 4.07903 20.7141 4.86203C20.8891 4.94503 21 5.12692 21 5.31992ZM8.47998 4.07993C6.66798 3.85993 4.92591 4.08001 3.28491 4.86301C3.11091 4.94601 3 5.12802 3 5.32102V18.331C3 18.661 3.3199 18.891 3.6499 18.801C6.0339 18.122 8.42699 18.1189 10.813 19.3089C11.014 19.4089 11.251 19.2729 11.251 19.0479V5.85398C11.251 5.78698 11.2299 5.71999 11.1909 5.66599C10.5669 4.81099 9.60398 4.21593 8.47998 4.07993Z" fill="currentColor" />
  </svg>
);

const SocialsIcon = () => (
  <svg viewBox="0 0 36 36" fill="none" width={48} height={48}>
    <path d="M31.3184 30.5911C31.6784 30.8911 31.4684 31.491 31.0034 31.491C29.4584 31.551 27.0887 31.341 25.6337 29.796C24.4487 30.216 23.1285 30.4261 21.7485 30.4261C18.7215 30.4261 16.029 29.4106 14.2485 27.5521C13.965 27.2551 14.037 26.6775 14.6865 26.7285C15.036 26.7525 15.3885 26.766 15.7485 26.766C22.6785 26.766 27.921 22.7145 29.0295 16.8525C29.1045 16.4595 29.5936 16.3291 29.8396 16.6456C30.8896 18.0046 31.4971 19.7221 31.4971 21.7546C31.4971 24.0496 30.7018 25.9711 29.3818 27.3961C29.5483 28.4461 30.1334 29.6311 31.3184 30.5911ZM26.9971 14.5065C26.9971 14.436 26.9879 14.3716 26.9865 14.3026C26.8755 8.17355 21.891 4.5 15.7485 4.5 9.53704 4.5 4.5 8.25303 4.5 14.5065C4.5 17.1585 5.412 19.3725 6.9375 21.0225C6.75 22.224 6.07513 23.5996 4.71313 24.7006C4.30063 25.0501 4.53755 25.7385 5.07605 25.7505C6.85055 25.8135 9.58805 25.575 11.2635 23.787C11.6055 23.9055 11.9564 24.0091 12.3164 24.0991C13.3979 24.3706 14.55 24.5114 15.7515 24.5114C21.96 24.5129 26.9971 20.76 26.9971 14.5065Z" fill="currentColor" />
  </svg>
);

const links = [
  {
    id: "help",
    title: "Help center",
    description: "Browse FAQs and get support for using TaurusProtocol on Algorand",
    href: "#",
    icon: <HelpIcon />,
    isLink: true,
  },
  {
    id: "docs",
    title: "Documentation",
    description: "Explore our developer docs and API reference for building with TaurusProtocol",
    href: "/docs",
    icon: <DocsIcon />,
    isLink: true,
  },
  {
    id: "blog",
    title: "Blog",
    description: "Catch up on the latest TaurusProtocol updates, Algorand ecosystem news and more",
    href: "#",
    icon: <BlogIcon />,
    isLink: true,
  },
  {
    id: "socials",
    title: "Socials",
    description: null,
    href: null,
    icon: <SocialsIcon />,
    isLink: false,
  },
];

const socialLinks = [
  { label: "X", href: "https://x.com/taurus_protocol" },
  { label: "GitHub", href: "https://github.com/kaushik2003/taurusSwap" },
];

function SocialDescription() {
  return (
    <span style={{ color: "var(--color-dark-green)", fontSize: 20, fontWeight: 700, lineHeight: 1.5 }}>
      Follow TaurusProtocol on{" "}
      {socialLinks.map((s, i) => (
        <span key={s.label}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "rgba(8,71,52,0.6)",
              textDecoration: "none",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={e => ((e.target as HTMLElement).style.color = "var(--color-dark-green)")}
            onMouseLeave={e => ((e.target as HTMLElement).style.color = "rgba(8,71,52,0.6)")}
          >
            {s.label}
          </a>
          {i < socialLinks.length - 2 ? " " : i === socialLinks.length - 2 ? " and " : ""}
        </span>
      ))}
    </span>
  );
}

interface LinkRowProps {
  item: {
    id: string;
    title: string;
    description: string | null;
    href: string | null;
    icon: React.ReactNode;
    isLink: boolean;
  };
  revealDelay?: number;
}

function LinkRow({ item, revealDelay = 0 }: LinkRowProps) {
  const [hovered, setHovered] = useState(false);

  const inner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 32,
        padding: "48px 0",
        borderTop: "2px solid rgba(8,71,52,0.15)",
        width: "100%",
        opacity: hovered ? 0.7 : 1,
        transition: "opacity 0.15s ease",
      }}
    >
      {/* Icon */}
      <div style={{ width: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--color-dark-green)" }}>
        {item.icon}
      </div>

      {/* Content */}
      <div style={{ display: "flex", alignItems: "center", flex: 1, gap: 20, minWidth: 0 }}>
        <h2 style={{
          margin: 0,
          color: "var(--color-dark-green)",
          fontSize: 28,
          fontWeight: 900,
          fontFamily: "'Inter', sans-serif",
          whiteSpace: "nowrap",
          width: 220,
          flexShrink: 0,
          letterSpacing: "-0.05em",
          lineHeight: 1.1,
        }}>
          {item.title}
        </h2>
        <div style={{ color: "rgba(8,71,52,0.8)", fontSize: 20, fontWeight: 700, lineHeight: 1.5, fontFamily: "'Inter', sans-serif", letterSpacing: "-0.01em" }}>
          {item.id === "socials" ? <SocialDescription /> : item.description}
        </div>
      </div>

      {/* Arrow */}
      {item.isLink && (
        <div style={{ color: "var(--color-dark-green)", flexShrink: 0, marginLeft: "auto" }}>
          <ExternalArrow />
        </div>
      )}
    </div>
  );

  const wrapper = item.isLink ? (
    <a
      href={item.href || "#"}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {inner}
    </a>
  ) : (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {inner}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: revealDelay }}
    >
      {wrapper}
    </motion.div>
  );
}

export default function FAQ() {
  return (
    <div style={{
      width: "100%",
      maxWidth: 1800,
      padding: "120px 24px",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{
          color: "var(--color-dark-green)",
          fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
          fontWeight: 900,
          margin: "0 0 48px",
          letterSpacing: "-0.05em",
          lineHeight: 1.05,
        }}
        >
          Explore TaurusProtocol
        </h1>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {links.map((item, i) => (
            <LinkRow key={item.id} item={item} revealDelay={i * 0.09} />
          ))}
          {/* Bottom border */}
          <div style={{ borderTop: "2px solid rgba(8,71,52,0.15)" }} />
        </div>
      </div>
    </div>
  );
}
