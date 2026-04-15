'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  TorusParams,
  buildTorus,
  clamp,
  formatSci,
  lerp,
  reserveToAngle,
  shouldRebuild,
  torusPoint,
} from './torusGeometry';

// ───────────────────────── Types ─────────────────────────

export type OrbitalState =
  | 'IDLE'
  | 'QUOTING'
  | 'QUOTE_READY'
  | 'CONSOLIDATING'
  | 'EXECUTING'
  | 'CONFIRMED';

export interface PoolStateVM {
  rInt: number;
  sBound: number;
  reserveX: number;
  reserveY: number;
  symbolX: string;
  symbolY: string;
  feeBps: number;
}

export interface QuoteStateVM {
  amountIn: number;
  quoteOut: number;
  postRInt: number;
  postSBound: number;
  postReserveX: number;
  postReserveY: number;
  priceImpact: number;
  loading: boolean;
}

export interface OrbitalTorusSceneProps {
  poolState: PoolStateVM | null;
  quoteState: QuoteStateVM | null;
  state: OrbitalState;
  txHash?: string | null;
  height?: string;
}

// ───────────────────────── Visual constants ─────────────────────────

const COLORS = {
  background: '#f0f9e8',
  torusBase: '#c5e8a0',
  torusWire: '#8fcc50',
  currentDot: '#f5d742',
  targetDot: '#e05c8a',
  particle: '#ffffff',
  barBg: '#0b1f0d',
  barText: '#c5e8a0',
  labelGreen: '#2f6114',
} as const;

const PARTICLE_COUNT = 30;

const STATE_LABELS: Record<OrbitalState, string> = {
  IDLE: '01 · POOL IDLE',
  QUOTING: '02 · COMPUTING QUOTE',
  QUOTE_READY: '03 · SDK · NEWTON SOLVE',
  CONSOLIDATING: '04 · CONSOLIDATION → TORUS',
  EXECUTING: '05 · TRADE EXECUTION',
  CONFIRMED: '06 · CONFIRMED · SETTLED',
};

function bottomBarText(
  state: OrbitalState,
  pool: PoolStateVM | null,
  quote: QuoteStateVM | null,
  txHash: string | null | undefined,
): string {
  const rInt = pool ? formatSci(pool.rInt) : '0.00e+0';
  const sBound = pool ? formatSci(pool.sBound) : '0.00e+0';
  switch (state) {
    case 'IDLE':
      return `Pool idle. r_int=${rInt} · s_bound=${sBound}`;
    case 'QUOTING':
      return `Computing quote… r_int=${rInt} · s_bound=${sBound}`;
    case 'QUOTE_READY': {
      if (!quote) return `SDK · Newton solve. r_int=${rInt} · s_bound=${sBound}`;
      const impact = (quote.priceImpact * 100).toFixed(3);
      return `SDK · Newton solve. impact ${impact}% · r_int=${rInt} · s_bound=${sBound}`;
    }
    case 'CONSOLIDATING':
      return `Live consolidated torus: interior r_int × boundary s_bound. Enter an amount to see the post-swap point.`;
    case 'EXECUTING': {
      if (!pool || !quote) return 'Executing swap…';
      const impact = (quote.priceImpact * 100).toFixed(3);
      return `Executing swap: ${quote.amountIn.toFixed(4)} ${pool.symbolX} → ${quote.quoteOut.toFixed(4)} ${pool.symbolY} · impact ${impact}%`;
    }
    case 'CONFIRMED': {
      const tx = (txHash ?? '').slice(0, 8);
      return `Settled. New r_int=${rInt} · s_bound=${sBound} · tx ${tx}…`;
    }
  }
}

// ───────────────────────── Scene contents ─────────────────────────

interface SceneProps {
  poolState: PoolStateVM | null;
  quoteState: QuoteStateVM | null;
  state: OrbitalState;
}

