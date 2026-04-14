'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import AnimationCanvas, { PALETTE } from './AnimationCanvas';

const R_INT = 1.2;
const S_BOUND = 2.6;

/** A swap slides the reserve point along the torus surface from start → end. */
function SwapTrajectory() {
  const reserve = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Line>(null);
  const trail = useRef<THREE.Vector3[]>([]);

  // Parameterise a point on the torus by (u, v)
  const toXYZ = (u: number, v: number) => {
    const cx = (S_BOUND + R_INT * Math.cos(v)) * Math.cos(u);
    const cy = R_INT * Math.sin(v);
    const cz = (S_BOUND + R_INT * Math.cos(v)) * Math.sin(u);
    return new THREE.Vector3(cx, cy, cz);
  };

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Swap segments: the trader is progressively sliding `u` while `v` drifts
    const cyclePhase = (t * 0.4) % (Math.PI * 2);
    const u = cyclePhase;
    const v = Math.sin(t * 0.9) * 0.8;
    const p = toXYZ(u, v);

    if (reserve.current) reserve.current.position.copy(p);
    trail.current.push(p.clone());
    if (trail.current.length > 120) trail.current.shift();
    if (trailRef.current) {
      (trailRef.current.geometry as THREE.BufferGeometry).setFromPoints(trail.current);
    }
  });

  return (
    <>
      <mesh ref={reserve}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial color={PALETTE.yellow} emissive={PALETTE.yellow} emissiveIntensity={0.7} />
      </mesh>
      {/* @ts-expect-error three.js line primitive */}
      <line ref={trailRef}>
        <bufferGeometry />
        <lineBasicMaterial color={PALETTE.pink} linewidth={3} />
      </line>
    </>
  );
}

/** Three floating labels hinting at the SDK → verify → transfer pipeline. */
function FlowLabels() {
  const labels = useMemo(
    () => [
      { pos: [-3.2, 2.6, 0] as [number, number, number], text: 'SDK · Newton solve' },
      { pos: [0, 3.4, 0] as [number, number, number], text: 'Contract · verify torus' },
      { pos: [3.2, 2.6, 0] as [number, number, number], text: 'AVM · inner txn out' },
    ],
    [],
  );

  return (
    <>
      {labels.map((l, i) => (
        <Text
          key={i}
          position={l.pos}
          fontSize={0.22}
          color={PALETTE.darkGreen}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor={PALETTE.green}
        >
          {l.text}
        </Text>
      ))}
    </>
  );
}

export default function TradeExecution() {
  return (
    <AnimationCanvas
      title="05 · Trade Execution"
      caption="Δ from Newton's method slides the reserve point along the torus. The contract checks the residual ≤ tolerance."
      cameraPosition={[6, 4.5, 7]}
    >
      <mesh>
        <torusGeometry args={[S_BOUND, R_INT, 48, 96]} />
        <meshStandardMaterial
          color={PALETTE.green}
          transparent
          opacity={0.35}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      <mesh>
        <torusGeometry args={[S_BOUND, R_INT, 24, 48]} />
        <meshBasicMaterial color={PALETTE.darkGreen} wireframe transparent opacity={0.3} />
      </mesh>
      <SwapTrajectory />
      <FlowLabels />
    </AnimationCanvas>
  );
}
