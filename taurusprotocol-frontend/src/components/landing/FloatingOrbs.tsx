import { useMemo } from 'react';

interface Orb {
  id: number;
  size: number;
  x: number;
  y: number;
  color: string;
  delay: number;
  duration: number;
}

export default function FloatingOrbs() {
  const orbs = useMemo<Orb[]>(() => [
    { id: 1, size: 300, x: 15, y: 20, color: 'hsl(328 100% 54% / 0.15)', delay: 0, duration: 8 },
    { id: 2, size: 200, x: 75, y: 30, color: 'hsl(270 80% 60% / 0.12)', delay: 2, duration: 10 },
    { id: 3, size: 150, x: 50, y: 60, color: 'hsl(328 100% 54% / 0.08)', delay: 4, duration: 12 },
    { id: 4, size: 100, x: 25, y: 70, color: 'hsl(200 80% 50% / 0.1)', delay: 1, duration: 9 },
    { id: 5, size: 180, x: 85, y: 55, color: 'hsl(270 80% 60% / 0.08)', delay: 3, duration: 11 },
    { id: 6, size: 80, x: 60, y: 15, color: 'hsl(328 100% 64% / 0.12)', delay: 5, duration: 7 },
  ], []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map(orb => (
        <div
          key={orb.id}
          className="absolute rounded-full animate-float-slow"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            filter: 'blur(40px)',
            animationDelay: `${orb.delay}s`,
            animationDuration: `${orb.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