function Scene({ poolState, quoteState, state }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const currentDotRef = useRef<THREE.Mesh>(null);
  const targetDotRef = useRef<THREE.Mesh>(null);
  const arcRef = useRef<THREE.Line>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);

  // Latest state exposed to the RAF loop via refs (avoid stale closures).
  const poolRef = useRef(poolState);
  const quoteRef = useRef(quoteState);
  const stateRef = useRef<OrbitalState>(state);
  useEffect(() => { poolRef.current = poolState; }, [poolState]);
  useEffect(() => { quoteRef.current = quoteState; }, [quoteState]);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Animated + target torus parameters. Geometry is rebuilt when the
  // animated value drifts past `shouldRebuild` epsilon.
  const animated = useRef<TorusParams>({ R: 3, r: 0.8 });
  const target = useRef<TorusParams>({ R: 3, r: 0.8 });
  const lastBuilt = useRef<TorusParams>({ R: 0, r: 0 });

  useEffect(() => {
    if (!poolState) return;
    target.current = buildTorus(poolState.sBound, poolState.rInt);
  }, [poolState]);

  useEffect(() => {
    if (!quoteState || !poolState) return;
    const useTargetGeom =
      state === 'CONSOLIDATING' || state === 'EXECUTING' || state === 'CONFIRMED';
    target.current = useTargetGeom
      ? buildTorus(quoteState.postSBound, quoteState.postRInt)
      : buildTorus(poolState.sBound, poolState.rInt);
  }, [quoteState, poolState, state]);

  // Particle burst: velocities + per-particle life (0..1).
  const velocities = useRef<THREE.Vector3[]>(
    Array.from({ length: PARTICLE_COUNT }, () => new THREE.Vector3()),
  );
  const lives = useRef<number[]>(new Array(PARTICLE_COUNT).fill(0));
  const burstOrigin = useRef<[number, number, number]>([0, 0, 0]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const prevStateRef = useRef<OrbitalState>(state);

  useEffect(() => {
    if (
      (state === 'CONSOLIDATING' || state === 'EXECUTING') &&
      prevStateRef.current !== state
    ) {
      burstOrigin.current = [
        currentDotRef.current?.position.x ?? 0,
        currentDotRef.current?.position.y ?? 0,
        currentDotRef.current?.position.z ?? 0,
      ];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const u = Math.random() * Math.PI * 2;
        const v = (Math.random() - 0.5) * Math.PI;
        const speed = 0.02 + Math.random() * 0.04;
        velocities.current[i].set(
          Math.cos(u) * Math.cos(v) * speed,
          Math.sin(v) * speed,
          Math.sin(u) * Math.cos(v) * speed,
        );
        lives.current[i] = 1.0;
      }
    }
    prevStateRef.current = state;
  }, [state]);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    const st = stateRef.current;
    const pool = poolRef.current;
    const quote = quoteRef.current;

    // 1. Lerp torus params toward target.
    animated.current.R = lerp(animated.current.R, target.current.R, 0.05);
    animated.current.r = lerp(animated.current.r, target.current.r, 0.05);
    const { R, r } = animated.current;

    // 2. Rebuild geometry on meaningful drift (not every frame).
    if (shouldRebuild(animated.current, lastBuilt.current)) {
      if (shellRef.current) {
        shellRef.current.geometry.dispose();
        shellRef.current.geometry = new THREE.TorusGeometry(R, r, 48, 96);
      }
      if (wireRef.current) {
        wireRef.current.geometry.dispose();
        wireRef.current.geometry = new THREE.TorusGeometry(R, r, 24, 48);
      }
      lastBuilt.current = { R, r };
    }

    // 3. Rotation speed + execution tilt.
    if (groupRef.current) {
      const rotSpeed =
        st === 'QUOTING' ? 0.012 :
        st === 'EXECUTING' ? 0.02 :
        st === 'CONSOLIDATING' ? 0.008 :
        0.003;
      groupRef.current.rotation.y += rotSpeed;
      const targetTilt = st === 'EXECUTING' ? 0.35 : 0;
      groupRef.current.rotation.x = lerp(groupRef.current.rotation.x, targetTilt, 0.04);
    }

    // 4. Wireframe opacity by state.
    if (wireRef.current) {
      const mat = wireRef.current.material as THREE.MeshBasicMaterial;
      const targetOpa = st === 'IDLE' ? 0.15 : 0.35;
      mat.opacity = lerp(mat.opacity, targetOpa, 0.05);
    }

    // 5. Current dot — position from reserveX/reserveY.
    const theta = pool ? reserveToAngle(pool.reserveX, pool.reserveY) : 0;
    const [cx, cy, cz] = torusPoint(theta, 0, R, r);
    if (currentDotRef.current) {
      currentDotRef.current.position.set(cx, cy, cz);
      const mat = currentDotRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.6 + Math.abs(Math.sin(t * 0.8)) * 0.4;
      const flash = st === 'EXECUTING' ? 1 + Math.abs(Math.sin(t * 6)) * 0.6 : 1;
      currentDotRef.current.scale.setScalar(flash);
    }

    // 6. Target dot + arc.
    const showTarget =
      (st === 'QUOTE_READY' || st === 'CONSOLIDATING') && !!quote && !!pool;
    if (targetDotRef.current) {
      if (showTarget && quote) {
        const thetaT = reserveToAngle(quote.postReserveX, quote.postReserveY);
        const [tx, ty, tz] = torusPoint(thetaT, 0, R, r);
        targetDotRef.current.position.set(tx, ty, tz);
        targetDotRef.current.visible = true;
        const mat = targetDotRef.current.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.5 + Math.abs(Math.sin(t * 2.2)) * 0.4;
      } else {
        targetDotRef.current.visible = false;
      }
    }

    if (arcRef.current) {
      if (showTarget && quote) {
        arcRef.current.visible = true;
        const thetaT = reserveToAngle(quote.postReserveX, quote.postReserveY);
        const segments = 48;
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= segments; i++) {
          const m = i / segments;
          const th = theta + (thetaT - theta) * m;
          const phi = 0.35 * Math.sin(m * Math.PI);
          const [ax, ay, az] = torusPoint(th, phi, R, r * 1.03);
          points.push(new THREE.Vector3(ax, ay, az));
        }
        (arcRef.current.geometry as THREE.BufferGeometry).setFromPoints(points);
      } else {
        arcRef.current.visible = false;
      }
    }

    // 7. Particle burst (instanced).
    if (particlesRef.current) {
      const [ox, oy, oz] = burstOrigin.current;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const life = lives.current[i];
        if (life > 0) {
          lives.current[i] = Math.max(0, life - 0.012);
          const age = 1 - life;
          dummy.position.set(
            ox + velocities.current[i].x * age * 40,
            oy + velocities.current[i].y * age * 40,
            oz + velocities.current[i].z * age * 40,
          );
          dummy.scale.setScalar(life * 0.11);
        } else {
          dummy.position.set(0, -1000, 0);
          dummy.scale.setScalar(0);
        }
        dummy.updateMatrix();
        particlesRef.current.setMatrixAt(i, dummy.matrix);
      }
      particlesRef.current.instanceMatrix.needsUpdate = true;
    }

    // 8. Camera FOV pulse on transition states.
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov =
        st === 'CONSOLIDATING' || st === 'EXECUTING' ? 38 : 45;
      camera.fov = lerp(camera.fov, targetFov, 0.04);
      camera.updateProjectionMatrix();
    }
  });

  // Label content for the four anchors. Drei's <Html> handles projection
  // each frame without React state churn — children re-render only when the
  // underlying pool/quote props change.
  const labelStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    textShadow: '0 1px 0 rgba(255,255,255,0.6)',
  };

  return (
    <group ref={groupRef}>
      {/* Solid shell */}
      <mesh ref={shellRef}>
        <torusGeometry args={[3, 0.8, 48, 96]} />
        <meshStandardMaterial
          color={COLORS.torusBase}
          transparent
          opacity={0.55}
          roughness={0.35}
          metalness={0.12}
        />
      </mesh>

      {/* Wireframe overlay */}
      <mesh ref={wireRef}>
        <torusGeometry args={[3, 0.8, 24, 48]} />
        <meshBasicMaterial color={COLORS.torusWire} wireframe transparent opacity={0.15} />
      </mesh>

      {/* Inner edge label (r_int) */}
      <Html position={[animated.current.R - animated.current.r, 0, 0]} center distanceFactor={8}>
        <div style={{ ...labelStyle, color: COLORS.labelGreen }}>
          r_int {poolState ? formatSci(poolState.rInt) : '—'}
        </div>
      </Html>

      {/* Outer edge label (s_bound) */}
      <Html position={[animated.current.R + animated.current.r, 0, 0]} center distanceFactor={8}>
        <div style={{ ...labelStyle, color: COLORS.labelGreen }}>
          s_bound {poolState ? formatSci(poolState.sBound) : '—'}
        </div>
      </Html>

      {/* Current reserve dot + label */}
      <mesh ref={currentDotRef}>
        <sphereGeometry args={[0.14, 22, 22]} />
        <meshStandardMaterial
          color={COLORS.currentDot}
          emissive={COLORS.currentDot}
          emissiveIntensity={0.85}
          transparent
          opacity={1}
        />
        <Html position={[0, 0.32, 0]} center distanceFactor={9}>
          <div style={{ ...labelStyle, color: COLORS.currentDot }}>
            {poolState ? `${poolState.symbolX} ${formatSci(poolState.reserveX)}` : ''}
          </div>
        </Html>
      </mesh>

      {/* Post-swap target dot + label */}
      <mesh ref={targetDotRef} visible={false}>
        <sphereGeometry args={[0.12, 20, 20]} />
        <meshStandardMaterial
          color={COLORS.targetDot}
          emissive={COLORS.targetDot}
          emissiveIntensity={0.85}
          transparent
          opacity={0.7}
        />
        <Html position={[0, 0.3, 0]} center distanceFactor={9}>
          <div style={{ ...labelStyle, color: COLORS.targetDot }}>
            {quoteState
              ? `impact ${(quoteState.priceImpact * 100).toFixed(2)}%`
              : ''}
          </div>
        </Html>
      </mesh>

      {/* Swap-path arc */}
      {/* @ts-expect-error three.js line primitive */}
      <line ref={arcRef}>
        <bufferGeometry />
        <lineBasicMaterial
          color={COLORS.targetDot}
          linewidth={3}
          transparent
          opacity={0.9}
        />
      </line>

      {/* Particle burst — one InstancedMesh, 30 particles */}
      <instancedMesh
        ref={particlesRef}
        args={[undefined, undefined, PARTICLE_COUNT]}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={COLORS.particle} transparent opacity={0.85} />
      </instancedMesh>
    </group>
  );
}

