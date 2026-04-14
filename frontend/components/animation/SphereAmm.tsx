'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import AnimationCanvas, { PALETTE } from './AnimationCanvas';

const RADIUS = 2;
const CENTER = new THREE.Vector3(RADIUS, RADIUS, RADIUS).multiplyScalar(0.35);

function ReservePoint() {
  const mesh = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.Vector3[]>([]);
  const line = useRef<THREE.Line>(null);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime() * 0.5;
    const theta = t;
    const phi = Math.PI / 3 + Math.sin(t * 0.7) * 0.6;

    const p = new THREE.Vector3(
      CENTER.x + RADIUS * Math.sin(phi) * Math.cos(theta),
      CENTER.y + RADIUS * Math.cos(phi),
      CENTER.z + RADIUS * Math.sin(phi) * Math.sin(theta),
    );

    mesh.current.position.copy(p);
    trail.current.push(p.clone());
    if (trail.current.length > 80) trail.current.shift();

    if (line.current) {
      const geo = line.current.geometry as THREE.BufferGeometry;
      geo.setFromPoints(trail.current);
    }
  });

  return (
    <>
      <mesh ref={mesh}>
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshStandardMaterial color={PALETTE.yellow} emissive={PALETTE.yellow} emissiveIntensity={0.4} />
      </mesh>
      {/* @ts-expect-error three.js line primitive */}
      <line ref={line}>
        <bufferGeometry />
        <lineBasicMaterial color={PALETTE.pink} linewidth={2} />
      </line>
    </>
  );
}

function Axes() {
  const len = RADIUS * 1.6;
  const labels: Array<{ pos: [number, number, number]; color: string }> = [
    { pos: [len, 0, 0], color: PALETTE.darkGreen },
    { pos: [0, len, 0], color: PALETTE.darkGreen },
    { pos: [0, 0, len], color: PALETTE.darkGreen },
  ];
  return (
    <>
      {labels.map((l, i) => (
        <Line
          key={i}
          points={[[0, 0, 0], l.pos]}
          color={l.color}
          lineWidth={1.5}
          dashed={false}
          transparent
          opacity={0.35}
        />
      ))}
    </>
  );
}

function EqualPricePoint() {
  const q = useMemo(() => {
    const v = RADIUS * (1 - 1 / Math.sqrt(3));
    return new THREE.Vector3(v, v, v).add(CENTER).sub(new THREE.Vector3(RADIUS, RADIUS, RADIUS).multiplyScalar(0.35));
  }, []);
  return (
    <mesh position={q}>
      <sphereGeometry args={[0.08, 24, 24]} />
      <meshStandardMaterial color={PALETTE.cyan} emissive={PALETTE.cyan} emissiveIntensity={0.6} />
    </mesh>
  );
}

export default function SphereAmm() {
  return (
    <AnimationCanvas
      title="01 · Sphere AMM"
      caption="Reserves x ∈ ℝⁿ live on the sphere Σ(r − xᵢ)² = r². Every trade slides the point along the surface."
      cameraPosition={[5, 4, 6]}
    >
      <Axes />
      <mesh position={CENTER}>
        <sphereGeometry args={[RADIUS, 48, 48]} />
        <meshStandardMaterial
          color={PALETTE.green}
          transparent
          opacity={0.35}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      <mesh position={CENTER}>
        <sphereGeometry args={[RADIUS, 24, 24]} />
        <meshBasicMaterial color={PALETTE.darkGreen} wireframe transparent opacity={0.25} />
      </mesh>
      <EqualPricePoint />
      <ReservePoint />
    </AnimationCanvas>
  );
}
