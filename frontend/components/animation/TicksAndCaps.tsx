'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import AnimationCanvas, { PALETTE } from './AnimationCanvas';

const RADIUS = 2;
const V = new THREE.Vector3(1, 1, 1).normalize();

/**
 * Build a spherical-cap mesh: the portion of the sphere on one side of the
 * plane x · v = k. Polar-angle sweep from 0..capAngle where
 *   capAngle = acos(k / r)  (measured from v).
 */
function SphericalCap({
  kRatio,
  color,
  opacity,
}: {
  kRatio: number;
  color: string;
  opacity: number;
}) {
  const geometry = useMemo(() => {
    const capAngle = Math.acos(Math.max(-1, Math.min(1, kRatio)));
    // Build a cap with its pole along +Y, then rotate so pole aligns with v
    const g = new THREE.SphereGeometry(RADIUS * 1.005, 48, 48, 0, Math.PI * 2, 0, capAngle);
    // Rotate so +Y aligns with V
    const from = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(from, V);
    g.applyQuaternion(quat);
    return g;
  }, [kRatio]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        roughness={0.5}
      />
    </mesh>
  );
}

function RingBoundary({ kRatio, color }: { kRatio: number; color: string }) {
  const points = useMemo(() => {
    const capAngle = Math.acos(Math.max(-1, Math.min(1, kRatio)));
    const ringRadius = RADIUS * Math.sin(capAngle);
    const heightAlongV = RADIUS * Math.cos(capAngle);
    const from = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(from, V);
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      const p = new THREE.Vector3(
        ringRadius * Math.cos(t),
        heightAlongV,
        ringRadius * Math.sin(t),
      ).applyQuaternion(quat);
      pts.push([p.x, p.y, p.z]);
    }
    return pts;
  }, [kRatio]);

  return <Line points={points} color={color} lineWidth={2} />;
}

function PulsingReserve() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    // Oscillate the reserve point along a great-circle arc near v
    const spread = 0.6 + 0.25 * Math.sin(t * 0.7);
    const p = new THREE.Vector3(
      Math.sin(spread) * Math.cos(t * 0.4),
      Math.cos(spread),
      Math.sin(spread) * Math.sin(t * 0.4),
    ).multiplyScalar(RADIUS);
    mesh.current.position.copy(p);
  });
  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.11, 24, 24]} />
      <meshStandardMaterial color={PALETTE.yellow} emissive={PALETTE.yellow} emissiveIntensity={0.6} />
    </mesh>
  );
}

export default function TicksAndCaps() {
  return (
    <AnimationCanvas
      title="03 · Ticks & Caps"
      caption="Each tick is a spherical cap x·v ≤ k. Tighter k = tighter peg range, higher capital efficiency."
      cameraPosition={[5, 3, 6]}
    >
      {/* Translucent full sphere */}
      <mesh>
        <sphereGeometry args={[RADIUS, 48, 48]} />
        <meshStandardMaterial
          color={PALETTE.green}
          transparent
          opacity={0.18}
          roughness={0.6}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[RADIUS, 24, 24]} />
        <meshBasicMaterial color={PALETTE.darkGreen} wireframe transparent opacity={0.15} />
      </mesh>

      {/* Nested ticks: tightest peg first (closest to v-pole) */}
      <SphericalCap kRatio={0.95} color={PALETTE.yellow} opacity={0.75} />
      <SphericalCap kRatio={0.8} color={PALETTE.pink} opacity={0.45} />
      <SphericalCap kRatio={0.55} color={PALETTE.cyan} opacity={0.28} />

      <RingBoundary kRatio={0.95} color={PALETTE.darkGreen} />
      <RingBoundary kRatio={0.8} color={PALETTE.darkGreen} />
      <RingBoundary kRatio={0.55} color={PALETTE.darkGreen} />

      <PulsingReserve />
    </AnimationCanvas>
  );
}
