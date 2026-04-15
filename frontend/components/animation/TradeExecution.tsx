'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import AnimationCanvas, { PALETTE } from './AnimationCanvas';
import type { LivePoolMetrics } from '@/hooks/useLivePoolMetrics';

interface Props {
  metrics: LivePoolMetrics;
}

const MIN_R_INT_VIS = 0.4;
const MAX_R_INT_VIS = 1.6;
const MIN_S_BOUND_VIS = 1.8;
const MAX_S_BOUND_VIS = 3.2;

function torusPoint(u: number, v: number, sVis: number, rVis: number) {
  const cx = (sVis + rVis * Math.cos(v)) * Math.cos(u);
  const cy = rVis * Math.sin(v);
  const cz = (sVis + rVis * Math.cos(v)) * Math.sin(u);
  return new THREE.Vector3(cx, cy, cz);
}

function LiveSwapTrajectory({
  sVis,
  rVis,
  u,
  v,
  postU,
  postV,
  hasPost,
}: {
  sVis: number;
  rVis: number;
  u: number;
  v: number;
  postU: number | null;
  postV: number | null;
  hasPost: boolean;
}) {
  const current = useRef<THREE.Mesh>(null);
  const ghost = useRef<THREE.Mesh>(null);
  const arcRef = useRef<THREE.Line>(null);
  const pulse = useRef(0);

  // Pre-compute the geodesic-ish arc from current (u,v) → post (u,v) along
  // the torus surface. 32 samples is plenty for a smooth tube.
  const arcPoints = useMemo(() => {
    if (!hasPost || postU === null || postV === null) return [torusPoint(u, v, sVis, rVis)];
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const uu = u + (postU - u) * t;
      const vv = v + (postV - v) * t;
      pts.push(torusPoint(uu, vv, sVis, rVis));
    }
    return pts;
  }, [u, v, postU, postV, sVis, rVis, hasPost]);

  useFrame(({ clock }) => {
    pulse.current = clock.getElapsedTime();
    if (current.current) {
      current.current.position.copy(torusPoint(u, v, sVis, rVis));
      const s = 1 + Math.sin(pulse.current * 3) * 0.08;
      current.current.scale.setScalar(s);
    }
    if (ghost.current && hasPost && postU !== null && postV !== null) {
      ghost.current.position.copy(torusPoint(postU, postV, sVis, rVis));
      const mat = ghost.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.55 + Math.sin(pulse.current * 2.2) * 0.25;
    }
    if (arcRef.current) {
      (arcRef.current.geometry as THREE.BufferGeometry).setFromPoints(arcPoints);
    }
  });

  return (
    <>
      <mesh ref={current}>
        <sphereGeometry args={[0.15, 24, 24]} />
        <meshStandardMaterial
          color={PALETTE.yellow}
          emissive={PALETTE.yellow}
          emissiveIntensity={0.9}
        />
      </mesh>

      {hasPost && (
        <mesh ref={ghost}>
          <sphereGeometry args={[0.13, 20, 20]} />
          <meshStandardMaterial
            color={PALETTE.pink}
            emissive={PALETTE.pink}
            emissiveIntensity={0.8}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}

      {/* @ts-expect-error three.js line primitive */}
      <line ref={arcRef}>
        <bufferGeometry />
        <lineBasicMaterial
          color={hasPost ? PALETTE.pink : PALETTE.yellow}
          linewidth={3}
          transparent
          opacity={0.85}
        />
      </line>
    </>
  );
}

function IdleDrift({ sVis, rVis }: { sVis: number; rVis: number }) {
  const point = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!point.current) return;
    const t = clock.getElapsedTime();
    const u = (t * 0.3) % (Math.PI * 2);
    const v = Math.sin(t * 0.7) * 0.7;
    point.current.position.copy(torusPoint(u, v, sVis, rVis));
  });
  return (
    <mesh ref={point}>
      <sphereGeometry args={[0.12, 20, 20]} />
      <meshStandardMaterial
        color={PALETTE.yellow}
        emissive={PALETTE.yellow}
        emissiveIntensity={0.6}
        transparent
        opacity={0.55}
      />
    </mesh>
  );
}

