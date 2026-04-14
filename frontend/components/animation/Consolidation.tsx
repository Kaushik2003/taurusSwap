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

const MIN_R_INT_VIS = 0.5;
const MAX_R_INT_VIS = 1.8;
const MIN_S_BOUND_VIS = 2.0;
const MAX_S_BOUND_VIS = 3.4;

function clampVis(x: number, min: number, max: number) {
  return Math.min(max, Math.max(min, x));
}

function torusPoint(u: number, v: number, sVis: number, rVis: number) {
  const cx = (sVis + rVis * Math.cos(v)) * Math.cos(u);
  const cy = rVis * Math.sin(v);
  const cz = (sVis + rVis * Math.cos(v)) * Math.sin(u);
  return new THREE.Vector3(cx, cy, cz);
}

function LiveTorus({ sVis, rVis }: { sVis: number; rVis: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.15;
  });
  return (
    <group ref={group}>
      <mesh>
        <torusGeometry args={[sVis, rVis, 48, 96]} />
        <meshStandardMaterial
          color={PALETTE.green}
          transparent
          opacity={0.42}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      <mesh>
        <torusGeometry args={[sVis, rVis, 24, 48]} />
        <meshBasicMaterial color={PALETTE.darkGreen} wireframe transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function BoundaryRing({ sVis }: { sVis: number }) {
  const line = useMemo(() => {
    const points = Array.from({ length: 129 }, (_, i) => {
      const t = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(sVis * Math.cos(t), 0, sVis * Math.sin(t));
    });
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: PALETTE.pink,
      dashSize: 0.15,
      gapSize: 0.08,
    });
    const l = new THREE.Line(geo, mat);
    l.computeLineDistances();
    return l;
  }, [sVis]);
  return <primitive object={line} />;
}

function ReserveDots({
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

  const arcPoints = useMemo(() => {
    if (!hasPost || postU === null || postV === null) return [torusPoint(u, v, sVis, rVis)];
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const uu = u + (postU - u) * t;
      const vv = v + (postV - v) * t;
      pts.push(torusPoint(uu, vv, sVis, rVis));
    }
    return pts;
  }, [u, v, postU, postV, sVis, rVis, hasPost]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (current.current) {
      current.current.position.copy(torusPoint(u, v, sVis, rVis));
      current.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    }
    if (ghost.current && hasPost && postU !== null && postV !== null) {
      ghost.current.position.copy(torusPoint(postU, postV, sVis, rVis));
      const mat = ghost.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.5 + Math.sin(t * 2.4) * 0.25;
    }
    if (arcRef.current) {
      (arcRef.current.geometry as THREE.BufferGeometry).setFromPoints(arcPoints);
    }
  });

  return (
    <>
      <mesh ref={current}>
        <sphereGeometry args={[0.14, 22, 22]} />
        <meshStandardMaterial
          color={PALETTE.yellow}
          emissive={PALETTE.yellow}
          emissiveIntensity={0.8}
        />
      </mesh>
      {hasPost && (
        <mesh ref={ghost}>
          <sphereGeometry args={[0.12, 20, 20]} />
          <meshStandardMaterial
            color={PALETTE.pink}
            emissive={PALETTE.pink}
            emissiveIntensity={0.8}
            transparent
            opacity={0.65}
          />
        </mesh>
      )}
      {/* @ts-expect-error three.js line primitive */}
      <line ref={arcRef}>
        <bufferGeometry />
        <lineBasicMaterial color={PALETTE.pink} linewidth={3} transparent opacity={0.85} />
      </line>
    </>
  );
}

function IdleSweep({ sVis, rVis }: { sVis: number; rVis: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime() * 0.6;
    group.current.position.set(sVis * Math.cos(t), 0, sVis * Math.sin(t));
    group.current.rotation.y = -t;
  });
  return (
    <group ref={group}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[rVis, 0.03, 12, 64]} />
        <meshBasicMaterial color={PALETTE.yellow} />
      </mesh>
      <mesh position={[0, rVis, 0]}>
        <sphereGeometry args={[0.12, 20, 20]} />
        <meshStandardMaterial
          color={PALETTE.yellow}
          emissive={PALETTE.yellow}
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}

function fmtSI(n: number, digits = 3) {
  if (!isFinite(n) || n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(digits) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(digits) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(digits) + 'K';
  return n.toFixed(digits);
}

function LiveLabels({ metrics }: { metrics: LivePoolMetrics }) {
  const color = PALETTE.darkGreen;
  const outline = PALETTE.green;
  return (
    <>
      <Text
        position={[-3.6, 2.9, 0]}
        fontSize={0.22}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor={outline}
      >
        {`r_int  ${fmtSI(metrics.rInt)}`}
      </Text>
      <Text
        position={[0, 3.6, 0]}
        fontSize={0.22}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor={outline}
      >
        {`α  ${fmtSI(metrics.alpha)}`}
      </Text>
      <Text
        position={[3.6, 2.9, 0]}
        fontSize={0.22}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor={outline}
      >
        {`s_bound  ${fmtSI(metrics.sBound)}`}
      </Text>
      <Text
        position={[0, -3.3, 0]}
        fontSize={0.2}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor={outline}
      >
        {`‖w‖  ${fmtSI(metrics.wMagnitude)}   ·   residual  ${(metrics.minorRadius - metrics.rInt).toExponential(2)}`}
      </Text>
    </>
  );
}

export default function Consolidation({ metrics }: Props) {
  const sVis = metrics.ready
    ? clampVis(metrics.sBound * metrics.visScale, MIN_S_BOUND_VIS, MAX_S_BOUND_VIS)
    : 3.0;
  const rVis = metrics.ready
    ? clampVis(metrics.rInt * metrics.visScale, MIN_R_INT_VIS, MAX_R_INT_VIS)
    : 1.5;

  const hasPost = metrics.ready && metrics.post !== null;
  const u = metrics.ready ? metrics.majorAngle : 0;
  const v = metrics.ready ? metrics.minorAngle : 0;
  const postU = metrics.post?.majorAngle ?? null;
  const postV = metrics.post?.minorAngle ?? null;

  const caption = hasPost
    ? `Polar decomposition: (α, ‖w‖) tracks the current reserve, pink shows post-swap target.`
    : metrics.ready
      ? `Live consolidated torus: interior r_int × boundary s_bound. Enter an amount to see the post-swap point.`
      : 'Consolidating ticks…';

  return (
    <AnimationCanvas
      title="04 · Consolidation → Torus"
      caption={caption}
      cameraPosition={[6, 5, 8]}
    >
      <LiveTorus sVis={sVis} rVis={rVis} />
      <BoundaryRing sVis={sVis} />
      {metrics.ready ? (
        <ReserveDots
          sVis={sVis}
          rVis={rVis}
          u={u}
          v={v}
          postU={postU}
          postV={postV}
          hasPost={hasPost}
        />
      ) : (
        <IdleSweep sVis={sVis} rVis={rVis} />
      )}
      {metrics.ready && <LiveLabels metrics={metrics} />}
    </AnimationCanvas>
  );
}
