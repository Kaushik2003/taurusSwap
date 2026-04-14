'use client';

import { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export const PALETTE = {
  green: '#9FE870',
  darkGreen: '#163300',
  cream: '#FFFBEA',
  yellow: '#FFE169',
  cyan: '#C0FCFD',
  pink: '#FCA5F1',
  coral: '#FFC1D9',
  white: '#ffffff',
} as const;

interface AnimationCanvasProps {
  children: ReactNode;
  cameraPosition?: [number, number, number];
  title?: string;
  caption?: string;
  height?: string;
  enableControls?: boolean;
}

export default function AnimationCanvas({
  children,
  cameraPosition = [4, 3, 6],
  title,
  caption,
  height = '420px',
  enableControls = true,
}: AnimationCanvasProps) {
  return (
    <div
      className="relative w-full rounded-3xl border-[3px] border-dark-green overflow-hidden shadow-[-8px_8px_0_0_var(--color-dark-green)]"
      style={{ height, background: PALETTE.cream }}
    >
      {title && (
        <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-dark-green text-green text-xs font-black uppercase tracking-widest border-2 border-dark-green">
          {title}
        </div>
      )}

      <Canvas
        camera={{ position: cameraPosition, fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={[PALETTE.cream]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, -2, -5]} intensity={0.3} />
        {children}
        {enableControls && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.6}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={(3 * Math.PI) / 4}
          />
        )}
      </Canvas>

      {caption && (
        <div className="absolute bottom-3 left-3 right-3 z-10 px-4 py-2 rounded-xl bg-white/90 border-2 border-dark-green text-dark-green text-xs font-bold backdrop-blur-sm">
          {caption}
        </div>
      )}
    </div>
  );
}