function MetricLabels({
  priceImpact,
  amountIn,
  amountOut,
  ticks,
  symbolSell,
  symbolBuy,
  hasQuote,
}: {
  priceImpact: number;
  amountIn: string;
  amountOut: string;
  ticks: number;
  symbolSell: string;
  symbolBuy: string;
  hasQuote: boolean;
}) {
  const color = PALETTE.darkGreen;
  const outline = PALETTE.green;
  return (
    <>
      <Text
        position={[-3.4, 2.8, 0]}
        fontSize={0.22}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor={outline}
      >
        {hasQuote ? `IN  ${amountIn} ${symbolSell}` : 'SDK · Newton solve'}
      </Text>
      <Text
        position={[0, 3.5, 0]}
        fontSize={0.24}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor={outline}
      >
        {hasQuote ? `Δprice  ${(priceImpact * 100).toFixed(3)}%` : 'Contract · verify torus'}
      </Text>
      <Text
        position={[3.4, 2.8, 0]}
        fontSize={0.22}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor={outline}
      >
        {hasQuote ? `OUT ${amountOut} ${symbolBuy}` : 'AVM · inner txn out'}
      </Text>
      {hasQuote && ticks > 0 && (
        <Text
          position={[0, -3.2, 0]}
          fontSize={0.2}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor={outline}
        >
          {`ticks crossed · ${ticks}`}
        </Text>
      )}
    </>
  );
}

function clampVis(x: number, min: number, max: number) {
  return Math.min(max, Math.max(min, x));
}

function formatUnits(raw: bigint, maxDecimals = 3) {
  const n = Number(raw) / 1_000_000;
  if (!isFinite(n)) return '0';
  if (n === 0) return '0';
  if (n < 0.001) return n.toExponential(2);
  return n.toLocaleString('en-US', { maximumFractionDigits: maxDecimals });
}

export default function TradeExecution({ metrics }: Props) {
  const hasQuote = metrics.ready && metrics.post !== null;

  const sVis = metrics.ready
    ? clampVis(metrics.sBound * metrics.visScale, MIN_S_BOUND_VIS, MAX_S_BOUND_VIS)
    : 2.6;
  const rVis = metrics.ready
    ? clampVis(metrics.rInt * metrics.visScale, MIN_R_INT_VIS, MAX_R_INT_VIS)
    : 1.2;

  const u = metrics.ready ? metrics.majorAngle : 0;
  const v = metrics.ready ? metrics.minorAngle : 0;
  const postU = metrics.post?.majorAngle ?? null;
  const postV = metrics.post?.minorAngle ?? null;

  const amountIn = formatUnits(metrics.amountInRawMicro);
  const amountOut = formatUnits(metrics.amountOutRawMicro);

  const symbols = ['USDC', 'USDT', 'USDD', 'BUSD', 'TUSD'];
  const symbolSell = symbols[metrics.sellIdx] ?? '—';
  const symbolBuy = symbols[metrics.buyIdx] ?? '—';

  const caption = hasQuote
    ? `Newton solve: reserve ${symbolSell}→${symbolBuy} slides to the pink target on the torus surface.`
    : metrics.ready
      ? `Pool idle. r_int=${metrics.rInt.toExponential(2)} · s_bound=${metrics.sBound.toExponential(2)}`
      : 'Loading live pool state…';

  return (
    <AnimationCanvas
      title="05 · Trade Execution"
      caption={caption}
      cameraPosition={[6, 4.5, 7]}
    >
      <mesh>
        <torusGeometry args={[sVis, rVis, 48, 96]} />
        <meshStandardMaterial
          color={PALETTE.green}
          transparent
          opacity={0.35}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      <mesh>
        <torusGeometry args={[sVis, rVis, 24, 48]} />
        <meshBasicMaterial color={PALETTE.darkGreen} wireframe transparent opacity={0.3} />
      </mesh>

      {metrics.ready ? (
        <LiveSwapTrajectory
          sVis={sVis}
          rVis={rVis}
          u={u}
          v={v}
          postU={postU}
          postV={postV}
          hasPost={hasQuote}
        />
      ) : (
        <IdleDrift sVis={sVis} rVis={rVis} />
      )}

      <MetricLabels
        priceImpact={metrics.priceImpact}
        amountIn={amountIn}
        amountOut={amountOut}
        ticks={metrics.ticksCrossed}
        symbolSell={symbolSell}
        symbolBuy={symbolBuy}
        hasQuote={hasQuote}
      />
    </AnimationCanvas>
  );
}
