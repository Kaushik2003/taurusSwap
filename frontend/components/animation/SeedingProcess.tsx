'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import AnimationCanvas, { PALETTE } from './AnimationCanvas';

const N = 5;
const POOL_RADIUS = 1.4;

/** A ring of n token nodes (USDC/USDT/USDD/BUSD/TUSD) orbiting the pool. */
function TokenRing() {
  const tokenColors = [PALETTE.cyan, PALETTE.pink, PALETTE.yellow, PALETTE.coral, PALETTE.green];
  const labels = ['USDC', 'USDT', 'USDD', 'BUSD', 'TUSD'];
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.25;
  });

  const tokens = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => {
        const theta = (i / N) * Math.PI * 2;
        return {
          pos: new THREE.Vector3(
            Math.cos(theta) * 3.2,
            Math.sin(theta * 2) * 0.3,
            Math.sin(theta) * 3.2,
          ),
          color: tokenColors[i % tokenColors.length],
          label: labels[i],
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <group ref={group}>
      {tokens.map((t, i) => (
        <group key={i} position={t.pos}>
          <mesh>
            <sphereGeometry args={[0.28, 24, 24]} />
            <meshStandardMaterial color={t.color} roughness={0.4} metalness={0.1} />
          </mesh>
          <Text
            position={[0, 0.55, 0]}
            fontSize={0.18}
            color={PALETTE.darkGreen}
            anchorX="center"
            anchorY="middle"
          >
            {t.label}
          </Text>
        </group>
      ))}
    </group>
  );
}

/** Particles flowing from each token toward the central pool. */
function DepositStream() {
  const particles = useRef<THREE.Points>(null);
  const positions = useMemo(() => new Float32Array(N * 16 * 3), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: N * 16 }, (_, i) => ({
        idx: i % N,
        phase: (i * 0.61803398875) % 1, // golden-ratio spacing — deterministic
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (!particles.current) return;
    const t = clock.getElapsedTime();
    const geom = particles.current.geometry as THREE.BufferGeometry;
    const arr = geom.attributes.position.array as Float32Array;

    seeds.forEach((s, i) => {
      const theta = (s.idx / N) * Math.PI * 2;
      const u = (s.phase + t * 0.25) % 1;
      const start = new THREE.Vector3(Math.cos(theta) * 3.2, 0, Math.sin(theta) * 3.2);
      const end = new THREE.Vector3(0, 0, 0);
      const p = start.clone().lerp(end, u);
      // Arc upward midway
      p.y += Math.sin(u * Math.PI) * 0.7;
      arr[i * 3 + 0] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    });
    geom.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color={PALETTE.yellow} size={0.09} sizeAttenuation />
    </points>
  );
}

/** The central pool — grows to a sphere once seed completes. */
function GrowingPool() {
  const mesh = useRef<THREE.Mesh>(null);
  const wireMesh = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Pulse between 0.3 and 1 (empty → seeded)
    const cycle = (Math.sin(t * 0.4) + 1) / 2;
    const scale = 0.35 + cycle * 0.9;
    if (mesh.current) mesh.current.scale.setScalar(scale);
    if (wireMesh.current) wireMesh.current.scale.setScalar(scale * 1.02);
  });

  return (
    <>
      <mesh ref={mesh}>
        <sphereGeometry args={[POOL_RADIUS, 40, 40]} />
        <meshStandardMaterial
          color={PALETTE.green}
          transparent
          opacity={0.55}
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>
      <mesh ref={wireMesh}>
        <sphereGeometry args={[POOL_RADIUS, 20, 20]} />
        <meshBasicMaterial color={PALETTE.darkGreen} wireframe transparent opacity={0.45} />
      </mesh>
    </>
  );
}

export default function SeedingProcess() {
  return (
    <AnimationCanvas
      title="06 · Seeding"
      caption="validate → fund → distribute → add_tick(r, k). The pool fills as deposits stream in from each of the n tokens."
      cameraPosition={[6, 4, 7]}
    >
      <GrowingPool />
      <DepositStream />
      <TokenRing />
    </AnimationCanvas>
  );
}