// ───────────────────────── Public component ─────────────────────────

export default function OrbitalTorusScene({
  poolState,
  quoteState,
  state,
  txHash,
  height = '540px',
}: OrbitalTorusSceneProps) {
  const feeLabel = poolState ? `fee ${poolState.feeBps} bps` : '';
  const pairLabel = poolState ? `${poolState.symbolX}/${poolState.symbolY}` : '';
  const orbitEnabled = state === 'IDLE' || state === 'CONFIRMED';

  return (
    <div
      className="relative w-full rounded-3xl border-[3px] border-dark-green overflow-hidden shadow-[-8px_8px_0_0_var(--color-dark-green)]"
      style={{ height, background: COLORS.background }}
    >
      {/* State badge */}
      <div
        className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-[#0b1f0d] text-[#c5e8a0] text-[11px] font-black uppercase tracking-[0.15em] border-2 border-[#0b1f0d]"
        style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
      >
        {STATE_LABELS[state]}
      </div>

      {/* Pair / fee chip */}
      {poolState && (
        <div
          className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full bg-white/80 border-2 border-[#0b1f0d] text-[#0b1f0d] text-[11px] font-black uppercase tracking-[0.12em] backdrop-blur-sm"
          style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
        >
          {pairLabel} · {feeLabel}
        </div>
      )}

      <Canvas
        camera={{ position: [0, 1.5, 6], fov: 45, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={[COLORS.background]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 8, 5]} intensity={1.15} />
        <directionalLight position={[-5, -2, -5]} intensity={0.3} />
        <Scene
          poolState={poolState}
          quoteState={quoteState}
          state={state}
        />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={orbitEnabled}
          autoRotate={state === 'IDLE'}
          autoRotateSpeed={0.3}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={(3 * Math.PI) / 4}
        />
      </Canvas>

      {/* Bottom readout bar */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-4 py-3 text-[12px] font-bold"
        style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          background: COLORS.barBg,
          color: COLORS.barText,
          letterSpacing: '0.02em',
        }}
      >
        {bottomBarText(state, poolState, quoteState, txHash)}
      </div>
    </div>
  );
}

// Avoid tree-shaking the clamp helper when the file is imported for types only.
export const __keepHelpers = { clamp };
