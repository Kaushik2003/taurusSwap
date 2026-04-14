'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import AnimationCanvas, { PALETTE } from './AnimationCanvas';

const RADIUS = 2;

// The equal-price direction v = (1,1,1)/√3 in 3D
const V = new THREE.Vector3(1, 1, 1).normalize();
const V_AXIS_LEN = RADIUS * 1.9;

function ReservePolarSplit() {
  const reservePoint = useRef<THREE.Mesh>(null);
  const alphaPoint = useRef<THREE.Mesh>(null);
  const alphaLine = useRef<THREE.Line>(null);
  const wLine = useRef<THREE.Line>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Animate between equal-price and depegged states
    const theta = Math.PI / 4 + Math.sin(t * 0.6) * 0.9;
    const phi = Math.PI / 3 + Math.cos(t * 0.5) * 0.4;

    const x = new THREE.Vector3(
      RADIUS * Math.sin(phi) * Math.cos(theta),
      RADIUS * Math.cos(phi),
      RADIUS * Math.sin(phi) * Math.sin(theta),
    );

    // Project x onto v: α = x · v
    const alpha = x.dot(V);
    const alphaVec = V.clone().multiplyScalar(alpha);

    if (reservePoint.current) reservePoint.current.position.copy(x);
    if (alphaPoint.current) alphaPoint.current.position.copy(alphaVec);

    if (alphaLine.current) {
      (alphaLine.current.geometry as THREE.BufferGeometry).setFromPoints([
        new THREE.Vector3(0, 0, 0),
        alphaVec,
      ]);
    }
    if (wLine.current) {
      (wLine.current.geometry as THREE.BufferGeometry).setFromPoints([alphaVec, x]);
    }
  });

  return (
    <>
      {/* The reserve point x */}
      <mesh ref={reservePoint}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial color={PALETTE.yellow} emissive={PALETTE.yellow} emissiveIntensity={0.5} />
      </mesh>
      {/* The alpha point along v */}
      <mesh ref={alphaPoint}>
        <sphereGeometry args={[0.08, 20, 20]} />
        <meshStandardMaterial color={PALETTE.cyan} emissive={PALETTE.cyan} emissiveIntensity={0.6} />
      </mesh>
      {/* α·v (parallel to v) */}
      {/* @ts-expect-error three.js line primitive */}
      <line ref={alphaLine}>
        <bufferGeometry />
        <lineBasicMaterial color={PALETTE.cyan} linewidth={3} />
      </line>
      {/* w (orthogonal) */}
      {/* @ts-expect-error three.js line primitive */}
      <line ref={wLine}>
        <bufferGeometry />
        <lineBasicMaterial color={PALETTE.pink} linewidth={3} />
      </line>
    </>
  );
}

function VAxisAndPlane() {
  const vEnd = useMemo(() => V.clone().multiplyScalar(V_AXIS_LEN), []);
  const vStart = useMemo(() => V.clone().multiplyScalar(-V_AXIS_LEN * 0.2), []);

  return (
    <>
      {/* v-direction axis */}
      <Line
        points={[vStart, vEnd]}
        color={PALETTE.darkGreen}
        lineWidth={2}
        dashed={false}
      />
      {/* Orthogonal plane disk at origin to hint at the w-subspace */}
      <mesh rotation={[Math.atan2(V.y, Math.hypot(V.x, V.z)), 0, -Math.atan2(V.z, V.x)]}>
        <circleGeometry args={[RADIUS * 1.1, 48]} />
        <meshBasicMaterial color={PALETTE.pink} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <Text
        position={vEnd.clone().multiplyScalar(1.1)}
        fontSize={0.22}
        color={PALETTE.darkGreen}
        anchorX="center"
        anchorY="middle"
      >
        v = (1,..,1)/√n
      </Text>
    </>
  );
}

export default function PolarDecomposition() {
  return (
    <AnimationCanvas
      title="02 · Polar Decomposition"
      caption="Any reserve x splits as α·v + w, where α = Σxᵢ/√n runs along v and w ⊥ v carries the trading component."
      cameraPosition={[4.5, 3, 6]}
    >
      <VAxisAndPlane />
      {/* Translucent sphere for context */}
      <mesh>
        <sphereGeometry args={[RADIUS, 40, 40]} />
        <meshBasicMaterial color={PALETTE.darkGreen} wireframe transparent opacity={0.18} />
      </mesh>
      <ReservePolarSplit />
    </AnimationCanvas>
  );
}
