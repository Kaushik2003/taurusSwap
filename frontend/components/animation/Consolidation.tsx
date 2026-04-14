'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import AnimationCanvas, { PALETTE } from './AnimationCanvas';

const R_INT = 1.5; // interior sphere cross-section radius
const S_BOUND = 3.0; // boundary sphere radius (swept around)

/**
 * Animates the formation of the torus by sweeping the interior sphere
 * around the boundary ring. The torus equation:
 *   r_int² = (α_total − k_bound − r_int·√n)² + (‖w_total‖ − s_bound)²
 */
function FormingTorus() {
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0);

  useFrame((_, delta) => {
    progress.current = Math.min(1, progress.current + delta * 0.25);
    if (group.current) group.current.rotation.y += delta * 0.4;
  });

  return (
    <group ref={group}>
      <mesh>
        <torusGeometry args={[S_BOUND, R_INT, 48, 96]} />
        <meshStandardMaterial
          color={PALETTE.green}
          transparent
          opacity={0.45}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      <mesh>
        <torusGeometry args={[S_BOUND, R_INT, 24, 48]} />
        <meshBasicMaterial color={PALETTE.darkGreen} wireframe transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

/** The boundary "large circle" around which the interior sphere sweeps. */
function BoundaryRing() {
  const points = Array.from({ length: 129 }, (_, i) => {
    const t = (i / 128) * Math.PI * 2;
    return new THREE.Vector3(S_BOUND * Math.cos(t), 0, S_BOUND * Math.sin(t));
  });
  const geo = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <primitive object={new THREE.Line(geo, new THREE.LineDashedMaterial({
      color: PALETTE.pink,
      dashSize: 0.15,
      gapSize: 0.08,
    }))} onUpdate={(self: THREE.Line) => self.computeLineDistances()} />
  );
}

/** The interior circle that sweeps around, leaving the torus tube behind. */
function SweepingInteriorCircle() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime() * 0.6;
    group.current.position.set(S_BOUND * Math.cos(t), 0, S_BOUND * Math.sin(t));
    // Align the circle's plane to face outward (torus tube orientation)
    group.current.rotation.y = -t;
  });

  return (
    <group ref={group}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[R_INT, 0.03, 12, 64]} />
        <meshBasicMaterial color={PALETTE.yellow} />
      </mesh>
      {/* Moving reserve point on the interior cross-section */}
      <mesh position={[0, R_INT, 0]}>
        <sphereGeometry args={[0.12, 20, 20]} />
        <meshStandardMaterial color={PALETTE.yellow} emissive={PALETTE.yellow} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

export default function Consolidation() {
  return (
    <AnimationCanvas
      title="04 · Consolidation → Torus"
      caption="Interior ticks sum to one sphere (r_int); boundary ticks sum to another (s_bound). Together they sweep out the torus invariant."
      cameraPosition={[6, 5, 8]}
    >
      <FormingTorus />
      <BoundaryRing />
      <SweepingInteriorCircle />
    </AnimationCanvas>
  );
}
