import type { Metadata } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://taurusswap.xyz";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tickId = parseInt(id);
  const posLabel = `Pos #${tickId.toString().padStart(4, "0")}`;
  const posUrl = `${BASE_URL}/pool/${id}`;

  const title = `${posLabel} — TaurusSwap`;
  const description =
    `View my liquidity position ${posLabel} on TaurusSwap — the Algorand-native ` +
    `concentrated liquidity AMM powered by the O(1) Torus Invariant.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: posUrl,
      siteName: "TaurusSwap",
      type: "website",
      images: [
        {
          url: `${BASE_URL}/og-position.png`,
          width: 1200,
          height: 630,
          alt: `TaurusSwap ${posLabel}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}/og-position.png`],
      site: "@TaurusSwap",
    },
    alternates: {
      canonical: posUrl,
    },
  };
}

export default function PositionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
