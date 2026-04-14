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
    { id: 1, size: 400, x: 15, y: 20, color: 'rgba(8,71,52,0.08)', delay: 0, duration: 12 },
    { id: 2, size: 300, x: 75, y: 30, color: 'rgba(8,71,52,0.06)', delay: 2, duration: 15 },
    { id: 3, size: 250, x: 50, y: 60, color: 'rgba(8,71,52,0.05)', delay: 4, duration: 18 },
    { id: 4, size: 200, x: 25, y: 70, color: 'rgba(206,241,123,0.3)', delay: 1, duration: 14 },
    { id: 5, size: 350, x: 85, y: 55, color: 'rgba(8,71,52,0.07)', delay: 3, duration: 16 },
    { id: 6, size: 150, x: 60, y: 15, color: 'rgba(206,241,123,0.2)', delay: 5, duration: 11 },
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
